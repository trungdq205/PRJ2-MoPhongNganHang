package com.quangtrungbank.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public class CreateAtmCodeRequest {

    @NotBlank(message = "Số tài khoản không được để trống")
    private String accountNo;

    @NotBlank(message = "Loại mã (WITHDRAW/DEPOSIT) không được để trống")
    private String type; // WITHDRAW / DEPOSIT

    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "10000", message = "Số tiền tối thiểu là 10,000 VND")
    private BigDecimal amount;

    @Size(max = 10, message = "Mã PIN tối đa 10 ký tự")
    private String pin;

    public CreateAtmCodeRequest() {
    }

    public CreateAtmCodeRequest(String accountNo, String type, BigDecimal amount, String pin) {
        this.accountNo = accountNo;
        this.type = type;
        this.amount = amount;
        this.pin = pin;
    }

    public String getAccountNo() {
        return accountNo;
    }

    public void setAccountNo(String accountNo) {
        this.accountNo = accountNo;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getPin() {
        return pin;
    }

    public void setPin(String pin) {
        this.pin = pin;
    }
}
