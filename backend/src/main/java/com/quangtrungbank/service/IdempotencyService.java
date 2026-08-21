package com.quangtrungbank.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quangtrungbank.dto.ApiResponse;
import com.quangtrungbank.entity.IdempotencyRecord;
import com.quangtrungbank.repository.IdempotencyRecordRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Service quản lý vòng đời Idempotency cho các giao dịch ngân hàng.
 * Bảo vệ hệ thống khỏi Double-Click, Duplicate Request, Network Retry.
 */
@Service
public class IdempotencyService {

    private final IdempotencyRecordRepository idempotencyRecordRepository;
    private final ObjectMapper objectMapper;

    public IdempotencyService(IdempotencyRecordRepository idempotencyRecordRepository, ObjectMapper objectMapper) {
        this.idempotencyRecordRepository = idempotencyRecordRepository;
        this.objectMapper = objectMapper;
    }

    public static class IdempotencyCheckResult<T> {
        private final boolean replayed;
        private final boolean inProgress;
        private final boolean error;
        private final String errorMessage;
        private final ApiResponse<T> cachedResponse;

        private IdempotencyCheckResult(boolean replayed, boolean inProgress, boolean error, String errorMessage, ApiResponse<T> cachedResponse) {
            this.replayed = replayed;
            this.inProgress = inProgress;
            this.error = error;
            this.errorMessage = errorMessage;
            this.cachedResponse = cachedResponse;
        }

        public static <T> IdempotencyCheckResult<T> proceed() {
            return new IdempotencyCheckResult<>(false, false, false, null, null);
        }

        public static <T> IdempotencyCheckResult<T> replayed(ApiResponse<T> cachedResponse) {
            return new IdempotencyCheckResult<>(true, false, false, null, cachedResponse);
        }

        public static <T> IdempotencyCheckResult<T> inProgress() {
            return new IdempotencyCheckResult<>(false, true, false, "Giao dịch đang được hệ thống xử lý, vui lòng không gửi lại yêu cầu", null);
        }

        public static <T> IdempotencyCheckResult<T> error(String message) {
            return new IdempotencyCheckResult<>(false, false, true, message, null);
        }

        public boolean isReplayed() { return replayed; }
        public boolean isInProgress() { return inProgress; }
        public boolean isError() { return error; }
        public String getErrorMessage() { return errorMessage; }
        public ApiResponse<T> getCachedResponse() { return cachedResponse; }
    }

    /**
     * Tạo mã băm SHA-256 của yêu cầu để đảm bảo tính toàn vẹn của payload.
     */
    public String calculateRequestHash(String path, Long userId, Object payload) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String payloadJson = payload != null ? objectMapper.writeValueAsString(payload) : "";
            String raw = (path != null ? path : "") + "|" + (userId != null ? userId : "") + "|" + payloadJson;
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException | JsonProcessingException e) {
            return "HASH_ERROR_" + System.currentTimeMillis();
        }
    }

    /**
     * Kiểm tra trạng thái Idempotency Key trước khi thực hiện giao dịch.
     * Sử dụng REQUIRES_NEW để commit bản ghi PROCESSING độc lập với transaction chính.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public <T> IdempotencyCheckResult<T> validateAndLock(String idempotencyKey, Long userId, String path, Object payload, Class<T> responseDataType) {
        if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            return IdempotencyCheckResult.proceed();
        }

        String trimmedKey = idempotencyKey.trim();
        String currentHash = calculateRequestHash(path, userId, payload);

        Optional<IdempotencyRecord> existingOpt = idempotencyRecordRepository.findByIdempotencyKey(trimmedKey);
        if (existingOpt.isPresent()) {
            IdempotencyRecord record = existingOpt.get();

            // Kiểm tra quyền sở hữu key
            if (record.getUserId() != null && userId != null && !record.getUserId().equals(userId)) {
                return IdempotencyCheckResult.error("Khóa Idempotency không hợp lệ cho người dùng này");
            }

            // Kiểm tra hash payload: nếu cùng key nhưng đổi payload -> từ chối
            if (record.getRequestHash() != null && !record.getRequestHash().equals(currentHash)) {
                return IdempotencyCheckResult.error("Khóa Idempotency đã được sử dụng cho một nội dung giao dịch khác");
            }

            // Đã hoàn thành trước đó -> Replay cached response
            if ("COMPLETED".equals(record.getStatus())) {
                try {
                    if (record.getResponseBody() != null) {
                        ApiResponse<T> cached = objectMapper.readValue(
                            record.getResponseBody(),
                            objectMapper.getTypeFactory().constructParametricType(ApiResponse.class, responseDataType)
                        );
                        return IdempotencyCheckResult.replayed(cached);
                    }
                } catch (Exception e) {
                    // Fallback nếu không parse được
                    return IdempotencyCheckResult.replayed(ApiResponse.ok("Giao dịch đã được ghi nhận trước đó (Idempotent Replay)", null));
                }
            }

            // Đang xử lý
            if ("PROCESSING".equals(record.getStatus())) {
                // Nếu bản ghi processing quá 2 phút, có thể coi là timeout và cho phép retry
                if (record.getUpdatedAt() != null && record.getUpdatedAt().isBefore(LocalDateTime.now().minusMinutes(2))) {
                    record.setUpdatedAt(LocalDateTime.now());
                    idempotencyRecordRepository.save(record);
                    return IdempotencyCheckResult.proceed();
                }
                return IdempotencyCheckResult.inProgress();
            }
        }

        // Tạo bản ghi mới ở trạng thái PROCESSING
        try {
            IdempotencyRecord newRecord = new IdempotencyRecord(trimmedKey, userId, path, currentHash, "PROCESSING");
            idempotencyRecordRepository.saveAndFlush(newRecord);
            return IdempotencyCheckResult.proceed();
        } catch (DataIntegrityViolationException dive) {
            // Race condition: một luồng khác vừa tạo đúng key này
            return IdempotencyCheckResult.inProgress();
        }
    }

    /**
     * Hoàn thành giao dịch và lưu cache phản hồi.
     * Sử dụng REQUIRES_NEW để đảm bảo trạng thái COMPLETED được ghi nhận.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markCompleted(String idempotencyKey, ApiResponse<?> response) {
        if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) return;

        String trimmedKey = idempotencyKey.trim();
        Optional<IdempotencyRecord> opt = idempotencyRecordRepository.findByIdempotencyKey(trimmedKey);
        if (opt.isPresent()) {
            IdempotencyRecord record = opt.get();
            record.setStatus("COMPLETED");
            record.setResponseCode(response.isSuccess() ? 200 : 400);
            record.setUpdatedAt(LocalDateTime.now());
            try {
                record.setResponseBody(objectMapper.writeValueAsString(response));
            } catch (JsonProcessingException e) {
                record.setResponseBody("{\"success\":" + response.isSuccess() + ",\"message\":\"" + response.getMessage() + "\"}");
            }
            idempotencyRecordRepository.save(record);
        }
    }

    /**
     * Đánh dấu giao dịch thất bại (lỗi hệ thống) để cho phép thử lại.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailedOrRelease(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) return;

        String trimmedKey = idempotencyKey.trim();
        Optional<IdempotencyRecord> opt = idempotencyRecordRepository.findByIdempotencyKey(trimmedKey);
        if (opt.isPresent()) {
            IdempotencyRecord record = opt.get();
            record.setStatus("FAILED");
            record.setUpdatedAt(LocalDateTime.now());
            idempotencyRecordRepository.save(record);
        }
    }
}
