package com.quangtrungbank.repository;

import com.quangtrungbank.entity.SavingsAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SavingsAccountRepository extends JpaRepository<SavingsAccount, String> {
    List<SavingsAccount> findByCustomerIdOrderByCreatedAtDesc(String customerId);
    List<SavingsAccount> findByCustomerIdAndStatusOrderByCreatedAtDesc(String customerId, String status);
    List<SavingsAccount> findByStatusAndMaturityDateLessThanEqual(String status, LocalDate date);
    Optional<SavingsAccount> findBySavingsNo(String savingsNo);
    Optional<SavingsAccount> findByIdAndCustomerId(String id, String customerId);
}
