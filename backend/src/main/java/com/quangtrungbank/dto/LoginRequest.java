package com.quangtrungbank.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO yêu cầu đăng nhập — Có validation đầu vào.
 */
public class LoginRequest {

    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(max = 50, message = "Tên đăng nhập tối đa 50 ký tự")
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(max = 100, message = "Mật khẩu tối đa 100 ký tự")
    private String password;

    private String roleHint;

    public LoginRequest() {
    }

    public LoginRequest(String username, String password, String roleHint) {
        this.username = username;
        this.password = password;
        this.roleHint = roleHint;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRoleHint() {
        return roleHint;
    }

    public void setRoleHint(String roleHint) {
        this.roleHint = roleHint;
    }
}
