package com.quangtrungbank.repository;

import com.quangtrungbank.entity.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, String> {
    List<SupportTicket> findByCustomerIdOrderByCreatedAtDesc(String customerId);
    List<SupportTicket> findAllByOrderByCreatedAtDesc();
}
