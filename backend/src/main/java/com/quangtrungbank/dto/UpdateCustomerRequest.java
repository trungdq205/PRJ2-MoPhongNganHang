package com.quangtrungbank.dto;

import jakarta.validation.constraints.Size;

public class UpdateCustomerRequest {

    @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
    private String fullName;

    @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
    private String phone;

    private String email;
    private String address;

    public UpdateCustomerRequest() {
    }

    public UpdateCustomerRequest(String fullName, String phone, String email, String address) {
        this.fullName = fullName;
        this.phone = phone;
        this.email = email;
        this.address = address;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }
}
