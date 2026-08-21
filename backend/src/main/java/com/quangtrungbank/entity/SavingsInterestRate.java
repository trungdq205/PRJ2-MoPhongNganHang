package com.quangtrungbank.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "savings_interest_rates", indexes = {
    @Index(name = "idx_sir_term", columnList = "term_months")
})
public class SavingsInterestRate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "term_months", nullable = false)
    private Integer termMonths; // 0 = Không kỳ hạn

    @Column(nullable = false, length = 30)
    private String label; // "Không kỳ hạn", "1 Tháng", "6 Tháng"...

    @Column(name = "annual_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal annualRate;

    @Column(name = "min_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal minAmount;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom = LocalDate.now();

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public SavingsInterestRate() {}

    public SavingsInterestRate(Integer termMonths, String label, BigDecimal annualRate, BigDecimal minAmount) {
        this.termMonths = termMonths;
        this.label = label;
        this.annualRate = annualRate;
        this.minAmount = minAmount;
        this.effectiveFrom = LocalDate.now();
        this.isActive = true;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getTermMonths() { return termMonths; }
    public void setTermMonths(Integer termMonths) { this.termMonths = termMonths; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public BigDecimal getAnnualRate() { return annualRate; }
    public void setAnnualRate(BigDecimal annualRate) { this.annualRate = annualRate; }

    public BigDecimal getMinAmount() { return minAmount; }
    public void setMinAmount(BigDecimal minAmount) { this.minAmount = minAmount; }

    public LocalDate getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(LocalDate effectiveFrom) { this.effectiveFrom = effectiveFrom; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
