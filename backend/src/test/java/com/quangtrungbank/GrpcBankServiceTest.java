package com.quangtrungbank;

import com.quangtrungbank.entity.Account;
import com.quangtrungbank.entity.Customer;
import com.quangtrungbank.entity.User;
import com.quangtrungbank.grpc.GrpcBankService;
import com.quangtrungbank.repository.AccountRepository;
import com.quangtrungbank.repository.CustomerRepository;
import com.quangtrungbank.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class GrpcBankServiceTest {

    @Autowired
    private GrpcBankService grpcBankService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AccountRepository accountRepository;

    private User testUserSender;
    private Customer testCustomerSender;
    private Account accountSender;
    private Account accountReceiver;

    @BeforeEach
    void setUp() {
        String uuid = UUID.randomUUID().toString().replaceAll("-", "").substring(0, 8);

        testUserSender = new User();
        testUserSender.setUsername("grpc_user_" + uuid);
        testUserSender.setPassword("Password@123");
        testUserSender.setFullName("Nguyễn Văn gRPC");
        testUserSender.setRole("CUSTOMER");
        testUserSender = userRepository.save(testUserSender);

        testCustomerSender = new Customer();
        testCustomerSender.setId("CUST-GRPC-" + uuid);
        testCustomerSender.setUser(testUserSender);
        testCustomerSender.setIdCard("001" + System.currentTimeMillis() % 1000000000L);
        testCustomerSender = customerRepository.save(testCustomerSender);

        accountSender = new Account();
        accountSender.setAccountNo("GRPC_SRC_" + uuid);
        accountSender.setCustomerId(testCustomerSender.getId());
        accountSender.setBalance(BigDecimal.valueOf(50_000_000.0));
        accountSender.setType("PAYMENT");
        accountSender.setStatus("ACTIVE");
        accountSender = accountRepository.save(accountSender);

        accountReceiver = new Account();
        accountReceiver.setAccountNo("GRPC_RECV_" + uuid);
        accountReceiver.setCustomerId(testCustomerSender.getId());
        accountReceiver.setBalance(BigDecimal.valueOf(10_000_000.0));
        accountReceiver.setType("PAYMENT");
        accountReceiver.setStatus("ACTIVE");
        accountReceiver = accountRepository.save(accountReceiver);
    }

    @Test
    @DisplayName("gRPC RPC TransferMoney - Chuyển khoản thành công")
    void testTransferMoneyRpc_Success() {
        Map<String, Object> req = new HashMap<>();
        req.put("from_account", accountSender.getAccountNo());
        req.put("to_account", accountReceiver.getAccountNo());
        req.put("amount", 5_000_000.0);
        req.put("content", "gRPC RPC Chuyen tien");
        req.put("idempotency_key", UUID.randomUUID().toString());

        Map<String, Object> res = grpcBankService.transferMoneyRpc(req, testUserSender);

        assertTrue((Boolean) res.get("success"));
        assertNotNull(res.get("transaction_id"));
        assertEquals(5_000_000.0, ((Number) res.get("amount")).doubleValue());

        Account updatedSrc = accountRepository.findByAccountNo(accountSender.getAccountNo()).orElseThrow();
        assertEquals(0, BigDecimal.valueOf(45_000_000.0).compareTo(updatedSrc.getBalance()));
    }

    @Test
    @DisplayName("gRPC RPC TransferMoney - Chặn tự chuyển tiền cho chính tài khoản nguồn")
    void testTransferMoneyRpc_SameAccount_ShouldFail() {
        Map<String, Object> req = new HashMap<>();
        req.put("from_account", accountSender.getAccountNo());
        req.put("to_account", accountSender.getAccountNo());
        req.put("amount", 1_000_000.0);
        req.put("content", "Tu chuyen cho chinh minh");
        req.put("idempotency_key", UUID.randomUUID().toString());

        Map<String, Object> res = grpcBankService.transferMoneyRpc(req, testUserSender);

        assertFalse((Boolean) res.get("success"));
        assertEquals("Tài khoản nhận không được trùng với tài khoản chuyển", res.get("message"));
    }

    @Test
    @DisplayName("gRPC RPC OpenSavings - Mở sổ tiết kiệm qua gRPC RPC")
    void testOpenSavingsRpc_Success() {
        Map<String, Object> req = new HashMap<>();
        req.put("source_account", accountSender.getAccountNo());
        req.put("amount", 10_000_000.0);
        req.put("term_months", 6);
        req.put("renew_type", "AUTO_ROLLOVER_ALL");
        req.put("idempotency_key", UUID.randomUUID().toString());

        Map<String, Object> res = grpcBankService.openSavingsRpc(req, testUserSender);

        assertTrue((Boolean) res.get("success"));
        assertNotNull(res.get("savings_no"));
        assertEquals(10_000_000.0, ((Number) res.get("deposit_amount")).doubleValue());
    }
}

