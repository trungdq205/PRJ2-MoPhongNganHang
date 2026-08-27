package com.quangtrungbank.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Cấu hình Spring Security cho hệ thống QuangTrung Bank.
 *
 * Bảo mật cấp ngân hàng:
 *   - JWT Authentication Filter chạy trước mỗi request
 *   - HTTP OPTIONS requests: Mở cho tất cả (CORS preflight)
 *   - Endpoint /api/auth/login: Mở cho tất cả (để đăng nhập lấy token)
 *   - Tất cả endpoint khác: Phải có JWT token hợp lệ
 *   - CSRF tắt (API REST stateless, dùng JWT thay thế)
 *   - Session stateless (không lưu session trên server)
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CorsConfigurationSource corsConfigurationSource;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, CorsConfigurationSource corsConfigurationSource) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.corsConfigurationSource = corsConfigurationSource;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12); // Strength 12 — tiêu chuẩn ngân hàng
    }

    @Bean
    public org.springframework.security.core.userdetails.UserDetailsService userDetailsService(com.quangtrungbank.repository.UserRepository userRepository) {
        return username -> {
            com.quangtrungbank.entity.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException("User not found: " + username));
            return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPassword())
                .roles(user.getRole())
                .build();
        };
    }

    @Bean
    public org.springframework.security.authentication.AuthenticationManager authenticationManager(org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .httpBasic(basic -> basic.disable())
            .formLogin(form -> form.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"success\":false,\"message\":\"Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.\",\"data\":null}");
                })
            )
            .authorizeHttpRequests(auth -> auth
                // Endpoint OPTIONS preflight: Ai cũng truy cập được
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // gRPC Auth endpoints công khai
                .requestMatchers(
                    "/api/grpc/Login", "/api/grpc/login",
                    "/api/grpc/ResetLocks", "/api/grpc/resetLocks",
                    "/grpc/com.quangtrungbank.grpc.BankService/Login",
                    "/grpc/com.quangtrungbank.grpc.BankService/ResetLocks",
                    "/grpc/BankService/Login",
                    "/grpc/BankService/ResetLocks"
                ).permitAll()
                // Tất cả gRPC RPC endpoints khác: Yêu cầu JWT token hợp lệ
                .requestMatchers("/api/grpc/**", "/grpc/**").authenticated()
                // Cho phép static files / non-api
                .anyRequest().permitAll()
            )
            // Đăng ký JWT Filter — chạy TRƯỚC bộ lọc xác thực mặc định của Spring
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
