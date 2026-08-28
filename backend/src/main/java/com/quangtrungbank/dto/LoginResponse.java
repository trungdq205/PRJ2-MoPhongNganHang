package com.quangtrungbank.dto;

import com.quangtrungbank.entity.User;

/**
 * DTO phản hồi đăng nhập — Chứa JWT token và thông tin người dùng.
 *
 * Frontend sẽ:
 *   1. Lưu token vào sessionStorage để gửi kèm mỗi request
 *   2. Sử dụng user info để hiển thị giao diện
 */
public class LoginResponse {
    private String token;
    private Long userId;
    private String username;
    private String role;
    private String fullName;
    private String email;
    private String phone;
    private String customerId;
    private String idCard;
    private String address;
    private String contactAddress;

    public LoginResponse() {
    }

    public LoginResponse(String token, User user) {
        this.token = token;
        this.userId = user.getId();
        this.username = user.getUsername();
        this.role = user.getRole();
        this.fullName = user.getFullName();
        this.email = user.getEmail();
        this.phone = user.getPhone();
    }

    public LoginResponse(String token, User user, String customerId, String idCard, String address, String contactAddress) {
        this(token, user);
        this.customerId = customerId;
        this.idCard = idCard;
        this.address = address;
        this.contactAddress = contactAddress;
    }

    // ─── Getters & Setters ───

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getCustomerId() {
        return customerId;
    }

    public void setCustomerId(String customerId) {
        this.customerId = customerId;
    }

    public String getIdCard() {
        return idCard;
    }

    public void setIdCard(String idCard) {
        this.idCard = idCard;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getContactAddress() {
        return contactAddress;
    }

    public void setContactAddress(String contactAddress) {
        this.contactAddress = contactAddress;
    }
}
