package com.quangtrungbank;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.quangtrungbank.dto.ApiResponse;
import com.quangtrungbank.dto.TransferRequest;
import com.quangtrungbank.entity.Account;
import com.quangtrungbank.entity.Customer;
import com.quangtrungbank.entity.Transaction;
import com.quangtrungbank.entity.User;
import com.quangtrungbank.repository.AccountRepository;
import com.quangtrungbank.repository.CustomerRepository;
import com.quangtrungbank.repository.TransactionRepository;
import com.quangtrungbank.repository.UserRepository;
import com.quangtrungbank.service.CustomerService;
import com.quangtrungbank.service.IdempotencyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class IdempotencyTest {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private IdempotencyService idempotencyService;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    private User senderUser;
    private Account senderAcc;
    private Account receiverAcc;

    @BeforeEach
    void setUp() {
        long suffix = System.nanoTime();
        String idCard1 = String.format("%012d", Math.abs(suffix % 1000000000000L));
        String idCard2 = String.format("%012d", Math.abs((suffix + 1) % 1000000000000L));
        String phone1 = "09" + String.format("%08d", Math.abs(suffix % 100000000L));
        String phone2 = "08" + String.format("%08d", Math.abs((suffix + 1) % 100000000L));

        String accNo1 = "10" + String.format("%08d", Math.abs(suffix % 100000000L));
        String accNo2 = "20" + String.format("%08d", Math.abs((suffix + 1) % 100000000L));

        // Tạo sender user & customer & account
        senderUser = new User(null, "sender_" + (suffix % 1000000L), "pass", "CUSTOMER", "Nguyễn Văn A", "nva_" + (suffix % 1000000L) + "@test.com", phone1);
        userRepository.save(senderUser);

        Customer senderCust = new Customer("CUST-S-" + (suffix % 1000000L), senderUser, idCard1, "Hà Nội");
        customerRepository.save(senderCust);

        senderAcc = new Account(null, accNo1, senderCust.getId(), "PAYMENT", BigDecimal.valueOf(1000000), "VND", "ACTIVE", LocalDateTime.now());
        accountRepository.save(senderAcc);

        // Tạo receiver
        User receiverUser = new User(null, "receiver_" + (suffix % 1000000L), "pass", "CUSTOMER", "Trần Thị B", "ttb_" + (suffix % 1000000L) + "@test.com", phone2);
        userRepository.save(receiverUser);

        Customer receiverCust = new Customer("CUST-R-" + (suffix % 1000000L), receiverUser, idCard2, "TP HCM");
        customerRepository.save(receiverCust);

        receiverAcc = new Account(null, accNo2, receiverCust.getId(), "PAYMENT", BigDecimal.valueOf(200000), "VND", "ACTIVE", LocalDateTime.now());
        accountRepository.save(receiverAcc);
    }

    @Test
    @DisplayName("Idempotency: Gọi chuyển khoản lần 2 với cùng Idempotency-Key không bị trừ tiền thêm và trả về cùng kết quả")
    void testTransferIdempotencyReplay() {
        String idemKey = "IDEM-" + UUID.randomUUID();
        TransferRequest req = new TransferRequest(senderAcc.getAccountNo(), receiverAcc.getAccountNo(), BigDecimal.valueOf(100000), "Chuyển tiền ăn trưa");
        req.setIdempotencyKey(idemKey);

        // Lần 1: Thực hiện chuyển khoản
        ApiResponse<Transaction> res1 = customerService.transfer(req, senderUser, idemKey);
        assertTrue(res1.isSuccess());
        assertNotNull(res1.getData());
        String txnId1 = res1.getData().getId();

        // Kiểm tra số dư sau lần 1
        Account senderAfter1 = accountRepository.findByAccountNo(senderAcc.getAccountNo()).orElseThrow();
        assertEquals(0, BigDecimal.valueOf(900000).compareTo(senderAfter1.getBalance()));

        // Lần 2: Gửi lại cùng key và payload (mô phỏng retry / double click)
        ApiResponse<Transaction> res2 = customerService.transfer(req, senderUser, idemKey);
        assertTrue(res2.isSuccess());
        assertNotNull(res2.getData());
        assertEquals(txnId1, res2.getData().getId(), "Cùng mã giao dịch được trả về");

        // Xác minh số dư KHÔNG bị trừ lần 2
        Account senderAfter2 = accountRepository.findByAccountNo(senderAcc.getAccountNo()).orElseThrow();
        assertEquals(0, BigDecimal.valueOf(900000).compareTo(senderAfter2.getBalance()), "Số dư không được trừ lần 2!");

        Account receiverAfter2 = accountRepository.findByAccountNo(receiverAcc.getAccountNo()).orElseThrow();
        assertEquals(0, BigDecimal.valueOf(300000).compareTo(receiverAfter2.getBalance()), "Số dư người nhận chỉ tăng đúng 1 lần!");
    }

    @Test
    @DisplayName("Idempotency: Phát hiện và chặn khi dùng cùng Idempotency-Key cho payload khác nhau (Mismatch payload)")
    void testTransferIdempotencyPayloadMismatch() {
        String idemKey = "IDEM-" + UUID.randomUUID();

        // Request 1: 50,000 VND
        TransferRequest req1 = new TransferRequest(senderAcc.getAccountNo(), receiverAcc.getAccountNo(), BigDecimal.valueOf(50000), "Giao dịch 1");
        req1.setIdempotencyKey(idemKey);
        ApiResponse<Transaction> res1 = customerService.transfer(req1, senderUser, idemKey);
        assertTrue(res1.isSuccess());

        // Request 2: Dùng cùng key nhưng đổi amount thành 200,000 VND
        TransferRequest req2 = new TransferRequest(senderAcc.getAccountNo(), receiverAcc.getAccountNo(), BigDecimal.valueOf(200000), "Giao dịch 2 gian lận key");
        req2.setIdempotencyKey(idemKey);
        ApiResponse<Transaction> res2 = customerService.transfer(req2, senderUser, idemKey);

        assertFalse(res2.isSuccess());
        assertTrue(res2.getMessage().contains("nội dung giao dịch khác") || res2.getMessage().contains("Idempotency"));
    }

    @Test
    @DisplayName("Idempotency ATM Deposit: Nạp tiền ATM lặp lại cùng key chỉ cộng số dư 1 lần")
    void testAtmDepositIdempotency() {
        String idemKey = "ATM-DEP-" + UUID.randomUUID();
        com.quangtrungbank.dto.AtmTransactionRequest req = new com.quangtrungbank.dto.AtmTransactionRequest(
            senderAcc.getAccountNo(), BigDecimal.valueOf(500000), "1234", "ATM Ha Noi", idemKey
        );

        ApiResponse<Transaction> res1 = customerService.atmDeposit(req, senderUser, idemKey);
        assertTrue(res1.isSuccess());
        assertNotNull(res1.getData());

        // Kiểm tra số dư tăng 500,000 thành 1,500,000
        Account accAfter1 = accountRepository.findByAccountNo(senderAcc.getAccountNo()).orElseThrow();
        assertEquals(0, BigDecimal.valueOf(1500000).compareTo(accAfter1.getBalance()));

        // Lặp lại cùng key
        ApiResponse<Transaction> res2 = customerService.atmDeposit(req, senderUser, idemKey);
        assertTrue(res2.isSuccess());
        assertEquals(res1.getData().getId(), res2.getData().getId());

        // Số dư vẫn là 1,500,000
        Account accAfter2 = accountRepository.findByAccountNo(senderAcc.getAccountNo()).orElseThrow();
        assertEquals(0, BigDecimal.valueOf(1500000).compareTo(accAfter2.getBalance()));
    }

    @Test
    @DisplayName("Idempotency ATM Withdraw: Rút tiền ATM lặp lại cùng key chỉ trừ số dư 1 lần")
    void testAtmWithdrawIdempotency() {
        String idemKey = "ATM-WDR-" + UUID.randomUUID();
        com.quangtrungbank.dto.AtmTransactionRequest req = new com.quangtrungbank.dto.AtmTransactionRequest(
            senderAcc.getAccountNo(), BigDecimal.valueOf(200000), "1234", "ATM Ha Noi", idemKey
        );

        ApiResponse<Transaction> res1 = customerService.atmWithdraw(req, senderUser, idemKey);
        assertTrue(res1.isSuccess());
        assertNotNull(res1.getData());

        // Kiểm tra số dư giảm từ 1,000,000 xuống 800,000
        Account accAfter1 = accountRepository.findByAccountNo(senderAcc.getAccountNo()).orElseThrow();
        assertEquals(0, BigDecimal.valueOf(800000).compareTo(accAfter1.getBalance()));

        // Lặp lại cùng key
        ApiResponse<Transaction> res2 = customerService.atmWithdraw(req, senderUser, idemKey);
        assertTrue(res2.isSuccess());
        assertEquals(res1.getData().getId(), res2.getData().getId());

        // Số dư vẫn là 800,000 không bị trừ tiếp
        Account accAfter2 = accountRepository.findByAccountNo(senderAcc.getAccountNo()).orElseThrow();
        assertEquals(0, BigDecimal.valueOf(800000).compareTo(accAfter2.getBalance()));
    }
}
