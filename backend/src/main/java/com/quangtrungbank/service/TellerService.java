package com.quangtrungbank.service;

import com.quangtrungbank.dto.ApiResponse;
import com.quangtrungbank.dto.CreateCustomerRequest;
import com.quangtrungbank.dto.ResolveTicketRequest;
import com.quangtrungbank.dto.UpdateCustomerRequest;
import com.quangtrungbank.entity.*;
import com.quangtrungbank.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class TellerService {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final PasswordEncoder passwordEncoder;

    public TellerService(UserRepository userRepository,
                         CustomerRepository customerRepository,
                         AccountRepository accountRepository,
                         TransactionRepository transactionRepository,
                         SupportTicketRepository supportTicketRepository,
                         PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.supportTicketRepository = supportTicketRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Giao dịch viên thêm mới hồ sơ khách hàng + tài khoản thanh toán ban đầu.
     */
    @Transactional
    public ApiResponse<Customer> createCustomer(CreateCustomerRequest request, User currentTeller) {
        if (!"TELLER".equals(currentTeller.getRole()) && !"ADMIN".equals(currentTeller.getRole())) {
            return ApiResponse.error("Chỉ Giao dịch viên hoặc Admin mới có quyền thực hiện");
        }

        // Kiểm tra trùng SĐT
        if (request.getPhone() != null && userRepository.findByUsername("cust_" + request.getPhone()).isPresent()) {
            return ApiResponse.error("Số điện thoại đã được đăng ký tài khoản");
        }

        String username = "cust_" + request.getPhone();
        String encodedPass = passwordEncoder.encode("Abc@1234"); // Mật khẩu mặc định bảo mật

        User user = new User(
            null,
            username,
            encodedPass,
            "CUSTOMER",
            request.getFullName(),
            request.getEmail() != null ? request.getEmail() : (username + "@quangtrungbank.com"),
            request.getPhone()
        );
        userRepository.save(user);

        long count = customerRepository.count();
        String custId = "CUST-" + (1001 + count);

        Customer customer = new Customer(
            custId,
            user,
            request.getIdCard(),
            request.getAddress() != null ? request.getAddress() : "Chưa cập nhật"
        );
        customer.setKycStatus("VERIFIED");
        customer.setKycVerifiedAt(LocalDateTime.now());
        customerRepository.save(customer);

        // Tạo tài khoản thanh toán ban đầu
        String accNo = "1000" + (100000 + new Random().nextInt(900000));
        BigDecimal balance = request.getInitialBalance() != null ? request.getInitialBalance() : BigDecimal.ZERO;

        Account account = new Account(
            null,
            accNo,
            custId,
            "PAYMENT",
            balance,
            "VND",
            "ACTIVE",
            LocalDateTime.now()
        );
        accountRepository.save(account);

        // Nếu nạp tiền ban đầu > 0, tạo giao dịch DEPOSIT
        if (balance.compareTo(BigDecimal.ZERO) > 0) {
            Transaction txn = new Transaction(
                "TXN-" + (10000 + new Random().nextInt(90000)),
                "NẠP TẠI QUẦY",
                "GDV: " + currentTeller.getFullName(),
                accNo,
                request.getFullName(),
                balance,
                BigDecimal.ZERO,
                "DEPOSIT",
                "Nộp tiền ban đầu khi mở tài khoản tại quầy",
                LocalDateTime.now(),
                "SUCCESS"
            );
            transactionRepository.save(txn);
        }

        return ApiResponse.ok(String.format("Tạo hồ sơ thành công! Mã KH: %s, Số tài khoản: %s", custId, accNo), customer);
    }

    /**
     * Đổi trạng thái tài khoản (ACTIVE / LOCKED / CLOSED).
     */
    @Transactional
    public ApiResponse<Account> toggleAccountStatus(String accountNo, String status, User currentTeller) {
        if (!"TELLER".equals(currentTeller.getRole()) && !"ADMIN".equals(currentTeller.getRole())) {
            return ApiResponse.error("Không có quyền thao tác");
        }

        Optional<Account> accOpt = accountRepository.findByAccountNo(accountNo);
        if (accOpt.isEmpty()) return ApiResponse.error("Tài khoản không tồn tại");

        Account acc = accOpt.get();
        acc.setStatus(status);
        accountRepository.save(acc);

        return ApiResponse.ok(String.format("Đã chuyển trạng thái tài khoản %s thành %s", accountNo, status), acc);
    }

    /**
     * Giao dịch viên xử lý đơn hỗ trợ / khiếu nại.
     */
    @Transactional
    public ApiResponse<SupportTicket> resolveTicket(String ticketId, ResolveTicketRequest request, User currentTeller) {
        if (!"TELLER".equals(currentTeller.getRole()) && !"ADMIN".equals(currentTeller.getRole())) {
            return ApiResponse.error("Không có quyền thao tác");
        }

        Optional<SupportTicket> ticketOpt = supportTicketRepository.findById(ticketId);
        if (ticketOpt.isEmpty()) return ApiResponse.error("Đơn hỗ trợ không tồn tại");

        SupportTicket ticket = ticketOpt.get();
        ticket.setStatus(request.getStatus() != null ? request.getStatus() : "RESOLVED");
        ticket.setResponse(request.getResponse());
        ticket.setAssignedTo(currentTeller.getFullName());
        supportTicketRepository.save(ticket);

        return ApiResponse.ok("Đã xử lý đơn hỗ trợ " + ticketId, ticket);
    }

    /**
     * Lấy danh sách tất cả yêu cầu hỗ trợ cho Teller.
     */
    public ApiResponse<List<SupportTicket>> getAllTickets(User currentTeller) {
        if (!"TELLER".equals(currentTeller.getRole()) && !"ADMIN".equals(currentTeller.getRole())) {
            return ApiResponse.error("Không có quyền truy cập");
        }
        List<SupportTicket> list = supportTicketRepository.findAllByOrderByCreatedAtDesc();
        return ApiResponse.ok("Lấy danh sách thành công", list);
    }

    /**
     * Giao dịch viên chỉnh sửa thông tin khách hàng (Họ tên, SĐT, Email, Địa chỉ).
     */
    @Transactional
    public ApiResponse<Customer> updateCustomer(String customerId, UpdateCustomerRequest request, User currentTeller) {
        if (!"TELLER".equals(currentTeller.getRole()) && !"ADMIN".equals(currentTeller.getRole())) {
            return ApiResponse.error("Không có quyền thao tác");
        }

        Optional<Customer> custOpt = customerRepository.findById(customerId);
        if (custOpt.isEmpty()) return ApiResponse.error("Hồ sơ khách hàng không tồn tại");

        Customer cust = custOpt.get();
        User user = cust.getUser();

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            String newPhone = request.getPhone().trim();
            Optional<User> phoneUser = userRepository.findByPhone(newPhone);
            if (phoneUser.isPresent() && !phoneUser.get().getId().equals(user.getId())) {
                return ApiResponse.error("Số điện thoại này đã được sử dụng bởi tài khoản khác");
            }
            user.setPhone(newPhone);
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String newEmail = request.getEmail().trim();
            Optional<User> emailUser = userRepository.findByEmail(newEmail);
            if (emailUser.isPresent() && !emailUser.get().getId().equals(user.getId())) {
                return ApiResponse.error("Địa chỉ Email này đã được sử dụng bởi tài khoản khác");
            }
            user.setEmail(newEmail);
        }
        if (request.getAddress() != null) {
            cust.setAddress(request.getAddress().trim());
        }

        userRepository.saveAndFlush(user);
        customerRepository.saveAndFlush(cust);

        return ApiResponse.ok("Cập nhật thông tin khách hàng thành công!", cust);
    }

    @Transactional
    public ApiResponse<Customer> approveKyc(String customerId, String status, User currentTeller) {
        if (!"TELLER".equals(currentTeller.getRole()) && !"ADMIN".equals(currentTeller.getRole())) {
            return ApiResponse.error("Chỉ Giao dịch viên hoặc Admin mới có quyền thực hiện");
        }
        Optional<Customer> custOpt = customerRepository.findById(customerId);
        if (custOpt.isEmpty()) return ApiResponse.error("Hồ sơ khách hàng không tồn tại");

        Customer cust = custOpt.get();
        cust.setKycStatus(status);
        if ("VERIFIED".equals(status)) {
            cust.setKycVerifiedAt(LocalDateTime.now());
        }
        customerRepository.save(cust);
        return ApiResponse.ok("Xử lý duyệt eKYC thành công: " + status, cust);
    }
}
