package com.quangtrungbank.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity lưu trữ bản ghi Idempotency cho các giao dịch ngân hàng.
 * Đảm bảo các yêu cầu trùng lặp (duplicate requests / retry) được xử lý an toàn,
 * chỉ biến động số dư một lần duy nhất và trả về kết quả đã được cache.
 */
@Entity
@Table(name = "idempotency_records", indexes = {
    @Index(name = "idx_idem_key", columnList = "idempotency_key", unique = true),
    @Index(name = "idx_idem_user", columnList = "user_id"),
    @Index(name = "idx_idem_expires", columnList = "expires_at")
})
public class IdempotencyRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "idempotency_key", nullable = false, length = 100, unique = true)
    private String idempotencyKey;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "request_path", length = 255)
    private String requestPath;

    @Column(name = "request_hash", length = 128)
    private String requestHash;

    @Column(nullable = false, length = 20)
    private String status; // PROCESSING, COMPLETED, FAILED

    @Column(name = "response_code")
    private Integer responseCode;

    @Lob
    @Column(name = "response_body", columnDefinition = "TEXT")
    private String responseBody;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "expires_at")
    private LocalDateTime expiresAt = LocalDateTime.now().plusHours(24);

    public IdempotencyRecord() {
    }

    public IdempotencyRecord(String idempotencyKey, Long userId, String requestPath, String requestHash, String status) {
        this.idempotencyKey = idempotencyKey;
        this.userId = userId;
        this.requestPath = requestPath;
        this.requestHash = requestHash;
        this.status = status;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.expiresAt = LocalDateTime.now().plusHours(24);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getRequestPath() {
        return requestPath;
    }

    public void setRequestPath(String requestPath) {
        this.requestPath = requestPath;
    }

    public String getRequestHash() {
        return requestHash;
    }

    public void setRequestHash(String requestHash) {
        this.requestHash = requestHash;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getResponseCode() {
        return responseCode;
    }

    public void setResponseCode(Integer responseCode) {
        this.responseCode = responseCode;
    }

    public String getResponseBody() {
        return responseBody;
    }

    public void setResponseBody(String responseBody) {
        this.responseBody = responseBody;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }
}
