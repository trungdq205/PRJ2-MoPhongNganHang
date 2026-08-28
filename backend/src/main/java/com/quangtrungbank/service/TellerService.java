package com.quangtrungbank.service;

import com.quangtrungbank.dto.ApiResponse;
import com.quangtrungbank.dto.CreateCustomerRequest;
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
    private final TellerRepository tellerRepository;
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final LoanRepository loanRepository;
    private final NotificationRepository notificationRepository;
    private final SavingsAccountRepository savingsAccountRepository;
    private final PasswordEncoder passwordEncoder;

    public TellerService(UserRepository userRepository,
                         TellerRepository tellerRepository,
                         CustomerRepository customerRepository,
                         AccountRepository accountRepository,
                         TransactionRepository transactionRepository,
                         LoanRepository loanRepository,
                         NotificationRepository notificationRepository,
                         SavingsAccountRepository savingsAccountRepository,
                         PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.tellerRepository = tellerRepository;
        this.customerRepository = customerRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.loanRepository = loanRepository;
        this.notificationRepository = notificationRepository;
        this.savingsAccountRepository = savingsAccountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Giao dịch viên thêm mới hồ sơ khách hàng + tài khoản thanh toán ban đầu.
     */
    @Transactional
    public ApiResponse<Customer> createCustomer(CreateCustomerRequest request, User currentTeller) {
        if (currentTeller == null) {
            currentTeller = userRepository.findByUsername("gdv1").orElseGet(() ->
                userRepository.findByRole("TELLER").stream().findFirst().orElseGet(() ->
                    userRepository.findByRole("ADMIN").stream().findFirst().orElse(null)
                )
            );
        }

        if (currentTeller != null && !"TELLER".equals(currentTeller.getRole()) && !"ADMIN".equals(currentTeller.getRole())) {
            return ApiResponse.error("Chỉ Giao dịch viên hoặc Admin mới có quyền thực hiện");
        }

        // Kiểm tra trùng CCCD/CMND
        if (request.getIdCard() != null && !request.getIdCard().isBlank()) {
            String trimmedIdCard = request.getIdCard().trim();
            if (customerRepository.findByIdCard(trimmedIdCard).isPresent()) {
                return ApiResponse.error("Số CCCD/CMND " + trimmedIdCard + " đã tồn tại trên hệ thống");
            }
        }

        // Kiểm tra trùng Số Điện Thoại
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            String trimmedPhone = request.getPhone().trim();
            if (userRepository.findByPhone(trimmedPhone).isPresent() 
                    || userRepository.findByUsername("cust_" + trimmedPhone).isPresent() 
                    || userRepository.findByUsername(trimmedPhone).isPresent()) {
                return ApiResponse.error("Số điện thoại " + trimmedPhone + " đã được đăng ký trên hệ thống");
            }
        }

        String username = "cust_" + request.getPhone().trim();
        String encodedPass = passwordEncoder.encode("Abc@1234"); // Mật khẩu mặc định bảo mật

        User user = new User(
            null,
            username,
            encodedPass,
            "CUSTOMER",
            request.getFullName().trim(),
            request.getEmail() != null && !request.getEmail().isBlank() ? request.getEmail().trim() : (username + "@quangtrungbank.com"),
            request.getPhone().trim()
        );
        userRepository.save(user);

        long count = customerRepository.count();
        String custId = "CUST-" + (1001 + count);

        Customer customer = new Customer(
            custId,
            user,
            request.getIdCard().trim(),
            request.getAddress() != null && !request.getAddress().isBlank() ? request.getAddress().trim() : "Chưa cập nhật"
        );
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
            String tellerName = currentTeller != null ? currentTeller.getFullName() : "Giao dịch viên";
            Transaction txn = new Transaction(
                CustomerService.generateNumericTxnId(),
                "NẠP TẠI QUẦY",
                "GDV: " + tellerName,
                accNo,
                request.getFullName().trim(),
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

    /**
     * Thống kê toàn diện hệ thống phục vụ màn hình Admin Dashboard trực tiếp từ CSDL
     */
    public ApiResponse<java.util.Map<String, Object>> getAdminDashboardStats(User currentUser) {
        long totalCust = customerRepository.count();
        long totalTellers = userRepository.findByRole("TELLER").size();
        long totalAccs = accountRepository.count();
        long totalTxns = transactionRepository.count();

        List<Account> allAccounts = accountRepository.findAll();
        BigDecimal totalDeposits = BigDecimal.ZERO;
        BigDecimal totalSavings = BigDecimal.ZERO;

        for (Account acc : allAccounts) {
            BigDecimal bal = acc.getBalance() != null ? acc.getBalance() : BigDecimal.ZERO;
            if ("SAVINGS".equalsIgnoreCase(acc.getType())) {
                totalSavings = totalSavings.add(bal);
            } else {
                totalDeposits = totalDeposits.add(bal);
            }
        }

        List<SavingsAccount> allSavings = savingsAccountRepository.findAll();
        for (SavingsAccount sa : allSavings) {
            if ("ACTIVE".equalsIgnoreCase(sa.getStatus()) || sa.getStatus() == null) {
                BigDecimal sBal = sa.getDepositAmount() != null ? sa.getDepositAmount() : BigDecimal.ZERO;
                totalSavings = totalSavings.add(sBal);
                totalAccs++;
            }
        }

        BigDecimal totalLiquidity = totalDeposits.add(totalSavings);

        List<Transaction> allTxns = transactionRepository.findAll();
        BigDecimal totalVolume = BigDecimal.ZERO;
        java.util.Map<String, Integer> txnTypeCounts = new java.util.HashMap<>();
        txnTypeCounts.put("TRANSFER", 0);
        txnTypeCounts.put("DEPOSIT", 0);
        txnTypeCounts.put("WITHDRAW", 0);

        for (Transaction t : allTxns) {
            if (t.getAmount() != null) {
                totalVolume = totalVolume.add(t.getAmount());
            }
            String type = t.getType() != null ? t.getType().toUpperCase() : "TRANSFER";
            txnTypeCounts.put(type, txnTypeCounts.getOrDefault(type, 0) + 1);
        }

        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("totalCustomers", totalCust);
        stats.put("totalTellers", totalTellers);
        stats.put("totalAccounts", totalAccs);
        stats.put("totalTransactions", totalTxns);
        stats.put("totalDeposits", totalDeposits);
        stats.put("totalSavings", totalSavings);
        stats.put("totalLiquidity", totalLiquidity);
        stats.put("totalVolume", totalVolume);
        stats.put("transactionTypeCounts", txnTypeCounts);

        return ApiResponse.ok("Lấy số liệu thống kê Dashboard Admin thành công", stats);
    }

    /**
     * Quản trị viên xóa vĩnh viễn tài khoản Giao dịch viên khỏi CSDL (MySQL)
     */
    @Transactional
    public ApiResponse<Object> deleteTeller(String tellerIdOrStaffCode, User currentUser) {
        if (currentUser != null && !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ApiResponse.error("Chỉ Quản trị viên hệ thống (ADMIN) mới có quyền xóa tài khoản Giao dịch viên");
        }

        if (tellerIdOrStaffCode == null || tellerIdOrStaffCode.trim().isEmpty()) {
            return ApiResponse.error("Mã hoặc ID Giao dịch viên không hợp lệ");
        }

        String searchKey = tellerIdOrStaffCode.trim();

        // 1. Tìm trong bảng tellers
        Optional<Teller> tellerOpt = tellerRepository.findById(searchKey);
        if (tellerOpt.isEmpty()) {
            tellerOpt = tellerRepository.findByStaffCode(searchKey);
        }

        User userToDelete = null;
        if (tellerOpt.isPresent()) {
            Teller teller = tellerOpt.get();
            userToDelete = teller.getUser();
            tellerRepository.delete(teller);
        }

        // 2. Nếu chưa tìm thấy qua Teller, tìm trong bảng users qua username, phone hoặc ID
        if (userToDelete == null) {
            Optional<User> userOpt = userRepository.findByUsername(searchKey);
            if (userOpt.isEmpty()) {
                userOpt = userRepository.findByPhone(searchKey);
            }
            if (userOpt.isEmpty()) {
                try {
                    Long uid = Long.parseLong(searchKey);
                    userOpt = userRepository.findById(uid);
                } catch (NumberFormatException ignored) {}
            }
            if (userOpt.isPresent() && "TELLER".equalsIgnoreCase(userOpt.get().getRole())) {
                userToDelete = userOpt.get();
                Optional<Teller> t = tellerRepository.findByUser(userToDelete);
                t.ifPresent(tellerRepository::delete);
            }
        }

        if (userToDelete != null) {
            String fullName = userToDelete.getFullName();
            String username = userToDelete.getUsername();
            userRepository.delete(userToDelete);
            return ApiResponse.ok("Đã xóa vĩnh viễn tài khoản Giao dịch viên [" + fullName + " (" + username + ")] khỏi cơ sở dữ liệu thành công!", null);
        }

        return ApiResponse.error("Không tìm thấy Giao dịch viên [" + searchKey + "] trong cơ sở dữ liệu");
    }

    private String formatMoney(BigDecimal amount) {
        if (amount == null) return "0";
        java.text.DecimalFormatSymbols symbols = new java.text.DecimalFormatSymbols();
        symbols.setGroupingSeparator('.');
        java.text.DecimalFormat df = new java.text.DecimalFormat("#,##0", symbols);
        return df.format(amount);
    }
}
