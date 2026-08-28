package com.quangtrungbank.service;

import com.quangtrungbank.config.JwtService;
import com.quangtrungbank.dto.LoginResponse;
import com.quangtrungbank.entity.AuditLog;
import com.quangtrungbank.entity.Customer;
import com.quangtrungbank.entity.User;
import com.quangtrungbank.repository.AuditLogRepository;
import com.quangtrungbank.repository.CustomerRepository;
import com.quangtrungbank.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Dịch vụ Xác thực — Tầng Nghiệp vụ (Service Layer).
 *
 * Tách toàn bộ logic xác thực ra khỏi Controller:
 *   1. Tìm User theo username
 *   2. Kiểm tra tài khoản bị khóa
 *   3. Xác minh mật khẩu BCrypt
 *   4. Tạo JWT token
 *   5. Ghi nhận đăng nhập thất bại / thành công
 */
@Service
public class AuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_DURATION_MINUTES = 15;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CustomerRepository customerRepository;
    private final AuditLogRepository auditLogRepository;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService, CustomerRepository customerRepository, AuditLogRepository auditLogRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.customerRepository = customerRepository;
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Kết quả đăng nhập — bao gồm trạng thái và dữ liệu phản hồi.
     */
    public static class LoginResult {
        private final boolean success;
        private final String message;
        private final LoginResponse data;

        private LoginResult(boolean success, String message, LoginResponse data) {
            this.success = success;
            this.message = message;
            this.data = data;
        }

        public static LoginResult success(String message, LoginResponse data) {
            return new LoginResult(true, message, data);
        }

        public static LoginResult error(String message) {
            return new LoginResult(false, message, null);
        }

        public boolean isSuccess() { return success; }
        public String getMessage() { return message; }
        public LoginResponse getData() { return data; }
    }

    /**
     * Xử lý đăng nhập hoàn chỉnh.
     *
     * @param username Tên đăng nhập
     * @param password Mật khẩu plaintext
     * @return LoginResult chứa token và user info nếu thành công
     */
    public LoginResult login(String username, String password) {
        // 1. Tìm user theo username, số điện thoại hoặc email
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByPhone(username);
        }
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmail(username);
        }
        if (userOpt.isEmpty() && ("0900000000".equals(username) || "0988888888".equals(username) || "admin".equalsIgnoreCase(username))) {
            userOpt = userRepository.findByRole("ADMIN").stream().findFirst();
        }

        if (userOpt.isEmpty()) {
            // Không tiết lộ user có tồn tại hay không (bảo mật)
            return LoginResult.error("Số điện thoại/Tên đăng nhập hoặc mật khẩu không chính xác");
        }

        User user = userOpt.get();

        // 2. Kiểm tra tài khoản có đang bị khóa không
        if (user.isAccountLocked()) {
            if (user.getAccountLockedUntil() != null && LocalDateTime.now().isAfter(user.getAccountLockedUntil())) {
                // Tự động giải phóng khóa khi hết thời gian chờ 15 phút
                user.setFailedLoginAttempts(0);
                user.setAccountLockedUntil(null);
                userRepository.save(user);
            } else {
                long minutesRemaining = Duration.between(LocalDateTime.now(), user.getAccountLockedUntil()).toMinutes() + 1;
                return LoginResult.error(
                    String.format("Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá %d lần. Vui lòng thử lại sau %d phút.",
                        MAX_FAILED_ATTEMPTS, minutesRemaining)
                );
            }
        }

        // 3. Xác minh mật khẩu bằng BCrypt
        if (!passwordEncoder.matches(password, user.getPassword())) {
            return handleFailedLogin(user);
        }

        // 4. Đăng nhập thành công — reset bộ đếm và tạo JWT token
        user.setFailedLoginAttempts(0);
        user.setAccountLockedUntil(null);
        user.setLastFailedLogin(null);
        userRepository.save(user);

        String token = jwtService.generateToken(user);
        LoginResponse loginResponse = new LoginResponse(token, user);

        if ("CUSTOMER".equals(user.getRole())) {
            customerRepository.findByUserId(user.getId()).ifPresent(c -> {
                loginResponse.setCustomerId(c.getId());
                loginResponse.setIdCard(c.getIdCard());
                loginResponse.setAddress(c.getAddress());
                loginResponse.setContactAddress(c.getContactAddress() != null && !c.getContactAddress().isBlank() ? c.getContactAddress() : c.getAddress());
            });
        }

        try {
            auditLogRepository.save(new AuditLog(user.getUsername(), String.format("Đăng nhập thành công qua Backend JWT (Vai trò: %s)", user.getRole())));
        } catch (Exception ignored) {}

        return LoginResult.success("Đăng nhập thành công!", loginResponse);
    }



    /**
     * Xử lý đăng nhập thất bại — tăng bộ đếm, khóa nếu vượt quá giới hạn.
     */
    private LoginResult handleFailedLogin(User user) {
        int newAttempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(newAttempts);
        user.setLastFailedLogin(LocalDateTime.now());

        try {
            auditLogRepository.save(new AuditLog(user.getUsername(), "Đăng nhập thất bại — Sai mật khẩu"));
        } catch (Exception ignored) {}

        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            user.setAccountLockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_DURATION_MINUTES));
            userRepository.save(user);
            return LoginResult.error(
                String.format("Tài khoản đã bị tạm khóa %d phút do nhập sai mật khẩu %d lần liên tiếp. Liên hệ ngân hàng nếu cần hỗ trợ.",
                    LOCKOUT_DURATION_MINUTES, MAX_FAILED_ATTEMPTS)
            );
        }

        userRepository.save(user);
        int remaining = MAX_FAILED_ATTEMPTS - newAttempts;
        return LoginResult.error(
            String.format("Mật khẩu không chính xác. Bạn còn %d lần thử trước khi tài khoản bị khóa.", remaining)
        );
    }

    public void resetAllLocks() {
        userRepository.findAll().forEach(u -> {
            u.setFailedLoginAttempts(0);
            u.setAccountLockedUntil(null);
            userRepository.save(u);
        });
    }
}
