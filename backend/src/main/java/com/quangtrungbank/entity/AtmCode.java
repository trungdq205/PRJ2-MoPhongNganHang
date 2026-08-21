package com.quangtrungbank.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "atm_codes", indexes = {
    @Index(name = "idx_atm_code_lookup", columnList = "code, status")
})
public class AtmCode {
    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, unique = true, length = 10)
    private String code;

    @Column(name = "customer_id", nullable = false, length = 50)
    private String customerId;

    @Column(name = "account_no", nullable = false, length = 20)
    private String accountNo;

    @Column(nullable = false, length = 20)
    private String type; // WITHDRAW: Rút tiền, DEPOSIT: Nạp tiền

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(length = 20)
    private String pin = "1234";

    @Column(length = 20)
    private String status = "PENDING"; // PENDING: Chờ sử dụng, COMPLETED: Đã hoàn tất, CANCELLED: Đã hủy, EXPIRED: Đã hết hạn

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public AtmCode() {
    }

    public AtmCode(String id, String code, String customerId, String accountNo, String type, BigDecimal amount, String pin, String status, LocalDateTime createdAt, LocalDateTime completedAt) {
        this.id = id;
        this.code = code;
        this.customerId = customerId;
        this.accountNo = accountNo;
        this.type = type;
        this.amount = amount;
        this.pin = pin;
        this.status = status;
        this.createdAt = createdAt;
        this.completedAt = completedAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getCustomerId() {
        return customerId;
    }

    public void setCustomerId(String customerId) {
        this.customerId = customerId;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
}
