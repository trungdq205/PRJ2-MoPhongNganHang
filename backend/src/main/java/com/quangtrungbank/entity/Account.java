package com.quangtrungbank.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "accounts", indexes = {
    @Index(name = "idx_acc_customer", columnList = "customer_id"),
    @Index(name = "idx_acc_no", columnList = "account_no")
})
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_no", nullable = false, unique = true, length = 20)
    private String accountNo;

    @Column(name = "customer_id", nullable = false, length = 50)
    private String customerId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", referencedColumnName = "id", insertable = false, updatable = false, foreignKey = @ForeignKey(name = "fk_accounts_customers"))
    private Customer customer;


    @Column(nullable = false, length = 20)
    private String type; // PAYMENT: Thanh toán, SAVINGS: Tiết kiệm

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal balance;

    @Column(length = 10)
    private String currency = "VND";

    @Column(length = 20)
    private String status = "ACTIVE"; // ACTIVE: Hoạt động, LOCKED: Khóa, CLOSED: Đóng

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public Account() {
    }

    public Account(Long id, String accountNo, String customerId, String type, BigDecimal balance, String currency, String status, LocalDateTime createdAt) {
        this.id = id;
        this.accountNo = accountNo;
        this.customerId = customerId;
        this.type = type;
        this.balance = balance;
        this.currency = currency;
        this.status = status;
        this.createdAt = createdAt;
    }


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAccountNo() {
        return accountNo;
    }

    public void setAccountNo(String accountNo) {
        this.accountNo = accountNo;
    }

    public String getCustomerId() {
        return customerId;
    }

    public void setCustomerId(String customerId) {
        this.customerId = customerId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
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

}
