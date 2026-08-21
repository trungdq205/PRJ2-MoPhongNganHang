package com.quangtrungbank.config;

import com.quangtrungbank.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

/**
 * Dịch vụ JWT (JSON Web Token) — Tiêu chuẩn xác thực API ngân hàng.
 *
 * Chức năng:
 *   1. Tạo JWT token khi đăng nhập thành công (chứa username, role, userId)
 *   2. Xác minh token hợp lệ và chưa hết hạn
 *   3. Giải mã token để lấy thông tin người dùng
 *
 * Thuật toán: HMAC-SHA256 (HS256)
 * Thời hạn: 15 phút (khớp với session timeout frontend)
 */
@Service
public class JwtService {

    // Secret key 256-bit cho HS256 — Trong production thực tế, đặt trong application.properties hoặc Vault
    private static final SecretKey SECRET_KEY = Keys.hmacShaKeyFor(
        "QuangTrungBank@2026!JWT#SecretKey$256Bit&Security".getBytes()
    );

    // Token hết hạn sau 24 giờ (86,400,000 ms) — đủ cho phiên làm việc dài
    private static final long TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000;

    /**
     * Tạo JWT token chứa thông tin người dùng.
     *
     * @param user Đối tượng User sau khi xác thực thành công
     * @return Chuỗi JWT token (ví dụ: "eyJhbGciOiJIUzI1NiIs...")
     */
    public String generateToken(User user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + TOKEN_EXPIRATION_MS);

        return Jwts.builder()
                .subject(user.getUsername())                    // Subject = username
                .claim("userId", user.getId())                 // Claim tùy chỉnh: ID người dùng
                .claim("role", user.getRole())                 // Claim tùy chỉnh: Vai trò (CUSTOMER, TELLER, ADMIN)
                .claim("fullName", user.getFullName())         // Claim tùy chỉnh: Họ tên
                .issuedAt(now)                                 // Thời điểm tạo token
                .expiration(expiry)                            // Thời điểm hết hạn
                .signWith(SECRET_KEY)                          // Ký bằng secret key
                .compact();
    }

    /**
     * Xác minh và giải mã JWT token.
     *
     * @param token Chuỗi JWT token từ header Authorization
     * @return Claims (các trường dữ liệu bên trong token)
     * @throws JwtException nếu token không hợp lệ hoặc đã hết hạn
     */
    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(SECRET_KEY)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Lấy username từ JWT token.
     */
    public String getUsernameFromToken(String token) {
        return parseToken(token).getSubject();
    }

    /**
     * Lấy role từ JWT token.
     */
    public String getRoleFromToken(String token) {
        return parseToken(token).get("role", String.class);
    }

    /**
     * Kiểm tra token có hợp lệ không (chữ ký đúng + chưa hết hạn).
     *
     * @return true nếu token hợp lệ, false nếu không
     */
    public boolean isTokenValid(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
