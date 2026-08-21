package com.quangtrungbank.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public class CloseSavingsRequest {
    @NotBlank(message = "Mã tài khoản tiết kiệm không được để trống")
    private String savingsId;

    private boolean isEarlyClose = false;

    /** Nếu rút một phần, truyền số tiền cần rút. Nếu rút toàn bộ / tất toán, để null hoặc 0 */
    private BigDecimal partialAmount;

    private String idempotencyKey;

    public CloseSavingsRequest() {}

    public CloseSavingsRequest(String savingsId, boolean isEarlyClose, BigDecimal partialAmount) {
        this.savingsId = savingsId;
        this.isEarlyClose = isEarlyClose;
        this.partialAmount = partialAmount;
    }

    public String getSavingsId() { return savingsId; }
    public void setSavingsId(String savingsId) { this.savingsId = savingsId; }

    public boolean isEarlyClose() { return isEarlyClose; }
    public void setEarlyClose(boolean earlyClose) { isEarlyClose = earlyClose; }

    public BigDecimal getPartialAmount() { return partialAmount; }
    public void setPartialAmount(BigDecimal partialAmount) { this.partialAmount = partialAmount; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
}
