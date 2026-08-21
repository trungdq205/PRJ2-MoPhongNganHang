package com.quangtrungbank.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import com.quangtrungbank.entity.User;
import com.quangtrungbank.repository.UserRepository;

import com.quangtrungbank.entity.SavingsInterestRate;
import com.quangtrungbank.repository.AccountRepository;
import com.quangtrungbank.repository.SavingsInterestRateRepository;

import java.math.BigDecimal;
import java.util.List;

/**
 * Khởi tạo dữ liệu: Tự động mã hóa mật khẩu plaintext sang BCrypt khi ứng dụng khởi động.
 * Đồng thời tự động seed biểu lãi suất tiết kiệm nếu chưa có và làm sạch tài khoản rác.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SavingsInterestRateRepository savingsInterestRateRepository;
    private final AccountRepository accountRepository;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder, SavingsInterestRateRepository savingsInterestRateRepository, AccountRepository accountRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.savingsInterestRateRepository = savingsInterestRateRepository;
        this.accountRepository = accountRepository;
    }

    @Override
    public void run(String... args) {
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
}
