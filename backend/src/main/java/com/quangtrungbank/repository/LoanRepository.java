package com.quangtrungbank.repository;

import com.quangtrungbank.entity.Loan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanRepository extends JpaRepository<Loan, String> {
    List<Loan> findByCustomerIdOrderByAppliedAtDesc(String customerId);
    List<Loan> findAllByOrderByAppliedAtDesc();
}
