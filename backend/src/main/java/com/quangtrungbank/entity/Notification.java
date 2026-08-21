package com.quangtrungbank.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notif_cust_time", columnList = "customer_id, created_at DESC")
})
public class Notification {

    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "customer_id", nullable = false, length = 50)
    private String customerId;

    @Column(name = "account_no", length = 50)
    private String accountNo;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(length = 500)
    private String message;

    @Column(precision = 15, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(name = "balance_after", precision = 15, scale = 2)
    private BigDecimal balanceAfter = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    private String type = "MONEY_IN"; // MONEY_IN, MONEY_OUT, SYSTEM

    @Column(name = "is_read")
    private boolean read = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public Notification() {
    }

    public Notification(String id, String customerId, String accountNo, String title, String message, BigDecimal amount, BigDecimal balanceAfter, String type, boolean read, LocalDateTime createdAt) {
        this.id = id;
        this.customerId = customerId;
        this.accountNo = accountNo;
        this.title = title;
        this.message = message;
        this.amount = amount;
        this.balanceAfter = balanceAfter;
        this.type = type;
        this.read = read;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public BigDecimal getBalanceAfter() {
        return balanceAfter;
    }

    public void setBalanceAfter(BigDecimal balanceAfter) {
        this.balanceAfter = balanceAfter;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
