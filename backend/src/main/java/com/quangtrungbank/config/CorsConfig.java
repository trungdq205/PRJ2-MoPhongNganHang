package com.quangtrungbank.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 * Cấu hình CORS — Kiểm soát nguồn truy cập API.
 *
 * Bảo mật:
 *   - Chỉ cho phép origin từ localhost (môi trường phát triển)
 *   - Expose header "Authorization" để frontend đọc được
 *   - Cấu hình cho cả Spring Security FilterChain và Spring MVC
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Môi trường development: Cho phép mọi origin (bao gồm file://, localhost, null)
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization", "Idempotency-Key", "X-Idempotency-Replayed"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        // Thu hẹp CORS: Chỉ cho phép localhost (dev) thay vì mở toàn bộ "*"
                        .allowedOriginPatterns("*")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        // Expose header Authorization và Idempotency headers để frontend đọc được
                        .exposedHeaders("Authorization", "Idempotency-Key", "X-Idempotency-Replayed")
                        .allowCredentials(true);
            }
        };
    }
}
