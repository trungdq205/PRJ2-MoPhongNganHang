package com.quangtrungbank;

import com.quangtrungbank.dto.ApiResponse;
import com.quangtrungbank.dto.StatementResponse;
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
class StatementServiceTest {

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
    private User otherUser;
    private Account testAcc;

    @BeforeEach
    void setUp() {
        long suffix = System.nanoTime();
        String idCard = String.format("%012d", Math.abs(suffix % 1000000000000L));
        String phone = "09" + String.format("%08d", Math.abs(suffix % 100000000L));
        String accNo = "109" + String.format("%07d", Math.abs(suffix % 10000000L));

        testUser = new User();
        testUser.setUsername("stmt_user_" + suffix);
        testUser.setPassword("Abc@1234");
        testUser.setRole("CUSTOMER");
        testUser.setFullName("TRẦN VĂN SAO KÊ");
        testUser.setEmail("stmt_" + suffix + "@bank.vn");
        testUser.setPhone(phone);
        userRepository.save(testUser);

        Customer cust = new Customer();
        cust.setId("CUST-STMT-" + suffix);
        cust.setUser(testUser);
        cust.setIdCard(idCard);
        cust.setAddress("789 Phố Sao Kê, Đà Nẵng");
        customerRepository.save(cust);

        testAcc = new Account();
        testAcc.setAccountNo(accNo);
        testAcc.setCustomerId(cust.getId());
        testAcc.setType("PAYMENT");
        testAcc.setBalance(new BigDecimal("80000000.00"));
        testAcc.setCurrency("VND");
        testAcc.setStatus("ACTIVE");
        accountRepository.save(testAcc);

        // Tạo người dùng khác để test access control
        otherUser = new User();
        otherUser.setUsername("other_user_" + suffix);
        otherUser.setPassword("Abc@1234");
        otherUser.setRole("CUSTOMER");
        otherUser.setFullName("NGƯỜI KHÁC");
        otherUser.setEmail("other_" + suffix + "@bank.vn");
        otherUser.setPhone("09" + String.format("%08d", Math.abs((suffix + 7) % 100000000L)));
        userRepository.save(otherUser);

        // Nạp 2 giao dịch trong kỳ sao kê
        Transaction tIn = new Transaction("TXN-STMT-IN-" + suffix, "9000001", "Công ty ABC", testAcc.getAccountNo(), testUser.getFullName(), new BigDecimal("10000000.00"), BigDecimal.ZERO, "TRANSFER", "Nhan luong T8", LocalDateTime.now().minusDays(5), "SUCCESS");
        Transaction tOut = new Transaction("TXN-STMT-OUT-" + suffix, testAcc.getAccountNo(), testUser.getFullName(), "9000002", "Sieu thi WinMart", new BigDecimal("2000000.00"), BigDecimal.ZERO, "TRANSFER", "Thanh toan mua sam", LocalDateTime.now().minusDays(2), "SUCCESS");

        transactionRepository.save(tIn);
        transactionRepository.save(tOut);
    }

    @Test
    @DisplayName("1. Tạo sao kê điện tử theo khoảng thời gian chuẩn xác")
    void testGenerateEStatement_Success() {
        String fromDate = LocalDate.now().minusDays(7).toString();
        String toDate = LocalDate.now().toString();

        ApiResponse<StatementResponse> response = customerService.getEStatement(testAcc.getAccountNo(), fromDate, toDate, testUser);

        assertTrue(response.isSuccess(), "Tạo sao kê phải thành công");
        assertNotNull(response.getData());

        StatementResponse stmt = response.getData();
        assertEquals(testAcc.getAccountNo(), stmt.getAccountNo());
        assertEquals("TRẦN VĂN SAO KÊ", stmt.getCustomerName());
        assertEquals(new BigDecimal("10000000.00"), stmt.getTotalIn(), "Tổng tiền vào phải là 10M");
        assertEquals(new BigDecimal("2000000.00"), stmt.getTotalOut(), "Tổng tiền ra phải là 2M");
        assertEquals(2, stmt.getTransactions().size(), "Tổng số giao dịch trong kỳ là 2");
        assertTrue(stmt.getStatementRef().startsWith("ESTM-"));
    }

    @Test
    @DisplayName("2. Kiểm tra bảo mật: Từ chối yêu cầu tạo sao kê khi người dùng không sở hữu tài khoản")
    void testGenerateEStatement_AccessDenied() {
        String fromDate = LocalDate.now().minusDays(7).toString();
        String toDate = LocalDate.now().toString();

        ApiResponse<StatementResponse> response = customerService.getEStatement(testAcc.getAccountNo(), fromDate, toDate, otherUser);

        assertFalse(response.isSuccess(), "Phải từ chối xem sao kê của tài khoản người khác");
        assertTrue(response.getMessage().contains("không có quyền"));
    }
}
