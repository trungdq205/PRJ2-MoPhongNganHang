package com.quangtrungbank.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "savings_accounts", indexes = {
    @Index(name = "idx_savings_cust", columnList = "customer_id"),
    @Index(name = "idx_savings_status", columnList = "status"),
    @Index(name = "idx_savings_idem", columnList = "idempotency_key")
})
public class SavingsAccount {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "savings_no", nullable = false, unique = true, length = 30)
    private String savingsNo;

    @Column(name = "customer_id", nullable = false, length = 50)
    private String customerId;

    @Column(name = "customer_name", length = 100)
    private String customerName;

    @Column(name = "source_account_no", nullable = false, length = 20)
    private String sourceAccountNo;

    /** TERM = Có kỳ hạn, DEMAND = Không kỳ hạn */
    @Column(name = "savings_type", nullable = false, length = 10)
    private String savingsType = "TERM";

    @Column(name = "deposit_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal depositAmount;

    @Column(name = "term_months", nullable = false)
    private Integer termMonths;

    /** Lãi suất đang áp dụng (%/năm) */
    @Column(name = "interest_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal interestRate;

    /** Lãi suất gốc khi mở sổ (để đối chiếu khi tất toán trước hạn) */
    @Column(name = "original_rate", precision = 5, scale = 2)
    private BigDecimal originalRate;

    /** Lãi dự kiến nếu gửi đủ kỳ hạn */
    @Column(name = "expected_interest", precision = 15, scale = 2)
    private BigDecimal expectedInterest;

    /** Lãi cộng dồn tích lũy thực tế (cập nhật khi tính lãi hoặc tất toán) */
    @Column(name = "accrued_interest", precision = 15, scale = 2)
    private BigDecimal accruedInterest = BigDecimal.ZERO;

    /** Lãi suất áp dụng khi rút trước hạn (%/năm, mặc định 0.2) */
    @Column(name = "early_withdrawal_rate", precision = 5, scale = 2)
    private BigDecimal earlyWithdrawalRate = BigDecimal.valueOf(0.2);

    @Column(name = "renew_type", length = 50)
    private String renewType = "AUTO_ROLLOVER_ALL";

    /** Số lần đã tái tục tự động */
    @Column(name = "renew_count")
    private Integer renewCount = 0;

    /** ACTIVE, MATURED, CLOSED_EARLY, CLOSED_PARTIAL */
    @Column(nullable = false, length = 30)
    private String status = "ACTIVE";

    @Column(name = "created_at")
    private LocalDate createdAt = LocalDate.now();

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    /** Ngày tính lãi gần nhất (cho sổ KKH tính lãi hàng ngày) */
    @Column(name = "last_interest_calc_date")
    private LocalDate lastInterestCalcDate;

    /** Ngày tất toán */
    @Column(name = "closed_at")
    private LocalDate closedAt;

    /** Số tiền lãi thực nhận khi tất toán */
    @Column(name = "actual_interest_paid", precision = 15, scale = 2)
    private BigDecimal actualInterestPaid;

    /** Loại tất toán: MATURED / EARLY_FULL / EARLY_PARTIAL / RENEWED */
    @Column(name = "closed_type", length = 30)
    private String closedType;

    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    public SavingsAccount() {}

    // ── Getters & Setters ──

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSavingsNo() { return savingsNo; }
    public void setSavingsNo(String savingsNo) { this.savingsNo = savingsNo; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getSourceAccountNo() { return sourceAccountNo; }
    public void setSourceAccountNo(String sourceAccountNo) { this.sourceAccountNo = sourceAccountNo; }

    public String getSavingsType() { return savingsType; }
    public void setSavingsType(String savingsType) { this.savingsType = savingsType; }

    public BigDecimal getDepositAmount() { return depositAmount; }
    public void setDepositAmount(BigDecimal depositAmount) { this.depositAmount = depositAmount; }

    public Integer getTermMonths() { return termMonths; }
    public void setTermMonths(Integer termMonths) { this.termMonths = termMonths; }

    public BigDecimal getInterestRate() { return interestRate; }
    public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }

    public BigDecimal getOriginalRate() { return originalRate; }
    public void setOriginalRate(BigDecimal originalRate) { this.originalRate = originalRate; }

    public BigDecimal getExpectedInterest() { return expectedInterest; }
    public void setExpectedInterest(BigDecimal expectedInterest) { this.expectedInterest = expectedInterest; }

    public BigDecimal getAccruedInterest() { return accruedInterest; }
    public void setAccruedInterest(BigDecimal accruedInterest) { this.accruedInterest = accruedInterest; }

    public BigDecimal getEarlyWithdrawalRate() { return earlyWithdrawalRate; }
    public void setEarlyWithdrawalRate(BigDecimal earlyWithdrawalRate) { this.earlyWithdrawalRate = earlyWithdrawalRate; }

    public String getRenewType() { return renewType; }
    public void setRenewType(String renewType) { this.renewType = renewType; }

    public Integer getRenewCount() { return renewCount; }
    public void setRenewCount(Integer renewCount) { this.renewCount = renewCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDate createdAt) { this.createdAt = createdAt; }

    public LocalDate getMaturityDate() { return maturityDate; }
    public void setMaturityDate(LocalDate maturityDate) { this.maturityDate = maturityDate; }

    public LocalDate getLastInterestCalcDate() { return lastInterestCalcDate; }
    public void setLastInterestCalcDate(LocalDate lastInterestCalcDate) { this.lastInterestCalcDate = lastInterestCalcDate; }

    public LocalDate getClosedAt() { return closedAt; }
    public void setClosedAt(LocalDate closedAt) { this.closedAt = closedAt; }

    public BigDecimal getActualInterestPaid() { return actualInterestPaid; }
    public void setActualInterestPaid(BigDecimal actualInterestPaid) { this.actualInterestPaid = actualInterestPaid; }

    public String getClosedType() { return closedType; }
    public void setClosedType(String closedType) { this.closedType = closedType; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
}
