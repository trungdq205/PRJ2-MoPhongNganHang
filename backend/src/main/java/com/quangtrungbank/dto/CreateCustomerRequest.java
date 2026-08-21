package com.quangtrungbank.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public class CreateCustomerRequest {

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
    private String fullName;

    @NotBlank(message = "Số CCCD/CMND không được để trống")
    @Size(max = 20, message = "Số CCCD/CMND tối đa 20 ký tự")
    private String idCard;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
    private String phone;

    private String email;
    private String address;
    private BigDecimal initialBalance;

    public CreateCustomerRequest() {
    }

    public CreateCustomerRequest(String fullName, String idCard, String phone, String email, String address, BigDecimal initialBalance) {
        this.fullName = fullName;
        this.idCard = idCard;
        this.phone = phone;
        this.email = email;
        this.address = address;
        this.initialBalance = initialBalance;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getIdCard() {
        return idCard;
    }

    public void setIdCard(String idCard) {
        this.idCard = idCard;
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

    public BigDecimal getInitialBalance() {
        return initialBalance;
    }

    public void setInitialBalance(BigDecimal initialBalance) {
        this.initialBalance = initialBalance;
    }
}
