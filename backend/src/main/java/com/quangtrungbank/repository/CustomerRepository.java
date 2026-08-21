package com.quangtrungbank.repository;

import com.quangtrungbank.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, String> {
    /**
     * Tìm hồ sơ Customer theo User ID (liên kết 1-1 với bảng users).
     */
    Optional<Customer> findByUserId(Long userId);
}
