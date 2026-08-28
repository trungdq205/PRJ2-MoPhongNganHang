package com.quangtrungbank.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import com.quangtrungbank.entity.User;
import com.quangtrungbank.repository.UserRepository;

import com.quangtrungbank.entity.Customer;
import com.quangtrungbank.entity.Account;
import com.quangtrungbank.repository.CustomerRepository;
import com.quangtrungbank.entity.SavingsInterestRate;
import com.quangtrungbank.repository.AccountRepository;
import com.quangtrungbank.repository.SavingsInterestRateRepository;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Khởi tạo dữ liệu: Tự động mã hóa mật khẩu plaintext sang BCrypt khi ứng dụng khởi động.
 * Đồng thời tự động seed hồ sơ Khách hàng, Tài khoản thanh toán và Biểu lãi suất tiết kiệm.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final SavingsInterestRateRepository savingsInterestRateRepository;
    private final AccountRepository accountRepository;
    private final JdbcTemplate jdbcTemplate;

    public DataInitializer(UserRepository userRepository, CustomerRepository customerRepository, PasswordEncoder passwordEncoder, SavingsInterestRateRepository savingsInterestRateRepository, AccountRepository accountRepository, JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.savingsInterestRateRepository = savingsInterestRateRepository;
        this.accountRepository = accountRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        ensureCustomerSchema();
        ensureNotificationSchema();
        // Tự động xóa tài khoản rác 8888123456 nếu còn tồn tại trong CSDL
        accountRepository.findByAccountNo("8888123456").ifPresent(acc -> {
            accountRepository.delete(acc);
            System.out.println("[CleanUp] Đã xóa thành công tài khoản rác 8888123456 khỏi CSDL!");
        });
        // Khởi tạo và seed 3 khách hàng mẫu mặc định nếu chưa tồn tại trong CSDL
        if (userRepository.findByUsername("customer1").isEmpty()) {
            User c1 = new User();
            c1.setUsername("customer1");
            c1.setPassword(passwordEncoder.encode("Abc@1234"));
            c1.setRole("CUSTOMER");
            c1.setFullName("Nguyễn Văn An");
            c1.setEmail("an.nguyen@example.com");
            c1.setPhone("0901234567");
            userRepository.save(c1);

            Customer cust1 = new Customer();
            cust1.setId("CUST-1001");
            cust1.setUser(c1);
            cust1.setIdCard("001098123456");
            cust1.setAddress("123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh");
            cust1.setContactAddress("123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh");
            customerRepository.save(cust1);

            if (accountRepository.findByAccountNo("1000123456").isEmpty()) {
                Account acc1 = new Account(null, "1000123456", "CUST-1001", "PAYMENT", BigDecimal.valueOf(250000000), "VND", "ACTIVE", java.time.LocalDateTime.now());
                accountRepository.save(acc1);
            }
        }

        if (userRepository.findByUsername("customer2").isEmpty()) {
            User c2 = new User();
            c2.setUsername("customer2");
            c2.setPassword(passwordEncoder.encode("Abc@1234"));
            c2.setRole("CUSTOMER");
            c2.setFullName("Trần Thị Bình");
            c2.setEmail("binh.tran@example.com");
            c2.setPhone("0988765432");
            userRepository.save(c2);

            Customer cust2 = new Customer();
            cust2.setId("CUST-1002");
            cust2.setUser(c2);
            cust2.setIdCard("001098654321");
            cust2.setAddress("456 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh");
            cust2.setContactAddress("456 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh");
            customerRepository.save(cust2);

            if (accountRepository.findByAccountNo("1000987654").isEmpty()) {
                Account acc2 = new Account(null, "1000987654", "CUST-1002", "PAYMENT", BigDecimal.valueOf(85000000), "VND", "ACTIVE", java.time.LocalDateTime.now());
                accountRepository.save(acc2);
            }
        }

        if (userRepository.findByUsername("customer3").isEmpty()) {
            User c3 = new User();
            c3.setUsername("customer3");
            c3.setPassword(passwordEncoder.encode("Abc@1234"));
            c3.setRole("CUSTOMER");
            c3.setFullName("Lê Hoàng Nam");
            c3.setEmail("nam.le@example.com");
            c3.setPhone("0912345678");
            userRepository.save(c3);

            Customer cust3 = new Customer();
            cust3.setId("CUST-1003");
            cust3.setUser(c3);
            cust3.setIdCard("001098456789");
            cust3.setAddress("789 Đường Cầu Giấy, Quận Cầu Giấy, Hà Nội");
            cust3.setContactAddress("789 Đường Cầu Giấy, Quận Cầu Giấy, Hà Nội");
            customerRepository.save(cust3);

            if (accountRepository.findByAccountNo("1000456789").isEmpty()) {
                Account acc3 = new Account(null, "1000456789", "CUST-1003", "PAYMENT", BigDecimal.valueOf(15000000), "VND", "ACTIVE", java.time.LocalDateTime.now());
                accountRepository.save(acc3);
            }
        }

        if (userRepository.findByUsername("teller1").isEmpty()) {
            User t1 = new User();
            t1.setUsername("teller1");
            t1.setPassword(passwordEncoder.encode("Abc@1234"));
            t1.setRole("TELLER");
            t1.setFullName("Phạm Minh Đức");
            t1.setEmail("duc.pm@quangtrungbank.com");
            t1.setPhone("0933445566");
            userRepository.save(t1);
        }

        userRepository.findByUsername("admin").ifPresentOrElse(a -> {
            a.setPassword(passwordEncoder.encode("Abc@1234"));
            a.setPhone("0900000000");
            a.setRole("ADMIN");
            a.setFailedLoginAttempts(0);
            a.setAccountLockedUntil(null);
            userRepository.save(a);
        }, () -> {
            User a1 = new User();
            a1.setUsername("admin");
            a1.setPassword(passwordEncoder.encode("Abc@1234"));
            a1.setRole("ADMIN");
            a1.setFullName("Lê Quang Trưởng");
            a1.setEmail("admin@quangtrungbank.com");
            a1.setPhone("0900000000");
            userRepository.save(a1);
        });

        if (savingsInterestRateRepository.count() == 0) {
            savingsInterestRateRepository.save(new SavingsInterestRate(0, "Không kỳ hạn", BigDecimal.valueOf(0.20), BigDecimal.valueOf(100000)));
            savingsInterestRateRepository.save(new SavingsInterestRate(1, "1 Tháng", BigDecimal.valueOf(4.50), BigDecimal.valueOf(1000000)));
            savingsInterestRateRepository.save(new SavingsInterestRate(3, "3 Tháng", BigDecimal.valueOf(5.20), BigDecimal.valueOf(1000000)));
            savingsInterestRateRepository.save(new SavingsInterestRate(6, "6 Tháng", BigDecimal.valueOf(6.50), BigDecimal.valueOf(1000000)));
            savingsInterestRateRepository.save(new SavingsInterestRate(12, "12 Tháng", BigDecimal.valueOf(7.20), BigDecimal.valueOf(1000000)));
            savingsInterestRateRepository.save(new SavingsInterestRate(24, "24 Tháng", BigDecimal.valueOf(7.80), BigDecimal.valueOf(1000000)));
            savingsInterestRateRepository.save(new SavingsInterestRate(36, "36 Tháng", BigDecimal.valueOf(8.00), BigDecimal.valueOf(5000000)));
            System.out.println("[Savings] Đã khởi tạo biểu lãi suất tiết kiệm mặc định vào CSDL!");
        }
    }

    private void ensureNotificationSchema() {
        try {
            List<Map<String, Object>> columns = jdbcTemplate.queryForList(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'"
            );
            Set<String> columnNames = new HashSet<>();
            for (Map<String, Object> row : columns) {
                Object value = row.get("COLUMN_NAME");
                if (value != null) {
                    columnNames.add(value.toString());
                }
            }

            if (columnNames.contains("recipient_user_id")) {
                jdbcTemplate.execute("ALTER TABLE notifications MODIFY COLUMN recipient_user_id VARCHAR(50) NULL DEFAULT NULL");
                System.out.println("[Schema] Đã sửa cột recipient_user_id thành NULLable cho bảng notifications.");
            }
            if (!columnNames.contains("recipient_role")) {
                jdbcTemplate.execute("ALTER TABLE notifications ADD COLUMN recipient_role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER'");
                System.out.println("[Schema] Đã thêm cột recipient_role cho bảng notifications.");
            }
            if (!columnNames.contains("is_read")) {
                jdbcTemplate.execute("ALTER TABLE notifications ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE");
                System.out.println("[Schema] Đã thêm cột is_read cho bảng notifications.");
            }
            if (!columnNames.contains("created_at")) {
                jdbcTemplate.execute("ALTER TABLE notifications ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
                System.out.println("[Schema] Đã thêm cột created_at cho bảng notifications.");
            }
        } catch (Exception e) {
            System.err.println("[Schema] Không thể đồng bộ schema notifications: " + e.getMessage());
        }
    }

    private void ensureCustomerSchema() {
        try {
            List<Map<String, Object>> columns = jdbcTemplate.queryForList(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers'"
            );
            Set<String> columnNames = new HashSet<>();
            for (Map<String, Object> row : columns) {
                Object value = row.get("COLUMN_NAME");
                if (value != null) {
                    columnNames.add(value.toString().toLowerCase());
                }
            }

            if (!columnNames.contains("contact_address")) {
                jdbcTemplate.execute("ALTER TABLE customers ADD COLUMN contact_address VARCHAR(255) NULL");
                jdbcTemplate.execute("UPDATE customers SET contact_address = address WHERE contact_address IS NULL");
                System.out.println("[Schema] Đã thêm cột contact_address và đồng bộ dữ liệu cho bảng customers.");
            }

            // Tự động xóa các cột KYC khỏi bảng customers trong CSDL MySQL
            String[] kycCols = {"id_card_front", "id_card_back", "selfie_photo", "kyc_status", "kyc_verified_at"};
            for (String col : kycCols) {
                if (columnNames.contains(col)) {
                    jdbcTemplate.execute("ALTER TABLE customers DROP COLUMN " + col);
                    System.out.println("[Schema] Đã xóa cột KYC: " + col + " khỏi bảng customers trong CSDL!");
                }
            }
        } catch (Exception e) {
            System.err.println("[Schema] Không thể đồng bộ schema customers: " + e.getMessage());
        }
    }
}
