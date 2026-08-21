package com.quangtrungbank;

import com.quangtrungbank.dto.ApiResponse;
import com.quangtrungbank.dto.PageResult;
import com.quangtrungbank.entity.Account;
import com.quangtrungbank.entity.Customer;
import com.quangtrungbank.entity.Transaction;
import com.quangtrungbank.entity.User;
import com.quangtrungbank.repository.AccountRepository;
import com.quangtrungbank.repository.CustomerRepository;
import com.quangtrungbank.repository.TransactionRepository;
import com.quangtrungbank.repository.UserRepository;
import com.quangtrungbank.service.CustomerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class TransactionHistoryTest {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    private User testUser;
    private Account acc1;
    private Account acc2;

    @BeforeEach
    void setUp() {
        long suffix = System.nanoTime();
        String idCard = String.format("%012d", Math.abs(suffix % 1000000000000L));
        String phone = "09" + String.format("%08d", Math.abs(suffix % 100000000L));
        String accNo1 = "101" + String.format("%07d", Math.abs(suffix % 10000000L));
        String accNo2 = "102" + String.format("%07d", Math.abs((suffix + 1) % 10000000L));

        testUser = new User();
        testUser.setUsername("hist_user_" + suffix);
        testUser.setPassword("Abc@1234");
        testUser.setRole("CUSTOMER");
        testUser.setFullName("LÊ THỊ LỊCH SỬ");
        testUser.setEmail("hist_" + suffix + "@bank.vn");
        testUser.setPhone(phone);
        userRepository.save(testUser);

        Customer cust = new Customer();
        cust.setId("CUST-HIST-" + suffix);
        cust.setUser(testUser);
        cust.setIdCard(idCard);
        cust.setAddress("456 Đường Lịch Sử, Hà Nội");
        customerRepository.save(cust);

        acc1 = new Account();
        acc1.setAccountNo(accNo1);
        acc1.setCustomerId(cust.getId());
        acc1.setType("PAYMENT");
        acc1.setBalance(new BigDecimal("100000000.00"));
        acc1.setCurrency("VND");
        acc1.setStatus("ACTIVE");
        accountRepository.save(acc1);

        acc2 = new Account();
        acc2.setAccountNo(accNo2);
        acc2.setCustomerId(cust.getId());
        acc2.setType("PAYMENT");
        acc2.setBalance(new BigDecimal("200000000.00"));
        acc2.setCurrency("VND");
        acc2.setStatus("ACTIVE");
        accountRepository.save(acc2);

        // Tạo 4 giao dịch mẫu với thời gian, loại và số tiền khác nhau
        Transaction t1 = new Transaction("TXN-HIST-01-" + suffix, acc1.getAccountNo(), testUser.getFullName(), "9990001", "Công ty Điện lực", new BigDecimal("500000.00"), BigDecimal.ZERO, "TRANSFER", "Thanh toan tien dien T8", LocalDateTime.now().minusDays(10), "SUCCESS");
        Transaction t2 = new Transaction("TXN-HIST-02-" + suffix, "9990002", "Công ty CP ABC", acc1.getAccountNo(), testUser.getFullName(), new BigDecimal("15000000.00"), BigDecimal.ZERO, "DEPOSIT", "Nhan luong thang 8", LocalDateTime.now().minusDays(5), "SUCCESS");
        Transaction t3 = new Transaction("TXN-HIST-03-" + suffix, acc1.getAccountNo(), testUser.getFullName(), acc2.getAccountNo(), testUser.getFullName(), new BigDecimal("2000000.00"), BigDecimal.ZERO, "TRANSFER", "Chuyen tien noi bo", LocalDateTime.now().minusDays(2), "SUCCESS");
        Transaction t4 = new Transaction("TXN-HIST-04-" + suffix, acc1.getAccountNo(), testUser.getFullName(), "ATM-001", "Cay ATM Hoi So", new BigDecimal("1000000.00"), BigDecimal.ZERO, "WITHDRAW", "Rut tien ATM", LocalDateTime.now(), "SUCCESS");

        transactionRepository.save(t1);
        transactionRepository.save(t2);
        transactionRepository.save(t3);
        transactionRepository.save(t4);
    }

    @Test
    @DisplayName("1. Lọc giao dịch theo khoảng ngày (fromDate - toDate)")
    void testFilterByDateRange() {
        String fromDate = LocalDate.now().minusDays(6).toString();
        String toDate = LocalDate.now().toString();

        ApiResponse<PageResult<Transaction>> res = customerService.getHistoryFiltered(
                acc1.getAccountNo(), fromDate, toDate, null, null, null, null, 0, 10, testUser
        );

        assertTrue(res.isSuccess());
        PageResult<Transaction> page = res.getData();
        assertNotNull(page);
        assertEquals(3, page.getTotalElements(), "Phải tìm thấy 3 giao dịch trong vòng 6 ngày qua (T2, T3, T4)");
    }

    @Test
    @DisplayName("2. Lọc giao dịch theo loại (TRANSFER, DEPOSIT, WITHDRAW)")
    void testFilterByType() {
        // Lọc loại DEPOSIT
        ApiResponse<PageResult<Transaction>> resDeposit = customerService.getHistoryFiltered(
                acc1.getAccountNo(), null, null, "DEPOSIT", null, null, null, 0, 10, testUser
        );
        assertTrue(resDeposit.isSuccess());
        assertEquals(1, resDeposit.getData().getTotalElements());
        assertEquals("DEPOSIT", resDeposit.getData().getContent().get(0).getType());

        // Lọc loại TRANSFER
        ApiResponse<PageResult<Transaction>> resTransfer = customerService.getHistoryFiltered(
                acc1.getAccountNo(), null, null, "TRANSFER", null, null, null, 0, 10, testUser
        );
        assertTrue(resTransfer.isSuccess());
        assertEquals(2, resTransfer.getData().getTotalElements());
    }

    @Test
    @DisplayName("3. Lọc giao dịch theo khoảng số tiền (minAmount - maxAmount)")
    void testFilterByAmountRange() {
        BigDecimal minAmt = new BigDecimal("1000000.00");
        BigDecimal maxAmt = new BigDecimal("5000000.00");

        ApiResponse<PageResult<Transaction>> res = customerService.getHistoryFiltered(
                acc1.getAccountNo(), null, null, null, minAmt, maxAmt, null, 0, 10, testUser
        );

        assertTrue(res.isSuccess());
        assertEquals(2, res.getData().getTotalElements(), "Số tiền từ 1M đến 5M gồm T3 (2M) và T4 (1M)");
    }

    @Test
    @DisplayName("4. Lọc kết hợp từ khóa tìm kiếm và phân trang (page = 0, size = 2)")
    void testPaginationAndSearch() {
        ApiResponse<PageResult<Transaction>> res = customerService.getHistoryFiltered(
                acc1.getAccountNo(), null, null, null, null, null, null, 0, 2, testUser
        );

        assertTrue(res.isSuccess());
        PageResult<Transaction> page = res.getData();
        assertEquals(2, page.getContent().size(), "Trang 1 có kích thước size=2");
        assertEquals(4, page.getTotalElements(), "Tổng số bản ghi là 4");
        assertEquals(2, page.getTotalPages(), "Tổng số trang là 2 trang");
        assertEquals(0, page.getPage());
    }
}
