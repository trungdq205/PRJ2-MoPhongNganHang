package com.quangtrungbank.repository;

import com.quangtrungbank.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByCustomerIdOrderByCreatedAtDesc(String customerId);
    List<Notification> findByRecipientRoleOrderByCreatedAtDesc(String recipientRole);
    long countByCustomerIdAndReadFalse(String customerId);
}
