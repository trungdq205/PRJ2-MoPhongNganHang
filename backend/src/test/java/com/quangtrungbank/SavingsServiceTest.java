package com.quangtrungbank;

import com.quangtrungbank.dto.*;
import com.quangtrungbank.entity.*;
import com.quangtrungbank.repository.*;
import com.quangtrungbank.service.CustomerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class SavingsServiceTest {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private SavingsAccountRepository savingsAccountRepository;

    @Autowired
    private SavingsInterestRateRepository savingsInterestRateRepository;

    private User testUser;
    private Customer testCustomer;
    private Account testPaymentAcc;

    @BeforeEach
    void setUp() {
        long suffix = System.nanoTime();
        String idCard = String.format("%012d", Math.abs(suffix % 1000000000000L));
        String phone = "09" + String.format("%08d", Math.abs(suffix % 100000000L));
        String accNo = "10" + String.format("%08d", Math.abs(suffix % 100000000L));

        testUser = new User();
        testUser.setUsername("sav_user_" + suffix);
        testUser.setPassword("Abc@1234");
        testUser.setRole("CUSTOMER");
        testUser.setFullName("NGUYỄN TIẾT KIỆM");
        testUser.setEmail("sav_" + suffix + "@bank.vn");
        testUser.setPhone(phone);
        userRepository.save(testUser);

        testCustomer = new Customer();
        testCustomer.setId("CUST-SAV-" + suffix);
        testCustomer.setUser(testUser);
        testCustomer.setIdCard(idCard);
        testCustomer.setAddress("123 Phố Ngân Hàng, TP. HCM");
        customerRepository.save(testCustomer);

        testPaymentAcc = new Account();
        testPaymentAcc.setAccountNo(accNo);
        testPaymentAcc.setCustomerId(testCustomer.getId());
        testPaymentAcc.setType("PAYMENT");
        testPaymentAcc.setBalance(new BigDecimal("50000000.00")); // 50 triệu
        testPaymentAcc.setCurrency("VND");
        testPaymentAcc.setStatus("ACTIVE");
        testPaymentAcc.setCreatedAt(LocalDateTime.now());
        accountRepository.save(testPaymentAcc);
    }

    @Test
    @DisplayName("1. Mở sổ tiết kiệm có kỳ hạn 6 tháng thành công & trừ tiền tài khoản thanh toán")
    void testOpenTermSavings_Success() {
        OpenSavingsRequest request = new OpenSavingsRequest();
        request.setSourceAccountNo(testPaymentAcc.getAccountNo());
        request.setDepositAmount(new BigDecimal("10000000.00")); // 10 triệu
        request.setTermMonths(6);
        request.setSavingsType("TERM");
        request.setRenewType("AUTO_ROLLOVER_ALL");

        ApiResponse<SavingsAccount> response = customerService.openSavings(request, testUser, null);
        assertTrue(response.isSuccess(), "Mở sổ phải thành công");
        assertNotNull(response.getData());

        SavingsAccount sav = response.getData();
        assertEquals("TERM", sav.getSavingsType());
        assertEquals(new BigDecimal("10000000.00"), sav.getDepositAmount());
        assertEquals(6, sav.getTermMonths());
        assertEquals("ACTIVE", sav.getStatus());
        assertNotNull(sav.getMaturityDate());
        assertNotNull(sav.getExpectedInterest());
        assertTrue(sav.getExpectedInterest().compareTo(BigDecimal.ZERO) > 0);

        // Kiểm tra số dư tài khoản thanh toán bị trừ 10 triệu -> còn 40 triệu
        Account refreshedAcc = accountRepository.findByAccountNo(testPaymentAcc.getAccountNo()).orElseThrow();
        assertEquals(new BigDecimal("40000000.00"), refreshedAcc.getBalance());
    }

    @Test
    @DisplayName("2. Mở sổ tiết kiệm không kỳ hạn (DEMAND) thành công")
    void testOpenDemandSavings_Success() {
        OpenSavingsRequest request = new OpenSavingsRequest();
        request.setSourceAccountNo(testPaymentAcc.getAccountNo());
        request.setDepositAmount(new BigDecimal("5000000.00"));
        request.setTermMonths(0);
        request.setSavingsType("DEMAND");

        ApiResponse<SavingsAccount> response = customerService.openSavings(request, testUser, null);
        assertTrue(response.isSuccess());

        SavingsAccount sav = response.getData();
        assertEquals("DEMAND", sav.getSavingsType());
        assertEquals(0, sav.getTermMonths());
        assertNull(sav.getMaturityDate(), "Sổ không kỳ hạn không có ngày đáo hạn cố định");

        Account refreshedAcc = accountRepository.findByAccountNo(testPaymentAcc.getAccountNo()).orElseThrow();
        assertEquals(new BigDecimal("45000000.00"), refreshedAcc.getBalance());
    }

    @Test
    @DisplayName("3. Tất toán sổ trước hạn (EARLY_FULL) — áp dụng phạt lãi suất không kỳ hạn")
    void testCloseSavings_EarlyWithdrawal() {
        // Mở sổ 12 tháng với 20 triệu
        OpenSavingsRequest openReq = new OpenSavingsRequest();
        openReq.setSourceAccountNo(testPaymentAcc.getAccountNo());
        openReq.setDepositAmount(new BigDecimal("20000000.00"));
        openReq.setTermMonths(12);
        openReq.setSavingsType("TERM");

        ApiResponse<SavingsAccount> openRes = customerService.openSavings(openReq, testUser, null);
        assertTrue(openRes.isSuccess());
        SavingsAccount sav = openRes.getData();

        // Tất toán trước hạn ngay lập tức
        CloseSavingsRequest closeReq = new CloseSavingsRequest();
        closeReq.setSavingsId(sav.getId());
        closeReq.setEarlyClose(true);

        ApiResponse<Object> closeRes = customerService.closeSavings(closeReq, testUser, null);
        assertTrue(closeRes.isSuccess(), "Tất toán trước hạn phải thành công");

        SavingsAccount refreshedSav = savingsAccountRepository.findById(sav.getId()).orElseThrow();
        assertEquals("CLOSED_EARLY", refreshedSav.getStatus());
        assertEquals("EARLY_FULL", refreshedSav.getClosedType());

        // Kiểm tra tiền đã được hoàn về tài khoản thanh toán
        Account refreshedAcc = accountRepository.findByAccountNo(testPaymentAcc.getAccountNo()).orElseThrow();
        assertTrue(refreshedAcc.getBalance().compareTo(new BigDecimal("50000000.00")) >= 0,
                "Số dư tài khoản sau khi tất toán phải >= 50 triệu (gốc + lãi)");
    }

    @Test
    @DisplayName("4. Rút một phần tiền tiết kiệm (Partial Withdrawal) thành công")
    void testCloseSavings_PartialWithdrawal() {
        // Mở sổ 6 tháng với 10 triệu
        OpenSavingsRequest openReq = new OpenSavingsRequest();
        openReq.setSourceAccountNo(testPaymentAcc.getAccountNo());
        openReq.setDepositAmount(new BigDecimal("10000000.00"));
        openReq.setTermMonths(6);
        openReq.setSavingsType("TERM");

        ApiResponse<SavingsAccount> openRes = customerService.openSavings(openReq, testUser, null);
        assertTrue(openRes.isSuccess());
        SavingsAccount sav = openRes.getData();

        // Rút một phần 3 triệu
        CloseSavingsRequest closeReq = new CloseSavingsRequest();
        closeReq.setSavingsId(sav.getId());
        closeReq.setPartialAmount(new BigDecimal("3000000.00"));

        ApiResponse<Object> closeRes = customerService.closeSavings(closeReq, testUser, null);
        assertTrue(closeRes.isSuccess(), "Rút một phần phải thành công");

        SavingsAccount refreshedSav = savingsAccountRepository.findById(sav.getId()).orElseThrow();
        assertEquals("ACTIVE", refreshedSav.getStatus(), "Sổ vẫn tiếp tục duy trì trạng thái ACTIVE");
        assertEquals(new BigDecimal("7000000.00"), refreshedSav.getDepositAmount(), "Số dư sổ còn lại 7 triệu");

        // Kiểm tra tài khoản thanh toán nhận về 3 triệu + lãi KKH
        Account refreshedAcc = accountRepository.findByAccountNo(testPaymentAcc.getAccountNo()).orElseThrow();
        assertTrue(refreshedAcc.getBalance().compareTo(new BigDecimal("43000000.00")) >= 0);
    }

    @Test
    @DisplayName("5. Nộp thêm tiền vào sổ tiết kiệm Không kỳ hạn (Top-up) thành công")
    void testTopUpDemandSavings_Success() {
        // Mở sổ KKH với 2 triệu
        OpenSavingsRequest openReq = new OpenSavingsRequest();
        openReq.setSourceAccountNo(testPaymentAcc.getAccountNo());
        openReq.setDepositAmount(new BigDecimal("2000000.00"));
        openReq.setTermMonths(0);
        openReq.setSavingsType("DEMAND");

        ApiResponse<SavingsAccount> openRes = customerService.openSavings(openReq, testUser, null);
        assertTrue(openRes.isSuccess());
        SavingsAccount sav = openRes.getData();

        // Nộp thêm 1 triệu vào sổ KKH
        TopUpSavingsRequest topUpReq = new TopUpSavingsRequest();
        topUpReq.setSavingsId(sav.getId());
        topUpReq.setSourceAccountNo(testPaymentAcc.getAccountNo());
        topUpReq.setAmount(new BigDecimal("1000000.00"));

        ApiResponse<SavingsAccount> topUpRes = customerService.topUpSavings(topUpReq, testUser, null);
        assertTrue(topUpRes.isSuccess(), "Nộp thêm vào sổ KKH phải thành công");

        SavingsAccount refreshedSav = savingsAccountRepository.findById(sav.getId()).orElseThrow();
        assertEquals(new BigDecimal("3000000.00"), refreshedSav.getDepositAmount(), "Số dư mới của sổ phải là 3 triệu");

        Account refreshedAcc = accountRepository.findByAccountNo(testPaymentAcc.getAccountNo()).orElseThrow();
        assertEquals(new BigDecimal("47000000.00"), refreshedAcc.getBalance(), "TK nguồn bị trừ tổng 3 triệu -> còn 47 triệu");
    }

    @Test
    @DisplayName("6. Từ chối nộp thêm tiền vào sổ tiết kiệm Có kỳ hạn theo chuẩn Ngân hàng")
    void testTopUpTermSavings_Rejected() {
        // Mở sổ có kỳ hạn 3 tháng
        OpenSavingsRequest openReq = new OpenSavingsRequest();
        openReq.setSourceAccountNo(testPaymentAcc.getAccountNo());
        openReq.setDepositAmount(new BigDecimal("5000000.00"));
        openReq.setTermMonths(3);
        openReq.setSavingsType("TERM");

        ApiResponse<SavingsAccount> openRes = customerService.openSavings(openReq, testUser, null);
        assertTrue(openRes.isSuccess());
        SavingsAccount sav = openRes.getData();

        // Thử nộp thêm tiền vào sổ có kỳ hạn -> phải bị từ chối
        TopUpSavingsRequest topUpReq = new TopUpSavingsRequest();
        topUpReq.setSavingsId(sav.getId());
        topUpReq.setSourceAccountNo(testPaymentAcc.getAccountNo());
        topUpReq.setAmount(new BigDecimal("1000000.00"));

        ApiResponse<SavingsAccount> topUpRes = customerService.topUpSavings(topUpReq, testUser, null);
        assertFalse(topUpRes.isSuccess(), "Phải từ chối nộp thêm vào sổ có kỳ hạn");
        assertTrue(topUpRes.getMessage().contains("không cho phép"));
    }

    @Test
    @DisplayName("7. Idempotency khi mở sổ tiết kiệm: Gửi 2 lần cùng key chỉ trừ tiền 1 lần")
    void testOpenSavings_Idempotency() {
        String idemKey = "IDEM-SAV-" + UUID.randomUUID();

        OpenSavingsRequest req1 = new OpenSavingsRequest();
        req1.setSourceAccountNo(testPaymentAcc.getAccountNo());
        req1.setDepositAmount(new BigDecimal("5000000.00"));
        req1.setTermMonths(6);
        req1.setSavingsType("TERM");

        // Lần 1
        ApiResponse<SavingsAccount> res1 = customerService.openSavings(req1, testUser, idemKey);
        assertTrue(res1.isSuccess());

        // Lần 2 với cùng key
        OpenSavingsRequest req2 = new OpenSavingsRequest();
        req2.setSourceAccountNo(testPaymentAcc.getAccountNo());
        req2.setDepositAmount(new BigDecimal("5000000.00"));
        req2.setTermMonths(6);
        req2.setSavingsType("TERM");

        ApiResponse<SavingsAccount> res2 = customerService.openSavings(req2, testUser, idemKey);
        assertTrue(res2.isSuccess());
        assertEquals(res1.getData().getSavingsNo(), res2.getData().getSavingsNo(), "Phải trả về cùng mã sổ");

        // Tài khoản chỉ bị trừ 1 lần (50 - 5 = 45 triệu, KHÔNG PHẢI 40 triệu)
        Account refreshedAcc = accountRepository.findByAccountNo(testPaymentAcc.getAccountNo()).orElseThrow();
        assertEquals(new BigDecimal("45000000.00"), refreshedAcc.getBalance());
    }
}
