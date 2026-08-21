package com.quangtrungbank;

import com.quangtrungbank.dto.ApiResponse;
import com.quangtrungbank.dto.TransferRequest;
import com.quangtrungbank.entity.Account;
import com.quangtrungbank.entity.Customer;
import com.quangtrungbank.entity.Notification;
import com.quangtrungbank.entity.User;
import com.quangtrungbank.repository.AccountRepository;
import com.quangtrungbank.repository.CustomerRepository;
import com.quangtrungbank.repository.NotificationRepository;
import com.quangtrungbank.repository.UserRepository;
import com.quangtrungbank.service.CustomerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class NotificationServiceTest {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    private User senderUser;
    private User receiverUser;
    private Account senderAcc;
    private Account receiverAcc;
    private Customer senderCust;
    private Customer receiverCust;

    @BeforeEach
    void setUp() {
        long suffix = System.nanoTime();

        senderUser = new User();
        senderUser.setUsername("notif_sender_" + suffix);
        senderUser.setPassword("Abc@1234");
        senderUser.setRole("CUSTOMER");
        senderUser.setFullName("NGUYỄN VĂN GỬI");
        senderUser.setEmail("sender_" + suffix + "@bank.vn");
        senderUser.setPhone("09" + String.format("%08d", Math.abs(suffix % 100000000L)));
        userRepository.save(senderUser);

        senderCust = new Customer();
        senderCust.setId("CUST-NOTIF-S-" + suffix);
        senderCust.setUser(senderUser);
        senderCust.setIdCard(String.format("%012d", Math.abs(suffix % 1000000000000L)));
        senderCust.setAddress("123 Phố Nạp Tiền");
        customerRepository.save(senderCust);

        senderAcc = new Account();
        senderAcc.setAccountNo("108" + String.format("%07d", Math.abs(suffix % 10000000L)));
        senderAcc.setCustomerId(senderCust.getId());
        senderAcc.setType("PAYMENT");
        senderAcc.setBalance(new BigDecimal("50000000.00"));
        senderAcc.setCurrency("VND");
        senderAcc.setStatus("ACTIVE");
        accountRepository.save(senderAcc);

        receiverUser = new User();
        receiverUser.setUsername("notif_rec_" + suffix);
        receiverUser.setPassword("Abc@1234");
        receiverUser.setRole("CUSTOMER");
        receiverUser.setFullName("LÊ THỊ NHẬN");
        receiverUser.setEmail("rec_" + suffix + "@bank.vn");
        receiverUser.setPhone("09" + String.format("%08d", Math.abs((suffix + 1) % 100000000L)));
        userRepository.save(receiverUser);

        receiverCust = new Customer();
        receiverCust.setId("CUST-NOTIF-R-" + suffix);
        receiverCust.setUser(receiverUser);
        receiverCust.setIdCard(String.format("%012d", Math.abs((suffix + 1) % 1000000000000L)));
        receiverCust.setAddress("456 Phố Nhận Tiền");
        customerRepository.save(receiverCust);

        receiverAcc = new Account();
        receiverAcc.setAccountNo("108" + String.format("%07d", Math.abs((suffix + 1) % 10000000L)));
        receiverAcc.setCustomerId(receiverCust.getId());
        receiverAcc.setType("PAYMENT");
        receiverAcc.setBalance(new BigDecimal("10000000.00"));
        receiverAcc.setCurrency("VND");
        receiverAcc.setStatus("ACTIVE");
        accountRepository.save(receiverAcc);
    }

    @Test
    @DisplayName("1. Tự động phát thông báo push biến động số dư khi thực hiện giao dịch chuyển tiền")
    void testPushNotification_OnTransfer() {
        TransferRequest req = new TransferRequest();
        req.setFromAccNo(senderAcc.getAccountNo());
        req.setToAccNo(receiverAcc.getAccountNo());
        req.setAmount(new BigDecimal("5000000.00"));
        req.setContent("Chuyen tien qua Push Notification Test");

        ApiResponse<?> transferRes = customerService.transfer(req, senderUser, "IDEM-NOTIF-01-" + System.nanoTime());
        assertTrue(transferRes.isSuccess());

        // Kiểm tra thông báo của người gửi (Money Out)
        ApiResponse<List<Notification>> senderNotifs = customerService.getNotifications(senderUser);
        assertTrue(senderNotifs.isSuccess());
        assertFalse(senderNotifs.getData().isEmpty(), "Người gửi phải nhận được thông báo biến động số dư Nợ (-)");
        Notification sNotif = senderNotifs.getData().get(0);
        assertEquals("MONEY_OUT", sNotif.getType());
        assertEquals(new BigDecimal("5000000.00"), sNotif.getAmount());

        // Kiểm tra thông báo của người nhận (Money In)
        ApiResponse<List<Notification>> recNotifs = customerService.getNotifications(receiverUser);
        assertTrue(recNotifs.isSuccess());
        assertFalse(recNotifs.getData().isEmpty(), "Người nhận phải nhận được thông báo biến động số dư Có (+)");
        Notification rNotif = recNotifs.getData().get(0);
        assertEquals("MONEY_IN", rNotif.getType());
        assertEquals(new BigDecimal("5000000.00"), rNotif.getAmount());
    }

    @Test
    @DisplayName("2. Đánh dấu tất cả thông báo là đã đọc")
    void testMarkAllNotificationsRead() {
        customerService.pushBalanceNotification(senderCust.getId(), senderAcc.getAccountNo(), "Thông báo 1", "Nội dung 1", new BigDecimal("100000.00"), new BigDecimal("49900000.00"), "MONEY_OUT");
        customerService.pushBalanceNotification(senderCust.getId(), senderAcc.getAccountNo(), "Thông báo 2", "Nội dung 2", new BigDecimal("200000.00"), new BigDecimal("49700000.00"), "MONEY_OUT");

        ApiResponse<String> markRes = customerService.markAllNotificationsRead(senderUser);
        assertTrue(markRes.isSuccess());

        ApiResponse<List<Notification>> notifs = customerService.getNotifications(senderUser);
        assertTrue(notifs.getData().stream().allMatch(Notification::isRead), "Tất cả thông báo phải có isRead = true");
    }
}
