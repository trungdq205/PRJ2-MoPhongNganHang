package com.quangtrungbank.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * DTO yêu cầu chuyển khoản — Có validation đầu vào.
 */
public class TransferRequest {

    @NotBlank(message = "Số tài khoản nguồn không được để trống")
    @Size(max = 20, message = "Số tài khoản tối đa 20 ký tự")
    private String fromAccNo;

    @NotBlank(message = "Số tài khoản đích không được để trống")
    @Size(max = 20, message = "Số tài khoản tối đa 20 ký tự")
    private String toAccNo;

    @NotNull(message = "Số tiền chuyển không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền chuyển tối thiểu 1,000 VND")
    private BigDecimal amount;

    @Size(max = 200, message = "Nội dung chuyển khoản tối đa 200 ký tự")
    private String content;

    @Size(max = 100, message = "Idempotency key tối đa 100 ký tự")
    private String idempotencyKey;

    public TransferRequest() {
    }

    public TransferRequest(String fromAccNo, String toAccNo, BigDecimal amount, String content) {
        this.fromAccNo = fromAccNo;
        this.toAccNo = toAccNo;
        this.amount = amount;
        this.content = content;
    }

    public TransferRequest(String fromAccNo, String toAccNo, BigDecimal amount, String content, String idempotencyKey) {
        this.fromAccNo = fromAccNo;
        this.toAccNo = toAccNo;
        this.amount = amount;
        this.content = content;
        this.idempotencyKey = idempotencyKey;
    }

    public String getFromAccNo() {
        return fromAccNo;
    }

    public void setFromAccNo(String fromAccNo) {
        this.fromAccNo = fromAccNo;
    }

    public String getToAccNo() {
        return toAccNo;
    }

    public void setToAccNo(String toAccNo) {
        this.toAccNo = toAccNo;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }
}
