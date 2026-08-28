package com.quangtrungbank.repository;

import com.quangtrungbank.entity.Teller;
import com.quangtrungbank.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface TellerRepository extends JpaRepository<Teller, String> {
    Optional<Teller> findByStaffCode(String staffCode);
    Optional<Teller> findByUser(User user);
    Optional<Teller> findByUserId(Long userId);
    void deleteByStaffCode(String staffCode);
}
