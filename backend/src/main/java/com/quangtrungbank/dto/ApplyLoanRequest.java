package com.quangtrungbank.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class ApplyLoanRequest {
    @NotBlank(message = "Số tài khoản giải ngân không được để trống")
    private String accountNo;

    @NotBlank(message = "Loại vay không được để trống")
    private String loanType;

    @NotBlank(message = "Tiêu đề mục đích vay không được để trống")
    private String title;

    @NotNull(message = "Số tiền vay không được để trống")
    @Min(value = 5000000, message = "Số tiền vay tối thiểu 5.000.000 VNĐ")
    private BigDecimal principalAmount;

    @NotNull(message = "Thời hạn vay không được để trống")
    private Integer termMonths;

    private BigDecimal interestRate;

    public ApplyLoanRequest() {}

    public String getAccountNo() { return accountNo; }
    public void setAccountNo(String accountNo) { this.accountNo = accountNo; }

    public String getLoanType() { return loanType; }
    public void setLoanType(String loanType) { this.loanType = loanType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public BigDecimal getPrincipalAmount() { return principalAmount; }
    public void setPrincipalAmount(BigDecimal principalAmount) { this.principalAmount = principalAmount; }

    public Integer getTermMonths() { return termMonths; }
    public void setTermMonths(Integer termMonths) { this.termMonths = termMonths; }

    public BigDecimal getInterestRate() { return interestRate; }
    public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }
}
