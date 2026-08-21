package com.quangtrungbank.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class TopUpSavingsRequest {
    @NotBlank(message = "Mã tài khoản tiết kiệm không được để trống")
    private String savingsId;

    @NotBlank(message = "Số tài khoản nguồn không được để trống")
    private String sourceAccountNo;

    @NotNull(message = "Số tiền gửi thêm không được để trống")
    @Min(value = 100000, message = "Số tiền gửi thêm tối thiểu 100.000 VNĐ")
    private BigDecimal amount;

    private String idempotencyKey;

    public TopUpSavingsRequest() {}

    public TopUpSavingsRequest(String savingsId, String sourceAccountNo, BigDecimal amount) {
        this.savingsId = savingsId;
        this.sourceAccountNo = sourceAccountNo;
        this.amount = amount;
    }

    public String getSavingsId() { return savingsId; }
    public void setSavingsId(String savingsId) { this.savingsId = savingsId; }

    public String getSourceAccountNo() { return sourceAccountNo; }
    public void setSourceAccountNo(String sourceAccountNo) { this.sourceAccountNo = sourceAccountNo; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
}
