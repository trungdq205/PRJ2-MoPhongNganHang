package com.quangtrungbank.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/**
 * DTO yêu cầu cập nhật thông tin liên hệ (Email).
 * Ghi chú: Thông tin nhân thân (SĐT, Địa chỉ, Họ tên, CCCD) bị khóa, không cho phép tự sửa qua Self-Service.
 */
public class UpdateProfileRequest {

    @Email(message = "Email không đúng định dạng")
    @Size(max = 100, message = "Email tối đa 100 ký tự")
    private String email;

    public UpdateProfileRequest() {
    }

    public UpdateProfileRequest(String email) {
        this.email = email;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
