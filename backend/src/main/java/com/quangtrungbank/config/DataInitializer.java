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
        ensureNotificationSchema();
        // Tự động xóa tài khoản rác 8888123456 nếu còn tồn tại trong CSDL
        accountRepository.findByAccountNo("8888123456").ifPresent(acc -> {
            accountRepository.delete(acc);
            System.out.println("[CleanUp] Đã xóa thành công tài khoản rác 8888123456 khỏi CSDL!");
        });
        List<User> users = userRepository.findAll();
        if (users.isEmpty()) {
            User c1 = new User();
            c1.setUsername("customer1");
            c1.setPassword(passwordEncoder.encode("Abc@1234"));
            c1.setRole("CUSTOMER");
            c1.setFullName("NGUYỄN VĂN AN");
            c1.setEmail("customer1@quangtrungbank.vn");
            c1.setPhone("0901234567");
            userRepository.save(c1);

            User c2 = new User();
            c2.setUsername("customer2");
            c2.setPassword(passwordEncoder.encode("Abc@1234"));
            c2.setRole("CUSTOMER");
            c2.setFullName("TRẦN THỊ BÌNH");
            c2.setEmail("customer2@quangtrungbank.vn");
            c2.setPhone("0907654321");
            userRepository.save(c2);

            User t1 = new User();
            t1.setUsername("teller1");
            t1.setPassword(passwordEncoder.encode("Abc@1234"));
            t1.setRole("TELLER");
            t1.setFullName("LÊ VĂN CƯỜNG");
            t1.setEmail("teller1@quangtrungbank.vn");
            t1.setPhone("0911223344");
            userRepository.save(t1);

            User a1 = new User();
            a1.setUsername("admin");
            a1.setPassword(passwordEncoder.encode("Abc@1234"));
            a1.setRole("ADMIN");
            a1.setFullName("QUẢN TRỊ VIỆN");
            a1.setEmail("admin@quangtrungbank.vn");
            a1.setPhone("0988888888");
            userRepository.save(a1);

            System.out.println("[Security] Đã khởi tạo 4 tài khoản mặc định (customer1, customer2, teller1, admin) vào CSDL!");
            users = userRepository.findAll();
        }

        for (User user : users) {
            String currentPassword = user.getPassword();
            if (currentPassword == null || (!currentPassword.startsWith("$2a$") && !currentPassword.startsWith("$2b$") && !currentPassword.startsWith("$2y$"))) {
                user.setPassword(passwordEncoder.encode(currentPassword != null ? currentPassword : "Abc@1234"));
                user.setFailedLoginAttempts(0);
                user.setAccountLockedUntil(null);
                userRepository.save(user);
                System.out.println("[Security] Đã mã hóa BCrypt cho tài khoản: " + user.getUsername());
            }
        }

        // Khởi tạo Customer profile và Account cho tất cả User vai trò CUSTOMER
        for (User user : users) {
            if ("CUSTOMER".equalsIgnoreCase(user.getRole())) {
                Customer cust = customerRepository.findByUserId(user.getId()).orElse(null);
                if (cust == null) {
                    String custId = "customer1".equalsIgnoreCase(user.getUsername()) ? "CUST-1001"
                            : ("customer2".equalsIgnoreCase(user.getUsername()) ? "CUST-1002" : "CUST-" + (1000 + user.getId()));
                    String idCard = "customer1".equalsIgnoreCase(user.getUsername()) ? "001098123456"
                            : ("customer2".equalsIgnoreCase(user.getUsername()) ? "001098654321" : "001" + String.format("%09d", user.getId()));
                    String address = "customer1".equalsIgnoreCase(user.getUsername()) ? "123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh"
                            : "456 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh";

                    cust = new Customer(custId, user, idCard, address);
                    cust.setKycStatus("VERIFIED");
                    customerRepository.save(cust);
                    System.out.println("[Customer] Đã khởi tạo hồ sơ Customer (" + custId + ") cho user: " + user.getUsername());
                }

                // Kiểm tra và khởi tạo tài khoản thanh toán mặc định
                List<Account> accounts = accountRepository.findByCustomerId(cust.getId());
                if (accounts.isEmpty()) {
                    String accNo = "customer1".equalsIgnoreCase(user.getUsername()) ? "1000123456"
                            : ("customer2".equalsIgnoreCase(user.getUsername()) ? "1000654321" : "1000" + (user.getPhone() != null && user.getPhone().length() >= 6 ? user.getPhone().substring(user.getPhone().length() - 6) : "123456"));
                    BigDecimal initialBalance = "customer1".equalsIgnoreCase(user.getUsername()) ? BigDecimal.valueOf(250000000)
                            : BigDecimal.valueOf(150000000);

                    if (accountRepository.findByAccountNo(accNo).isEmpty()) {
                        Account acc = new Account(null, accNo, cust.getId(), "PAYMENT", initialBalance, "VND", "ACTIVE", java.time.LocalDateTime.now());
                        accountRepository.save(acc);
                        System.out.println("[Account] Đã khởi tạo tài khoản " + accNo + " (Số dư: " + initialBalance + " VND) cho customer: " + cust.getId());
                    }
                }
            }
        }

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
}
