package com.quangtrungbank.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

/**
 * Cấu hình Static Resource Handlers cho phép Phục vụ Frontend trực tiếp từ Spring Boot HTTP Server (port 8080).
 * Giúp tránh triệt để lỗi CORS của trình duyệt (Chrome/Edge) khi mở file:// trực tiếp.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(org.springframework.web.servlet.config.annotation.ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/index.html");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        File projectRoot = new File("../");
        String absolutePath = projectRoot.getAbsolutePath().replace("\\", "/");
        if (!absolutePath.endsWith("/")) {
            absolutePath += "/";
        }

        registry.addResourceHandler("/**")
                .addResourceLocations("file:" + absolutePath, "file:./static/", "classpath:/static/");
    }
}
