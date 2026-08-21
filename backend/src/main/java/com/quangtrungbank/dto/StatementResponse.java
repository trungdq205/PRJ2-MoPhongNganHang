package com.quangtrungbank.dto;

import com.quangtrungbank.entity.Transaction;
import java.math.BigDecimal;
import java.util.List;

public class StatementResponse {
    private String statementRef;
    private String customerName;
    private String idCard;
    private String phone;
    private String accountNo;
    private String accountType;
    private BigDecimal currentBalance;
    private String fromDate;
    private String toDate;
    private BigDecimal totalIn;
    private BigDecimal totalOut;
    private String generatedAt;
    private List<Transaction> transactions;

    public StatementResponse() {
    }

    public StatementResponse(String statementRef, String customerName, String idCard, String phone, String accountNo, String accountType, BigDecimal currentBalance, String fromDate, String toDate, BigDecimal totalIn, BigDecimal totalOut, String generatedAt, List<Transaction> transactions) {
        this.statementRef = statementRef;
        this.customerName = customerName;
        this.idCard = idCard;
        this.phone = phone;
        this.accountNo = accountNo;
        this.accountType = accountType;
        this.currentBalance = currentBalance;
        this.fromDate = fromDate;
        this.toDate = toDate;
        this.totalIn = totalIn;
        this.totalOut = totalOut;
        this.generatedAt = generatedAt;
        this.transactions = transactions;
    }

    public String getStatementRef() {
        return statementRef;
    }

    public void setStatementRef(String statementRef) {
        this.statementRef = statementRef;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getIdCard() {
        return idCard;
    }

    public void setIdCard(String idCard) {
        this.idCard = idCard;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAccountNo() {
        return accountNo;
    }

    public void setAccountNo(String accountNo) {
        this.accountNo = accountNo;
    }

    public String getAccountType() {
        return accountType;
    }

    public void setAccountType(String accountType) {
        this.accountType = accountType;
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }

    public void setCurrentBalance(BigDecimal currentBalance) {
        this.currentBalance = currentBalance;
    }

    public String getFromDate() {
        return fromDate;
    }

    public void setFromDate(String fromDate) {
        this.fromDate = fromDate;
    }

    public String getToDate() {
        return toDate;
    }

    public void setToDate(String toDate) {
        this.toDate = toDate;
    }

    public BigDecimal getTotalIn() {
        return totalIn;
    }

    public void setTotalIn(BigDecimal totalIn) {
        this.totalIn = totalIn;
    }

    public BigDecimal getTotalOut() {
        return totalOut;
    }

    public void setTotalOut(BigDecimal totalOut) {
        this.totalOut = totalOut;
    }

    public String getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(String generatedAt) {
        this.generatedAt = generatedAt;
    }

    public List<Transaction> getTransactions() {
        return transactions;
    }

    public void setTransactions(List<Transaction> transactions) {
        this.transactions = transactions;
    }
}
