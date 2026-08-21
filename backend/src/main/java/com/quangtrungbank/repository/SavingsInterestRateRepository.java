package com.quangtrungbank.repository;

import com.quangtrungbank.entity.SavingsInterestRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavingsInterestRateRepository extends JpaRepository<SavingsInterestRate, Long> {
    Optional<SavingsInterestRate> findByTermMonthsAndIsActiveTrue(Integer termMonths);
    List<SavingsInterestRate> findByIsActiveTrueOrderByTermMonthsAsc();
}
