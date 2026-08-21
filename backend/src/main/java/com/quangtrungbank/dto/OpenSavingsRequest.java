package com.quangtrungbank.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class OpenSavingsRequest {
    @NotBlank(message = "Số tài khoản nguồn không được để trống")
    private String sourceAccountNo;

    @NotNull(message = "Số tiền gửi không được để trống")
    @Min(value = 100000, message = "Số tiền gửi tiết kiệm tối thiểu 100.000 VNĐ")
    private BigDecimal depositAmount;

    @NotNull(message = "Kỳ hạn không được để trống")
    private Integer termMonths; // 0 = Không kỳ hạn, 1, 3, 6, 12, 24, 36...

    private String savingsType = "TERM"; // TERM, DEMAND

    private String renewType = "AUTO_ROLLOVER_ALL";

    private String idempotencyKey;

    public OpenSavingsRequest() {}

    public OpenSavingsRequest(String sourceAccountNo, BigDecimal depositAmount, Integer termMonths, String savingsType, String renewType) {
        this.sourceAccountNo = sourceAccountNo;
        this.depositAmount = depositAmount;
        this.termMonths = termMonths;
        this.savingsType = savingsType != null ? savingsType : "TERM";
        this.renewType = renewType != null ? renewType : "AUTO_ROLLOVER_ALL";
    }

    public String getSourceAccountNo() { return sourceAccountNo; }
    public void setSourceAccountNo(String sourceAccountNo) { this.sourceAccountNo = sourceAccountNo; }

    public BigDecimal getDepositAmount() { return depositAmount; }
    public void setDepositAmount(BigDecimal depositAmount) { this.depositAmount = depositAmount; }

    public Integer getTermMonths() { return termMonths; }
    public void setTermMonths(Integer termMonths) { this.termMonths = termMonths; }

    public String getSavingsType() { return savingsType; }
    public void setSavingsType(String savingsType) { this.savingsType = savingsType; }

    public String getRenewType() { return renewType; }
    public void setRenewType(String renewType) { this.renewType = renewType; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
}
