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
    private final LoanRepository loanRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;

    public TellerService(UserRepository userRepository,
                         CustomerRepository customerRepository,
                         AccountRepository accountRepository,
                         TransactionRepository transactionRepository,
                         SupportTicketRepository supportTicketRepository,
                         LoanRepository loanRepository,
                         NotificationRepository notificationRepository,
                         PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.supportTicketRepository = supportTicketRepository;
        this.loanRepository = loanRepository;
        this.notificationRepository = notificationRepository;
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
                CustomerService.generateNumericTxnId(),
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

    // ═══════════════════════════════════════════════════════════
    // NGHIỆP VỤ THẨM ĐỊNH & GIẢI NGÂN KHOẢN VAY (TELLER LOAN)
    // ═══════════════════════════════════════════════════════════

    public ApiResponse<List<Loan>> getAllLoans(User currentTeller) {
        if (currentTeller != null && !"TELLER".equalsIgnoreCase(currentTeller.getRole()) && !"ADMIN".equalsIgnoreCase(currentTeller.getRole())) {
            return ApiResponse.error("Chỉ Giao dịch viên hoặc Quản trị viên mới có quyền xem danh sách khoản vay");
        }
        List<Loan> list = loanRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "appliedAt"));
        return ApiResponse.ok("Lấy danh sách tất cả hồ sơ vay vốn thành công", list);
    }

    @Transactional
    public ApiResponse<Object> approveLoan(String loanId, String officerNote, String collateralHandoverCode, User currentTeller) {
        if (currentTeller != null && !"TELLER".equalsIgnoreCase(currentTeller.getRole()) && !"ADMIN".equalsIgnoreCase(currentTeller.getRole())) {
            return ApiResponse.error("Chỉ Giao dịch viên hoặc Quản trị viên mới có quyền phê duyệt khoản vay");
        }

        Optional<Loan> loanOpt = loanRepository.findById(loanId);
        if (loanOpt.isEmpty()) {
            loanOpt = loanRepository.findAll().stream()
                .filter(l -> loanId.equals(l.getId()) || loanId.equals(l.getContractNo()))
                .findFirst();
        }
        if (loanOpt.isEmpty()) {
            return ApiResponse.error("Hồ sơ vay không tồn tại");
        }

        Loan loan = loanOpt.get();
        if (!"PENDING".equalsIgnoreCase(loan.getStatus())) {
            return ApiResponse.error("Hồ sơ vay này đã được xử lý trước đó");
        }

        // Tìm tài khoản nhận giải ngân của khách hàng
        Optional<Account> accOpt = accountRepository.findByAccountNo(loan.getAccountNo());
        if (accOpt.isEmpty()) {
            accOpt = accountRepository.findByCustomerId(loan.getCustomerId()).stream()
                .filter(a -> "PAYMENT".equalsIgnoreCase(a.getType()) && "ACTIVE".equalsIgnoreCase(a.getStatus()))
                .findFirst();
        }
        if (accOpt.isEmpty()) {
            return ApiResponse.error("Không tìm thấy tài khoản thanh toán của khách hàng để giải ngân");
        }

        Account acc = accOpt.get();

        String tellerName = currentTeller != null ? (currentTeller.getFullName() + " (" + currentTeller.getUsername() + ")") : "Giao dịch viên";

        // Cập nhật trạng thái khoản vay
        LocalDateTime disburseTime = LocalDateTime.now();
        loan.setStatus("ACTIVE");
        loan.setApprovedBy(tellerName);
        loan.setApprovedAt(disburseTime);
        loan.setRejectionReason(null);
        loan.setInstallmentPaidCount(0);
        loan.setNextDueDate(disburseTime.toLocalDate().plusMonths(1).toString());
        loanRepository.save(loan);

        // Cộng tiền giải ngân vào tài khoản thanh toán của khách hàng
        acc.setBalance(acc.getBalance().add(loan.getPrincipalAmount()));
        accountRepository.save(acc);

        // Ghi nhận bản ghi Transaction giải ngân
        String txnId = String.valueOf(1000000000L + (long)(new Random().nextDouble() * 8999999999L));
        String contractOrId = loan.getContractNo() != null && !loan.getContractNo().isBlank() ? loan.getContractNo() : loan.getId();
        Transaction txn = new Transaction(
            txnId,
            "DISBURSE-" + loan.getId(),
            "QUỸ TÍN DỤNG QTB",
            "Ngân hàng TMCP QuangTrung (QTB)",
            acc.getAccountNo(),
            loan.getCustomerName() != null ? loan.getCustomerName() : "Khách hàng",
            loan.getPrincipalAmount(),
            BigDecimal.ZERO,
            "DEPOSIT",
            "Giải ngân hợp đồng tín dụng " + contractOrId + " - " + loan.getTitle(),
            LocalDateTime.now(),
            "SUCCESS"
        );
        transactionRepository.save(txn);

        // Đẩy thông báo biến động số dư Có (+) giải ngân về cho khách hàng
        String notifId = "NOTIF-" + System.currentTimeMillis() + "-" + (100 + new Random().nextInt(900));
        String notifMsg = "Tài khoản " + acc.getAccountNo() + " +" + formatMoney(loan.getPrincipalAmount()) + " VNĐ. Giải ngân hợp đồng tín dụng " + contractOrId + " (" + loan.getTitle() + ").";
        Notification notif = new Notification(
            notifId,
            loan.getCustomerId(),
            acc.getAccountNo(),
            "Biến động số dư Có (+)",
            notifMsg,
            loan.getPrincipalAmount(),
            acc.getBalance(),
            "MONEY_IN",
            false,
            LocalDateTime.now()
        );
        notificationRepository.save(notif);

        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("loanId", loan.getId());
        data.put("contractNo", loan.getContractNo());
        data.put("disbursedAmount", loan.getPrincipalAmount());
        data.put("accountNo", acc.getAccountNo());
        data.put("newAccountBalance", acc.getBalance());
        data.put("status", "ACTIVE");

        return ApiResponse.ok("Đã phê duyệt và GIẢI NGÂN thành công " + formatMoney(loan.getPrincipalAmount()) + " VNĐ vào tài khoản " + acc.getAccountNo() + "!", data);
    }

    @Transactional
    public ApiResponse<Object> rejectLoan(String loanId, String reason, User currentTeller) {
        if (currentTeller != null && !"TELLER".equalsIgnoreCase(currentTeller.getRole()) && !"ADMIN".equalsIgnoreCase(currentTeller.getRole())) {
            return ApiResponse.error("Chỉ Giao dịch viên hoặc Quản trị viên mới có quyền từ chối hồ sơ vay");
        }

        Optional<Loan> loanOpt = loanRepository.findById(loanId);
        if (loanOpt.isEmpty()) {
            loanOpt = loanRepository.findAll().stream()
                .filter(l -> loanId.equals(l.getId()) || loanId.equals(l.getContractNo()))
                .findFirst();
        }
        if (loanOpt.isEmpty()) {
            return ApiResponse.error("Hồ sơ vay không tồn tại");
        }

        Loan loan = loanOpt.get();
        loan.setStatus("REJECTED");
        loan.setRejectionReason(reason != null && !reason.isBlank() ? reason : "Hồ sơ chưa đạt tiêu chuẩn điều kiện tín dụng ngân hàng");
        loanRepository.save(loan);

        // Gửi thông báo từ chối cho khách hàng
        String contractOrId = loan.getContractNo() != null && !loan.getContractNo().isBlank() ? loan.getContractNo() : loan.getId();
        String notifId = "NOTIF-" + System.currentTimeMillis() + "-" + (100 + new Random().nextInt(900));
        String notifMsg = "Hồ sơ vay vốn " + contractOrId + " (" + loan.getTitle() + ") đã bị từ chối. Lý do: " + loan.getRejectionReason();
        Notification notif = new Notification(
            notifId,
            loan.getCustomerId(),
            loan.getAccountNo(),
            "Hồ sơ vay vốn bị từ chối",
            notifMsg,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            "INFO",
            false,
            LocalDateTime.now()
        );
        notificationRepository.save(notif);

        return ApiResponse.ok("Đã từ chối cấp tín dụng cho khoản vay " + contractOrId, loan);
    }

    private String formatMoney(BigDecimal amount) {
        if (amount == null) return "0";
        java.text.DecimalFormatSymbols symbols = new java.text.DecimalFormatSymbols();
        symbols.setGroupingSeparator('.');
        java.text.DecimalFormat df = new java.text.DecimalFormat("#,##0", symbols);
        return df.format(amount);
    }
}
