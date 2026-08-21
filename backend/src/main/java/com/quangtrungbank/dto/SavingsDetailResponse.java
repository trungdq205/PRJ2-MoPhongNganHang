package com.quangtrungbank.dto;

import com.quangtrungbank.entity.SavingsAccount;
import com.quangtrungbank.entity.Transaction;

import java.math.BigDecimal;
import java.util.List;

public class SavingsDetailResponse {
    private SavingsAccount savingsAccount;
    private long daysActive; // Số ngày đã gửi
    private BigDecimal currentAccruedInterest; // Lãi tạm tính đến hôm nay
    private BigDecimal payoutIfClosedToday; // Số tiền nhận được nếu tất toán hôm nay
    private boolean isMatured; // Đã đến ngày đáo hạn chưa
    private List<Transaction> relatedTransactions; // Lịch sử giao dịch liên quan

    public SavingsDetailResponse() {}

    public SavingsDetailResponse(SavingsAccount savingsAccount, long daysActive, BigDecimal currentAccruedInterest, BigDecimal payoutIfClosedToday, boolean isMatured, List<Transaction> relatedTransactions) {
        this.savingsAccount = savingsAccount;
        this.daysActive = daysActive;
        this.currentAccruedInterest = currentAccruedInterest;
        this.payoutIfClosedToday = payoutIfClosedToday;
        this.isMatured = isMatured;
        this.relatedTransactions = relatedTransactions;
    }

    public SavingsAccount getSavingsAccount() { return savingsAccount; }
    public void setSavingsAccount(SavingsAccount savingsAccount) { this.savingsAccount = savingsAccount; }

    public long getDaysActive() { return daysActive; }
    public void setDaysActive(long daysActive) { this.daysActive = daysActive; }

    public BigDecimal getCurrentAccruedInterest() { return currentAccruedInterest; }
    public void setCurrentAccruedInterest(BigDecimal currentAccruedInterest) { this.currentAccruedInterest = currentAccruedInterest; }

    public BigDecimal getPayoutIfClosedToday() { return payoutIfClosedToday; }
    public void setPayoutIfClosedToday(BigDecimal payoutIfClosedToday) { this.payoutIfClosedToday = payoutIfClosedToday; }

    public boolean isMatured() { return isMatured; }
    public void setMatured(boolean matured) { isMatured = matured; }

    public List<Transaction> getRelatedTransactions() { return relatedTransactions; }
    public void setRelatedTransactions(List<Transaction> relatedTransactions) { this.relatedTransactions = relatedTransactions; }
}
