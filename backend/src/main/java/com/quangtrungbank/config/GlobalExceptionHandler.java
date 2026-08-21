package com.quangtrungbank.config;

import com.quangtrungbank.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * Xử lý ngoại lệ toàn cục — Trả về lỗi validation dạng JSON thống nhất.
 *
 * Khi @Valid annotation phát hiện lỗi, Spring ném MethodArgumentNotValidException.
 * Handler này bắt ngoại lệ đó và trả về ApiResponse.error() thay vì lỗi 400 mặc định.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<?> handleValidationErrors(MethodArgumentNotValidException ex) {
        String errors = ex.getBindingResult().getFieldErrors().stream()
            .map(error -> error.getDefaultMessage())
            .collect(Collectors.joining("; "));

        return ApiResponse.error(errors);
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<?> handleDataIntegrityViolation(org.springframework.dao.DataIntegrityViolationException ex) {
        return ApiResponse.error("Thông tin cập nhật bị trùng lặp (Email, SĐT hoặc CCCD đã được sử dụng trên hệ thống)");
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<?> handleHttpMessageNotReadable(org.springframework.http.converter.HttpMessageNotReadableException ex) {
        return ApiResponse.error("Dữ liệu gửi lên không đúng định dạng JSON");
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<?> handleGenericException(Exception ex) {
        System.err.println("[GlobalExceptionHandler] Exception caught:");
        ex.printStackTrace();
        return ApiResponse.error("Xảy ra lỗi hệ thống: " + ex.getMessage());
    }
}
