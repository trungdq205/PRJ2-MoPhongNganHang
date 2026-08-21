package com.quangtrungbank.config;

import com.quangtrungbank.entity.User;
import com.quangtrungbank.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Bộ lọc xác thực JWT — Chạy trước mỗi HTTP request.
 *
 * Quy trình:
 *   1. Đọc header "Authorization: Bearer <token>"
 *   2. Giải mã và xác minh JWT token
 *   3. Tìm User trong database theo username từ token
 *   4. Đặt thông tin xác thực vào SecurityContext
 *   5. Nếu token không hợp lệ → Trả về 401 Unauthorized
 *
 * Bỏ qua: Endpoint /api/auth/login (không cần token để đăng nhập)
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // Bỏ qua các endpoint xác thực công khai & tệp tĩnh frontend — không cần token
        String requestPath = request.getServletPath();
        if (requestPath.startsWith("/api/auth/") || !requestPath.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Đọc header Authorization
        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            // Không có token → Cho phép Spring Security xử lý (sẽ bị chặn nếu endpoint yêu cầu xác thực)
            filterChain.doFilter(request, response);
            return;
        }

        // Tách lấy token (bỏ prefix "Bearer ")
        String token = authHeader.substring(7);

        try {
            // Giải mã token
            Claims claims = jwtService.parseToken(token);
            String username = claims.getSubject();
            String role = claims.get("role", String.class);

            // Tìm User trong database để đảm bảo user vẫn tồn tại và chưa bị khóa
            Optional<User> userOpt = userRepository.findByUsername(username);
            if (userOpt.isEmpty()) {
                sendUnauthorized(response, "Tài khoản không tồn tại trong hệ thống");
                return;
            }

            User user = userOpt.get();

            // Kiểm tra tài khoản có đang bị khóa không
            if (user.isAccountLocked()) {
                sendUnauthorized(response, "Tài khoản đang bị tạm khóa");
                return;
            }

            // Tạo đối tượng xác thực và đặt vào SecurityContext
            List<SimpleGrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + role)
            );

            UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(user, null, authorities);

            SecurityContextHolder.getContext().setAuthentication(authToken);

        } catch (JwtException e) {
            sendUnauthorized(response, "Token không hợp lệ hoặc đã hết hạn");
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Trả về response 401 Unauthorized dạng JSON.
     */
    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
            String.format("{\"success\":false,\"message\":\"%s\",\"data\":null}", message)
        );
    }
}
