package com.quangtrungbank.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * DTO yêu cầu giao dịch ATM — Có validation đầu vào.
 */
public class AtmTransactionRequest {

    @NotBlank(message = "Số tài khoản không được để trống")
    @Size(max = 20, message = "Số tài khoản tối đa 20 ký tự")
    private String accountNo;

    @NotNull(message = "Số tiền giao dịch không được để trống")
    @DecimalMin(value = "10000", message = "Số tiền giao dịch ATM tối thiểu 10,000 VND")
    private BigDecimal amount;

    @Size(max = 10, message = "Mã PIN tối đa 10 ký tự")
    private String pin;

    @Size(max = 100, message = "Vị trí ATM tối đa 100 ký tự")
    private String location;

    @Size(max = 100, message = "Idempotency key tối đa 100 ký tự")
    private String idempotencyKey;

    public AtmTransactionRequest() {
    }

    public AtmTransactionRequest(String accountNo, BigDecimal amount, String pin, String location) {
        this.accountNo = accountNo;
        this.amount = amount;
        this.pin = pin;
        this.location = location;
    }

    public AtmTransactionRequest(String accountNo, BigDecimal amount, String pin, String location, String idempotencyKey) {
        this.accountNo = accountNo;
        this.amount = amount;
        this.pin = pin;
        this.location = location;
        this.idempotencyKey = idempotencyKey;
    }

    public String getAccountNo() {
        return accountNo;
    }

    public void setAccountNo(String accountNo) {
        this.accountNo = accountNo;
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

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }
}
