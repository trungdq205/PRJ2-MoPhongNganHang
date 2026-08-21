package com.quangtrungbank.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions", indexes = {
    @Index(name = "idx_from_acc_time", columnList = "from_account, timestamp DESC"),
    @Index(name = "idx_to_acc_time", columnList = "to_account, timestamp DESC"),
    @Index(name = "idx_txn_idem_key", columnList = "idempotency_key")
})
public class Transaction {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    @Column(name = "from_account", nullable = false, length = 50)
    private String fromAccount;

    @Column(name = "from_name", nullable = false, length = 100)
    private String fromName;

    @Column(name = "to_account", nullable = false, length = 50)
    private String toAccount;

    @Column(name = "to_name", nullable = false, length = 100)
    private String toName;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(precision = 15, scale = 2)
    private BigDecimal fee = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    private String type; // TRANSFER: Chuyển tiền, DEPOSIT: Nạp tiền, WITHDRAW: Rút tiền

    private String content;

    @Column(name = "timestamp")
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(length = 20)
    private String status = "SUCCESS";

    public Transaction() {
    }

    public Transaction(String id, String fromAccount, String fromName, String toAccount, String toName, BigDecimal amount, BigDecimal fee, String type, String content, LocalDateTime timestamp, String status) {
        this.id = id;
        this.fromAccount = fromAccount;
        this.fromName = fromName;
        this.toAccount = toAccount;
        this.toName = toName;
        this.amount = amount;
        this.fee = fee;
        this.type = type;
        this.content = content;
        this.timestamp = timestamp;
        this.status = status;
    }

    public Transaction(String id, String idempotencyKey, String fromAccount, String fromName, String toAccount, String toName, BigDecimal amount, BigDecimal fee, String type, String content, LocalDateTime timestamp, String status) {
        this.id = id;
        this.idempotencyKey = idempotencyKey;
        this.fromAccount = fromAccount;
        this.fromName = fromName;
        this.toAccount = toAccount;
        this.toName = toName;
        this.amount = amount;
        this.fee = fee;
        this.type = type;
        this.content = content;
        this.timestamp = timestamp;
        this.status = status;
    }


    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public String getFromAccount() {
        return fromAccount;
    }

    public void setFromAccount(String fromAccount) {
        this.fromAccount = fromAccount;
    }

    public String getFromName() {
        return fromName;
    }

    public void setFromName(String fromName) {
        this.fromName = fromName;
    }

    public String getToAccount() {
        return toAccount;
    }

    public void setToAccount(String toAccount) {
        this.toAccount = toAccount;
    }

    public String getToName() {
        return toName;
    }

    public void setToName(String toName) {
        this.toName = toName;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public BigDecimal getFee() {
        return fee;
    }

    public void setFee(BigDecimal fee) {
        this.fee = fee;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }


    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
