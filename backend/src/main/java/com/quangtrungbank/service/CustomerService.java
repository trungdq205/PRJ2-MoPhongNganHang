package com.quangtrungbank.service;

import com.quangtrungbank.dto.*;
import com.quangtrungbank.entity.*;
import com.quangtrungbank.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.Random;

/**
 * Dịch vụ Khách hàng — Tầng Nghiệp vụ (Service Layer).
 *
 * Bảo mật:
 *   - Mỗi thao tác đều kiểm tra quyền sở hữu tài khoản (Authorization)
 *   - Customer chỉ xem/thao tác được tài khoản của chính mình
 *   - ADMIN/TELLER có quyền truy cập mở rộng
 */
@Service
public class CustomerService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SupportTicketRepository supportTicketRepository;
    private final AtmCodeRepository atmCodeRepository;
    private final SavingsAccountRepository savingsAccountRepository;
    private final SavingsInterestRateRepository savingsInterestRateRepository;
    private final LoanRepository loanRepository;
    private final IdempotencyService idempotencyService;
    private final NotificationRepository notificationRepository;

    public CustomerService(AccountRepository accountRepository,
                           TransactionRepository transactionRepository,
                           CustomerRepository customerRepository,
                           UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           SupportTicketRepository supportTicketRepository,
                           AtmCodeRepository atmCodeRepository,
                           SavingsAccountRepository savingsAccountRepository,
                           SavingsInterestRateRepository savingsInterestRateRepository,
                           LoanRepository loanRepository,
                           IdempotencyService idempotencyService,
                           NotificationRepository notificationRepository) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.supportTicketRepository = supportTicketRepository;
        this.atmCodeRepository = atmCodeRepository;
        this.savingsAccountRepository = savingsAccountRepository;
        this.savingsInterestRateRepository = savingsInterestRateRepository;
        this.loanRepository = loanRepository;
        this.idempotencyService = idempotencyService;
        this.notificationRepository = notificationRepository;
    }

    // ═══════════════════════════════════════════════════════════
    // KIỂM TRA QUYỀN SỞ HỮU TÀI KHOẢN (Authorization)
    // ═══════════════════════════════════════════════════════════

    /**
     * Lấy Customer ID gắn với User đang đăng nhập.
     * Nếu user là ADMIN/TELLER thì trả null (không phải khách hàng).
     */
    private String getCustomerIdForUser(User currentUser) {
        if (currentUser == null || currentUser.getRole() == null) {
            return null;
        }
        if (!"CUSTOMER".equals(currentUser.getRole())) {
            return null; // ADMIN/TELLER không phải customer
        }
        Optional<Customer> custOpt = customerRepository.findByUserId(currentUser.getId());
        return custOpt.map(Customer::getId).orElse(null);
    }

    /**
     * Kiểm tra user có quyền truy cập customerId này không.
     *
     * Quy tắc:
     *   - CUSTOMER chỉ truy cập được dữ liệu của chính mình
     *   - ADMIN và TELLER có thể truy cập tất cả
     */
    private boolean hasAccessToCustomer(User currentUser, String requestedCustomerId) {
        if ("ADMIN".equals(currentUser.getRole()) || "TELLER".equals(currentUser.getRole())) {
            return true; // Nhân viên ngân hàng có quyền truy cập
        }
        String myCustomerId = getCustomerIdForUser(currentUser);
        return myCustomerId != null && myCustomerId.equals(requestedCustomerId);
    }

    /**
     * Kiểm tra user có quyền thao tác trên tài khoản (theo accountNo) không.
     */
    private boolean hasAccessToAccount(User currentUser, String accountNo) {
        if (currentUser == null || currentUser.getRole() == null || accountNo == null || accountNo.isBlank()) {
            return false;
        }
        if ("ADMIN".equals(currentUser.getRole()) || "TELLER".equals(currentUser.getRole())) {
            return true;
        }
        String myCustomerId = getCustomerIdForUser(currentUser);
        if (myCustomerId == null) return false;

        // Kiểm tra accountNo có thuộc về customerId này không
        List<Account> myAccounts = accountRepository.findByCustomerId(myCustomerId);
        return myAccounts.stream().anyMatch(a -> a.getAccountNo().equals(accountNo));
    }

    // ═══════════════════════════════════════════════════════════
    // NGHIỆP VỤ KHÁCH HÀNG
    // ═══════════════════════════════════════════════════════════

    /**
     * Lấy danh sách tài khoản của khách hàng (có kiểm tra quyền).
     */
    public ApiResponse<List<Account>> getAccounts(String customerId, User currentUser) {
        if (!hasAccessToCustomer(currentUser, customerId)) {
            return ApiResponse.error("Bạn không có quyền truy cập tài khoản của khách hàng này");
        }
        List<Account> accounts = accountRepository.findByCustomerId(customerId);
        return ApiResponse.ok("Lấy danh sách tài khoản thành công", accounts);
    }

    /**
     * Chuyển khoản (có kiểm tra quyền sở hữu tài khoản nguồn).
     */
    /**
     * Chuyển khoản (có Idempotency + kiểm tra quyền sở hữu tài khoản nguồn).
     */
    /**
     * Chuyển khoản (có Idempotency + kiểm tra quyền sở hữu tài khoản nguồn).
     */
    @Transactional
    public ApiResponse<Transaction> transfer(TransferRequest request, User currentUser) {
        return transfer(request, currentUser, request.getIdempotencyKey());
    }

    @Transactional
    public ApiResponse<Transaction> transfer(TransferRequest request, User currentUser, String idempotencyKey) {
        String key = (idempotencyKey != null && !idempotencyKey.isBlank()) ? idempotencyKey : request.getIdempotencyKey();
        Long userId = currentUser != null ? currentUser.getId() : null;

        if (key != null && !key.isBlank()) {
            IdempotencyService.IdempotencyCheckResult<Transaction> check =
                idempotencyService.validateAndLock(key, userId, "/api/customer/transfer", request, Transaction.class);
            if (check.isReplayed()) {
                return check.getCachedResponse();
            }
            if (check.isInProgress()) {
                return ApiResponse.error(check.getErrorMessage());
            }
            if (check.isError()) {
                return ApiResponse.error(check.getErrorMessage());
            }
        }

        try {
            ApiResponse<Transaction> response = executeTransfer(request, currentUser, key);
            if (key != null && !key.isBlank()) {
                if (response.isSuccess()) {
                    idempotencyService.markCompleted(key, response);
                } else {
                    idempotencyService.markFailedOrRelease(key);
                }
            }
            return response;
        } catch (Exception e) {
            if (key != null && !key.isBlank()) {
                idempotencyService.markFailedOrRelease(key);
            }
            throw e;
        }
    }

    @Transactional
    public ApiResponse<Transaction> executeTransfer(TransferRequest request, User currentUser, String idempotencyKey) {
        if (currentUser == null) {
            return ApiResponse.error("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại trước khi chuyển tiền.");
        }

        if (request == null || request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return ApiResponse.error("Số tiền chuyển không hợp lệ");
        }

        if (request.getFromAccNo() == null || request.getFromAccNo().isBlank() ||
            request.getToAccNo() == null || request.getToAccNo().isBlank()) {
            return ApiResponse.error("Vui lòng chọn tài khoản nguồn và điền tài khoản người nhận");
        }

        String fromAccNo = request.getFromAccNo().trim();
        String toAccNo = request.getToAccNo().trim();

        if (fromAccNo.equalsIgnoreCase(toAccNo)) {
            return ApiResponse.error("Tài khoản nhận không được trùng với tài khoản chuyển");
        }

        // Kiểm tra quyền: user phải sở hữu tài khoản nguồn
        if (!hasAccessToAccount(currentUser, fromAccNo)) {
            return ApiResponse.error("Bạn không có quyền chuyển tiền từ tài khoản này");
        }

        // Sắp xếp thứ tự lock để tránh deadlock
        String firstAccNo = fromAccNo.compareTo(toAccNo) <= 0 ? fromAccNo : toAccNo;
        String secondAccNo = fromAccNo.compareTo(toAccNo) <= 0 ? toAccNo : fromAccNo;

        Optional<Account> firstOpt = accountRepository.findByAccountNoForUpdate(firstAccNo);
        Optional<Account> secondOpt = accountRepository.findByAccountNoForUpdate(secondAccNo);

        if (firstOpt.isEmpty() || secondOpt.isEmpty()) {
            if (firstOpt.isEmpty() && firstAccNo.equals(fromAccNo)) return ApiResponse.error("Tài khoản nguồn không tồn tại");
            if (secondOpt.isEmpty() && secondAccNo.equals(fromAccNo)) return ApiResponse.error("Tài khoản nguồn không tồn tại");
            return ApiResponse.error("Tài khoản người nhận không tồn tại");
        }

        Account source = fromAccNo.equals(firstAccNo) ? firstOpt.get() : secondOpt.get();
        Account target = toAccNo.equals(firstAccNo) ? firstOpt.get() : secondOpt.get();

        if (!"ACTIVE".equalsIgnoreCase(source.getStatus())) {
            return ApiResponse.error("Tài khoản chuyển đang bị tạm khóa hoặc không hoạt động");
        }

        if (!"ACTIVE".equalsIgnoreCase(target.getStatus())) {
            return ApiResponse.error("Tài khoản người nhận đang tạm khóa hoặc không hoạt động");
        }

        if ("SAVINGS".equalsIgnoreCase(source.getType())) {
            return ApiResponse.error("Tài khoản tiết kiệm không được phép dùng làm tài khoản nguồn chuyển tiền. Vui lòng sử dụng Tài khoản thanh toán.");
        }

        if ("SAVINGS".equalsIgnoreCase(target.getType())) {
            return ApiResponse.error("Tài khoản nhận là tài khoản tiết kiệm, không thể nhận chuyển khoản trực tiếp. Vui lòng sử dụng tính năng Gửi tiết kiệm.");
        }

        if (source.getBalance().compareTo(request.getAmount()) < 0) {
            return ApiResponse.error("Số dư tài khoản không đủ để thực hiện giao dịch");
        }

        // Cập nhật biến động số dư
        source.setBalance(source.getBalance().subtract(request.getAmount()));
        target.setBalance(target.getBalance().add(request.getAmount()));

        accountRepository.save(source);
        accountRepository.save(target);

        String fromName = getFullNameForAccount(source);
        String toName = getFullNameForAccount(target);

        // Ghi nhận giao dịch
        String txnId = "TXN-" + System.currentTimeMillis() + (100 + new Random().nextInt(900));
        Transaction txn = new Transaction(
            txnId,
            idempotencyKey,
            source.getAccountNo(),
            fromName,
            target.getAccountNo(),
            toName,
            request.getAmount(),
            BigDecimal.ZERO,
            "TRANSFER",
            request.getContent() != null ? request.getContent() : "Chuyển tiền nhanh QuangTrung Bank",
            LocalDateTime.now(),
            "SUCCESS"
        );

        transactionRepository.save(txn);

        pushBalanceNotification(source.getCustomerId(), source.getAccountNo(), "Biến động số dư Nợ (-)", "Tài khoản " + source.getAccountNo() + " -" + formatMoney(request.getAmount()) + " VNĐ. Tới: " + toName + " (" + target.getAccountNo() + "). Nội dung: " + txn.getContent(), request.getAmount(), source.getBalance(), "MONEY_OUT");
        pushBalanceNotification(target.getCustomerId(), target.getAccountNo(), "Biến động số dư Có (+)", "Tài khoản " + target.getAccountNo() + " +" + formatMoney(request.getAmount()) + " VNĐ. Từ: " + fromName + " (" + source.getAccountNo() + "). Nội dung: " + txn.getContent(), request.getAmount(), target.getBalance(), "MONEY_IN");

        return ApiResponse.ok("Chuyển tiền thành công!", txn);
    }

    private String getFullNameForAccount(Account acc) {
        if (acc == null || acc.getCustomerId() == null) return "Chủ TK";
        Optional<Customer> custOpt = customerRepository.findById(acc.getCustomerId());
        if (custOpt.isPresent()) {
            Customer cust = custOpt.get();
            if (cust.getUser() != null && cust.getUser().getFullName() != null && !cust.getUser().getFullName().isBlank()) {
                return cust.getUser().getFullName();
            }
            if (cust.getUser() != null && cust.getUser().getId() != null) {
                Optional<User> uOpt = userRepository.findById(cust.getUser().getId());
                if (uOpt.isPresent() && uOpt.get().getFullName() != null) {
                    return uOpt.get().getFullName();
                }
            }
        }
        return "Chủ TK " + acc.getAccountNo();
    }

    /**
     * Nạp tiền ATM (có Idempotency + kiểm tra quyền).
     */
    @Transactional
    public ApiResponse<Transaction> atmDeposit(AtmTransactionRequest request, User currentUser) {
        return atmDeposit(request, currentUser, request.getIdempotencyKey());
    }

    @Transactional
    public ApiResponse<Transaction> atmDeposit(AtmTransactionRequest request, User currentUser, String idempotencyKey) {
        String key = (idempotencyKey != null && !idempotencyKey.isBlank()) ? idempotencyKey : request.getIdempotencyKey();
        Long userId = currentUser != null ? currentUser.getId() : null;

        if (key != null && !key.isBlank()) {
            IdempotencyService.IdempotencyCheckResult<Transaction> check =
                idempotencyService.validateAndLock(key, userId, "/api/customer/atm/deposit", request, Transaction.class);
            if (check.isReplayed()) return check.getCachedResponse();
            if (check.isInProgress()) return ApiResponse.error(check.getErrorMessage());
            if (check.isError()) return ApiResponse.error(check.getErrorMessage());
        }

        try {
            ApiResponse<Transaction> response = executeAtmDeposit(request, currentUser, key);
            if (key != null && !key.isBlank()) {
                if (response.isSuccess()) idempotencyService.markCompleted(key, response);
                else idempotencyService.markFailedOrRelease(key);
            }
            return response;
        } catch (Exception e) {
            if (key != null && !key.isBlank()) idempotencyService.markFailedOrRelease(key);
            throw e;
        }
    }

    @Transactional
    public ApiResponse<Transaction> executeAtmDeposit(AtmTransactionRequest request, User currentUser, String idempotencyKey) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return ApiResponse.error("Số tiền nạp không hợp lệ");
        }

        if (!hasAccessToAccount(currentUser, request.getAccountNo())) {
            return ApiResponse.error("Bạn không có quyền nạp tiền vào tài khoản này");
        }

        Optional<Account> accOpt = accountRepository.findByAccountNoForUpdate(request.getAccountNo());
        if (accOpt.isEmpty()) return ApiResponse.error("Tài khoản không tồn tại");

        Account acc = accOpt.get();
        acc.setBalance(acc.getBalance().add(request.getAmount()));
        accountRepository.save(acc);

        String toName = getFullNameForAccount(acc);
        String txnId = "ATM-DEP-" + System.currentTimeMillis() + (100 + new Random().nextInt(900));
        Transaction txn = new Transaction(
            txnId, idempotencyKey, "MÁY ATM", "Nạp tiền mặt ATM",
            acc.getAccountNo(), toName,
            request.getAmount(), BigDecimal.ZERO,
            "DEPOSIT", "Nạp tiền mặt tại cây ATM QuangTrung Bank",
            LocalDateTime.now(), "SUCCESS"
        );

        transactionRepository.save(txn);
        return ApiResponse.ok("Nạp tiền ATM thành công!", txn);
    }

    /**
     * Rút tiền ATM (có Idempotency + kiểm tra quyền).
     */
    @Transactional
    public ApiResponse<Transaction> atmWithdraw(AtmTransactionRequest request, User currentUser) {
        return atmWithdraw(request, currentUser, request.getIdempotencyKey());
    }

    @Transactional
    public ApiResponse<Transaction> atmWithdraw(AtmTransactionRequest request, User currentUser, String idempotencyKey) {
        String key = (idempotencyKey != null && !idempotencyKey.isBlank()) ? idempotencyKey : request.getIdempotencyKey();
        Long userId = currentUser != null ? currentUser.getId() : null;

        if (key != null && !key.isBlank()) {
            IdempotencyService.IdempotencyCheckResult<Transaction> check =
                idempotencyService.validateAndLock(key, userId, "/api/customer/atm/withdraw", request, Transaction.class);
            if (check.isReplayed()) return check.getCachedResponse();
            if (check.isInProgress()) return ApiResponse.error(check.getErrorMessage());
            if (check.isError()) return ApiResponse.error(check.getErrorMessage());
        }

        try {
            ApiResponse<Transaction> response = executeAtmWithdraw(request, currentUser, key);
            if (key != null && !key.isBlank()) {
                if (response.isSuccess()) idempotencyService.markCompleted(key, response);
                else idempotencyService.markFailedOrRelease(key);
            }
            return response;
        } catch (Exception e) {
            if (key != null && !key.isBlank()) idempotencyService.markFailedOrRelease(key);
            throw e;
        }
    }

    @Transactional
    public ApiResponse<Transaction> executeAtmWithdraw(AtmTransactionRequest request, User currentUser, String idempotencyKey) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return ApiResponse.error("Số tiền rút không hợp lệ");
        }

        if (!hasAccessToAccount(currentUser, request.getAccountNo())) {
            return ApiResponse.error("Bạn không có quyền rút tiền từ tài khoản này");
        }

        Optional<Account> accOpt = accountRepository.findByAccountNoForUpdate(request.getAccountNo());
        if (accOpt.isEmpty()) return ApiResponse.error("Tài khoản không tồn tại");

        Account acc = accOpt.get();
        if (acc.getBalance().compareTo(request.getAmount()) < 0) {
            return ApiResponse.error("Số dư tài khoản không đủ để rút tiền");
        }

        acc.setBalance(acc.getBalance().subtract(request.getAmount()));
        accountRepository.save(acc);

        String fromName = getFullNameForAccount(acc);
        String txnId = "ATM-WDR-" + System.currentTimeMillis() + (100 + new Random().nextInt(900));
        Transaction txn = new Transaction(
            txnId, idempotencyKey, acc.getAccountNo(), fromName,
            "MÁY ATM", "Rút tiền mặt ATM",
            request.getAmount(), BigDecimal.ZERO,
            "WITHDRAW", "Rút tiền mặt tại cây ATM QuangTrung Bank",
            LocalDateTime.now(), "SUCCESS"
        );

        transactionRepository.save(txn);
        return ApiResponse.ok("Rút tiền ATM thành công!", txn);
    }

    /**
     * Lấy lịch sử giao dịch (có kiểm tra quyền).
     */
    public ApiResponse<List<Transaction>> getHistory(String accountNo, User currentUser) {
        if (!hasAccessToAccount(currentUser, accountNo)) {
            return ApiResponse.error("Bạn không có quyền xem lịch sử giao dịch của tài khoản này");
        }
        List<Transaction> history = transactionRepository.findByFromAccountOrToAccountOrderByTimestampDesc(accountNo, accountNo);
        return ApiResponse.ok("Lấy lịch sử giao dịch thành công", history);
    }

    /**
     * Lấy lịch sử giao dịch có bộ lọc nâng cao (Khoảng ngày, Loại giao dịch, Khoảng số tiền, Từ khóa) & Phân trang.
     */
    public ApiResponse<PageResult<Transaction>> getHistoryFiltered(
            String accountNo,
            String fromDate,
            String toDate,
            String type,
            BigDecimal minAmount,
            BigDecimal maxAmount,
            String search,
            int page,
            int size,
            User currentUser) {

        String customerId = getCustomerIdForUser(currentUser);
        if (customerId == null && !"ADMIN".equals(currentUser.getRole()) && !"TELLER".equals(currentUser.getRole())) {
            return ApiResponse.error("Không tìm thấy thông tin khách hàng");
        }

        // Lấy danh sách tài khoản thuộc khách hàng
        List<String> myAccountNos;
        if ("ADMIN".equals(currentUser.getRole()) || "TELLER".equals(currentUser.getRole())) {
            if (accountNo != null && !accountNo.isBlank()) {
                myAccountNos = List.of(accountNo.trim());
            } else {
                myAccountNos = null;
            }
        } else {
            List<Account> accounts = accountRepository.findByCustomerId(customerId);
            List<String> userAccs = accounts.stream().map(Account::getAccountNo).collect(java.util.stream.Collectors.toList());
            List<SavingsAccount> savings = savingsAccountRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(customerId, "ACTIVE");
            userAccs.addAll(savings.stream().map(SavingsAccount::getSavingsNo).collect(java.util.stream.Collectors.toList()));

            if (accountNo != null && !accountNo.isBlank() && !"ALL".equalsIgnoreCase(accountNo.trim())) {
                String target = accountNo.trim();
                if (!userAccs.contains(target)) {
                    return ApiResponse.error("Bạn không có quyền truy cập lịch sử giao dịch của tài khoản này");
                }
                myAccountNos = List.of(target);
            } else {
                myAccountNos = userAccs;
            }
        }

        org.springframework.data.jpa.domain.Specification<Transaction> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();

            if (myAccountNos != null && !myAccountNos.isEmpty()) {
                predicates.add(cb.or(
                    root.get("fromAccount").in(myAccountNos),
                    root.get("toAccount").in(myAccountNos)
                ));
            }

            if (fromDate != null && !fromDate.isBlank()) {
                try {
                    java.time.LocalDateTime start = java.time.LocalDate.parse(fromDate.trim()).atStartOfDay();
                    predicates.add(cb.greaterThanOrEqualTo(root.get("timestamp"), start));
                } catch (Exception ignored) {}
            }

            if (toDate != null && !toDate.isBlank()) {
                try {
                    java.time.LocalDateTime end = java.time.LocalDate.parse(toDate.trim()).atTime(23, 59, 59);
                    predicates.add(cb.lessThanOrEqualTo(root.get("timestamp"), end));
                } catch (Exception ignored) {}
            }

            if (type != null && !type.isBlank() && !"ALL".equalsIgnoreCase(type.trim())) {
                predicates.add(cb.equal(cb.upper(root.get("type")), type.trim().toUpperCase()));
            }

            if (minAmount != null && minAmount.compareTo(BigDecimal.ZERO) >= 0) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("amount"), minAmount));
            }

            if (maxAmount != null && maxAmount.compareTo(BigDecimal.ZERO) > 0) {
                predicates.add(cb.lessThanOrEqualTo(root.get("amount"), maxAmount));
            }

            if (search != null && !search.isBlank()) {
                String kw = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("id")), kw),
                    cb.like(cb.lower(root.get("content")), kw),
                    cb.like(cb.lower(root.get("fromName")), kw),
                    cb.like(cb.lower(root.get("toName")), kw),
                    cb.like(cb.lower(root.get("fromAccount")), kw),
                    cb.like(cb.lower(root.get("toAccount")), kw)
                ));
            }

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        int pageNum = Math.max(0, page);
        int pageSize = (size <= 0) ? 10 : Math.min(size, 100);
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
            pageNum, pageSize, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "timestamp")
        );

        org.springframework.data.domain.Page<Transaction> pageRes = transactionRepository.findAll(spec, pageable);
        PageResult<Transaction> result = new PageResult<>(
            pageRes.getContent(),
            pageRes.getNumber(),
            pageRes.getSize(),
            pageRes.getTotalElements(),
            pageRes.getTotalPages()
        );

        return ApiResponse.ok("Lấy lịch sử giao dịch thành công", result);
    }

    /**
     * Tạo dữ liệu sao kê tài khoản điện tử (E-Statement) theo khoảng thời gian.
     */
    public ApiResponse<StatementResponse> getEStatement(String accountNo, String fromDate, String toDate, User currentUser) {
        if (accountNo == null || accountNo.isBlank()) {
            return ApiResponse.error("Vui lòng chỉ định số tài khoản cần in sao kê");
        }

        if (!hasAccessToAccount(currentUser, accountNo)) {
            return ApiResponse.error("Bạn không có quyền xem sao kê của tài khoản này");
        }

        Optional<Account> accOpt = accountRepository.findByAccountNo(accountNo);
        String customerName = currentUser != null ? currentUser.getFullName() : "KHÁCH HÀNG";
        String idCard = "-";
        String phone = currentUser != null ? currentUser.getPhone() : "-";
        BigDecimal balance = BigDecimal.ZERO;
        String accountType = "PAYMENT";

        if (accOpt.isPresent()) {
            Account acc = accOpt.get();
            balance = acc.getBalance();
            accountType = acc.getType();
            Optional<Customer> custOpt = customerRepository.findById(acc.getCustomerId());
            if (custOpt.isPresent()) {
                idCard = custOpt.get().getIdCard();
                if (custOpt.get().getUser() != null) {
                    customerName = custOpt.get().getUser().getFullName();
                    phone = custOpt.get().getUser().getPhone();
                }
            }
        }

        List<Transaction> allTxns = transactionRepository.findByFromAccountOrToAccountOrderByTimestampDesc(accountNo, accountNo);

        LocalDateTime start = (fromDate != null && !fromDate.isBlank())
            ? LocalDate.parse(fromDate.trim()).atStartOfDay()
            : LocalDateTime.now().minusDays(30);

        LocalDateTime end = (toDate != null && !toDate.isBlank())
            ? LocalDate.parse(toDate.trim()).atTime(23, 59, 59)
            : LocalDateTime.now();

        List<Transaction> filtered = allTxns.stream().filter(t -> {
            LocalDateTime ts = t.getTimestamp();
            return ts != null && !ts.isBefore(start) && !ts.isAfter(end);
        }).collect(java.util.stream.Collectors.toList());

        BigDecimal totalIn = BigDecimal.ZERO;
        BigDecimal totalOut = BigDecimal.ZERO;

        for (Transaction t : filtered) {
            if (accountNo.equals(t.getToAccount())) {
                totalIn = totalIn.add(t.getAmount());
            } else if (accountNo.equals(t.getFromAccount())) {
                totalOut = totalOut.add(t.getAmount());
            }
        }

        String statementRef = "ESTM-" + (100000 + new Random().nextInt(900000));
        String generatedAt = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));

        StatementResponse response = new StatementResponse(
            statementRef,
            customerName,
            idCard,
            phone,
            accountNo,
            accountType,
            balance,
            start.toLocalDate().toString(),
            end.toLocalDate().toString(),
            totalIn,
            totalOut,
            generatedAt,
            filtered
        );

        return ApiResponse.ok("Tạo sao kê điện tử thành công", response);
    }

    /**
     * Cập nhật thông tin liên hệ (Email).
     * Thông tin nhân thân (SĐT, Địa chỉ, Họ tên, CCCD) bị khóa, chỉ có thể sửa trực tiếp tại quầy giao dịch.
     */
    @Transactional
    public ApiResponse<User> updateProfile(UpdateProfileRequest request, User currentUser) {
        if (currentUser == null) {
            return ApiResponse.error("Phiên làm việc không hợp lệ");
        }

        Optional<User> userOpt = userRepository.findById(currentUser.getId());
        if (userOpt.isEmpty()) {
            return ApiResponse.error("Không tìm thấy người dùng trong hệ thống");
        }

        User user = userOpt.get();

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String newEmail = request.getEmail().trim();
            Optional<User> existingEmailUser = userRepository.findByEmail(newEmail);
            if (existingEmailUser.isPresent() && !existingEmailUser.get().getId().equals(user.getId())) {
                return ApiResponse.error("Địa chỉ Email này đã được sử dụng bởi tài khoản khác trong hệ thống");
            }
            user.setEmail(newEmail);
        }

        userRepository.saveAndFlush(user);

        return ApiResponse.ok("Cập nhật thông tin liên lạc thành công!", user);
    }

    /**
     * Sửa đổi mật khẩu với xác minh bảo mật nhiều lớp.
     * Tầng nghiệp vụ kiểm tra mật khẩu hiện tại bằng BCrypt Encoder.
     */
    @Transactional
    public ApiResponse<String> changePassword(ChangePasswordRequest request, User currentUser) {
        if (currentUser == null) {
            return ApiResponse.error("Phiên làm việc không hợp lệ");
        }

        Optional<User> userOpt = userRepository.findById(currentUser.getId());
        if (userOpt.isEmpty()) {
            return ApiResponse.error("Không tìm thấy người dùng trong hệ thống");
        }

        User user = userOpt.get();

        // 1. Xác minh Mật khẩu hiện tại
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            return ApiResponse.error("Mật khẩu hiện tại không chính xác. Vui lòng thử lại.");
        }

        // 2. Kiểm tra mật khẩu mới và xác nhận mật khẩu
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            return ApiResponse.error("Xác nhận mật khẩu mới không trùng khớp với mật khẩu mới");
        }

        // 3. Kiểm tra mật khẩu mới trùng mật khẩu cũ
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            return ApiResponse.error("Mật khẩu mới không được trùng với mật khẩu hiện tại");
        }

        // 4. Mã hóa và lưu mật khẩu mới
        user.setPassword(passwordEncoder.encode(request.getNewPassword().trim()));
        userRepository.save(user);

        return ApiResponse.ok("Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới của quý khách.");
    }

    // ═══════════════════════════════════════════════════════════
    // GỬI HỖ TRỢ / KHIẾU NẠI (Support Tickets)
    // ═══════════════════════════════════════════════════════════

    /**
     * Tạo yêu cầu hỗ trợ / khiếu nại mới.
     */
    @Transactional
    public ApiResponse<SupportTicket> createTicket(CreateTicketRequest request, User currentUser) {
        String myCustId = getCustomerIdForUser(currentUser);
        if (myCustId == null) {
            return ApiResponse.error("Không tìm thấy thông tin hồ sơ khách hàng");
        }

        String ticketId = "TCK-" + System.currentTimeMillis() + (10 + new Random().nextInt(90));
        SupportTicket ticket = new SupportTicket(
            ticketId,
            myCustId,
            currentUser.getFullName(),
            request.getAccountNo() != null ? request.getAccountNo() : "N/A",
            request.getSubject(),
            request.getContent(),
            "PENDING",
            "Tự động phân công",
            "",
            LocalDateTime.now()
        );

        supportTicketRepository.save(ticket);
        return ApiResponse.ok("Đã gửi yêu cầu hỗ trợ thành công. Giao dịch viên sẽ phản hồi sớm nhất!", ticket);
    }

    /**
     * Lấy danh sách yêu cầu hỗ trợ của khách hàng.
     */
    public ApiResponse<List<SupportTicket>> getTickets(User currentUser) {
        String myCustId = getCustomerIdForUser(currentUser);
        if (myCustId == null && !"ADMIN".equals(currentUser.getRole()) && !"TELLER".equals(currentUser.getRole())) {
            return ApiResponse.error("Không có quyền truy cập");
        }

        List<SupportTicket> tickets;
        if ("ADMIN".equals(currentUser.getRole()) || "TELLER".equals(currentUser.getRole())) {
            tickets = supportTicketRepository.findAllByOrderByCreatedAtDesc();
        } else {
            tickets = supportTicketRepository.findByCustomerIdOrderByCreatedAtDesc(myCustId);
        }
        return ApiResponse.ok("Lấy danh sách yêu cầu hỗ trợ thành công", tickets);
    }

    // ═══════════════════════════════════════════════════════════
    // MÃ ATM KHÔNG DÙNG THẺ (Cardless ATM Codes)
    // ═══════════════════════════════════════════════════════════

    /**
     * Khởi tạo mã ATM 6 chữ số không dùng thẻ.
     */
    @Transactional
    public ApiResponse<AtmCode> createAtmCode(CreateAtmCodeRequest request, User currentUser) {
        String myCustId = getCustomerIdForUser(currentUser);
        if (myCustId == null) {
            return ApiResponse.error("Không tìm thấy thông tin khách hàng");
        }

        if (!hasAccessToAccount(currentUser, request.getAccountNo())) {
            return ApiResponse.error("Bạn không có quyền thao tác trên tài khoản này");
        }

        if ("WITHDRAW".equals(request.getType())) {
            Optional<Account> accOpt = accountRepository.findByAccountNo(request.getAccountNo());
            if (accOpt.isEmpty()) return ApiResponse.error("Tài khoản không tồn tại");
            if (accOpt.get().getBalance().compareTo(request.getAmount()) < 0) {
                return ApiResponse.error("Số dư không đủ để khởi tạo mã rút tiền");
            }
        }

        String digits = String.format("%06d", new Random().nextInt(1000000));
        String atmId = "ATMC-" + digits;

        AtmCode code = new AtmCode(
            atmId,
            digits,
            myCustId,
            request.getAccountNo(),
            request.getType(),
            request.getAmount(),
            request.getPin() != null ? request.getPin() : "1234",
            "PENDING",
            LocalDateTime.now(),
            null
        );

        atmCodeRepository.save(code);
        String label = "WITHDRAW".equals(request.getType()) ? "RÚT TIỀN" : "NẠP TIỀN";
        return ApiResponse.ok(String.format("Tạo mã %s ATM thành công! Mã xác thực: %s", label, digits), code);
    }

    /**
     * Lấy danh sách mã ATM của khách hàng.
     */
    public ApiResponse<List<AtmCode>> getAtmCodes(User currentUser) {
        String myCustId = getCustomerIdForUser(currentUser);
        if (myCustId == null) {
            return ApiResponse.error("Không tìm thấy thông tin khách hàng");
        }
        List<AtmCode> codes = atmCodeRepository.findByCustomerIdOrderByCreatedAtDesc(myCustId);
        return ApiResponse.ok("Lấy danh sách mã ATM thành công", codes);
    }

    /**
     * Hủy mã ATM chưa sử dụng.
     */
    @Transactional
    public ApiResponse<String> cancelAtmCode(String codeId, User currentUser) {
        Optional<AtmCode> codeOpt = atmCodeRepository.findById(codeId);
        if (codeOpt.isEmpty()) {
            codeOpt = atmCodeRepository.findByCode(codeId);
        }
        if (codeOpt.isEmpty()) return ApiResponse.error("Mã ATM không tồn tại");

        AtmCode code = codeOpt.get();
        if (!"PENDING".equals(code.getStatus())) {
            return ApiResponse.error("Chỉ có thể hủy mã đang ở trạng thái Chờ sử dụng");
        }

        code.setStatus("CANCELLED");
        atmCodeRepository.save(code);
        return ApiResponse.ok("Đã hủy thành công mã ATM " + code.getCode(), code.getCode());
    }

    // ═══════════════════════════════════════════════════════════
    // RÚT / CHUYỂN TIỀN MẶT VNPOST (VNPOST Cash Services)
    // ═══════════════════════════════════════════════════════════

    /**
     * Rút tiền mặt VNPOST (có Idempotency).
     */
    public ApiResponse<Transaction> vnpostWithdraw(TransferRequest request, User currentUser) {
        return vnpostWithdraw(request, currentUser, request.getIdempotencyKey());
    }

    public ApiResponse<Transaction> vnpostWithdraw(TransferRequest request, User currentUser, String idempotencyKey) {
        String key = (idempotencyKey != null && !idempotencyKey.isBlank()) ? idempotencyKey : request.getIdempotencyKey();
        Long userId = currentUser != null ? currentUser.getId() : null;

        if (key != null && !key.isBlank()) {
            IdempotencyService.IdempotencyCheckResult<Transaction> check =
                idempotencyService.validateAndLock(key, userId, "/api/customer/vnpost/withdraw", request, Transaction.class);
            if (check.isReplayed()) return check.getCachedResponse();
            if (check.isInProgress()) return ApiResponse.error(check.getErrorMessage());
            if (check.isError()) return ApiResponse.error(check.getErrorMessage());
        }

        try {
            ApiResponse<Transaction> response = executeVnpostWithdraw(request, currentUser, key);
            if (key != null && !key.isBlank()) {
                if (response.isSuccess()) idempotencyService.markCompleted(key, response);
                else idempotencyService.markFailedOrRelease(key);
            }
            return response;
        } catch (Exception e) {
            if (key != null && !key.isBlank()) idempotencyService.markFailedOrRelease(key);
            throw e;
        }
    }

    @Transactional
    public ApiResponse<Transaction> executeVnpostWithdraw(TransferRequest request, User currentUser, String idempotencyKey) {
        if (!hasAccessToAccount(currentUser, request.getFromAccNo())) {
            return ApiResponse.error("Bạn không có quyền trích tiền từ tài khoản này");
        }

        Optional<Account> accOpt = accountRepository.findByAccountNoForUpdate(request.getFromAccNo());
        if (accOpt.isEmpty()) return ApiResponse.error("Tài khoản không tồn tại");

        Account acc = accOpt.get();
        if (acc.getBalance().compareTo(request.getAmount()) < 0) {
            return ApiResponse.error("Số dư tài khoản không đủ");
        }

        acc.setBalance(acc.getBalance().subtract(request.getAmount()));
        accountRepository.save(acc);

        String code = "VNPOST-W-" + (100000 + new Random().nextInt(900000));
        String txnId = "TXN-" + System.currentTimeMillis() + (100 + new Random().nextInt(900));

        Transaction txn = new Transaction(
            txnId,
            idempotencyKey,
            acc.getAccountNo(),
            currentUser.getFullName(),
            "VNPOST CASH POST OFFICE",
            "Bưu cục VNPOST",
            request.getAmount(),
            BigDecimal.ZERO,
            "WITHDRAW",
            "Rút tiền mặt tại bưu cục VNPOST (Mã: " + code + ")",
            LocalDateTime.now(),
            "SUCCESS"
        );

        transactionRepository.save(txn);
        return ApiResponse.ok("Đã tạo mã rút tiền mặt VNPOST thành công! Mã: " + code, txn);
    }

    /**
     * Chuyển tiền mặt VNPOST (có Idempotency).
     */
    public ApiResponse<Transaction> vnpostTransfer(TransferRequest request, User currentUser) {
        return vnpostTransfer(request, currentUser, request.getIdempotencyKey());
    }

    public ApiResponse<Transaction> vnpostTransfer(TransferRequest request, User currentUser, String idempotencyKey) {
        String key = (idempotencyKey != null && !idempotencyKey.isBlank()) ? idempotencyKey : request.getIdempotencyKey();
        Long userId = currentUser != null ? currentUser.getId() : null;

        if (key != null && !key.isBlank()) {
            IdempotencyService.IdempotencyCheckResult<Transaction> check =
                idempotencyService.validateAndLock(key, userId, "/api/customer/vnpost/transfer", request, Transaction.class);
            if (check.isReplayed()) return check.getCachedResponse();
            if (check.isInProgress()) return ApiResponse.error(check.getErrorMessage());
            if (check.isError()) return ApiResponse.error(check.getErrorMessage());
        }

        try {
            ApiResponse<Transaction> response = executeVnpostTransfer(request, currentUser, key);
            if (key != null && !key.isBlank()) {
                if (response.isSuccess()) idempotencyService.markCompleted(key, response);
                else idempotencyService.markFailedOrRelease(key);
            }
            return response;
        } catch (Exception e) {
            if (key != null && !key.isBlank()) idempotencyService.markFailedOrRelease(key);
            throw e;
        }
    }

    @Transactional
    public ApiResponse<Transaction> executeVnpostTransfer(TransferRequest request, User currentUser, String idempotencyKey) {
        if (!hasAccessToAccount(currentUser, request.getFromAccNo())) {
            return ApiResponse.error("Bạn không có quyền trích tiền từ tài khoản này");
        }

        Optional<Account> accOpt = accountRepository.findByAccountNoForUpdate(request.getFromAccNo());
        if (accOpt.isEmpty()) return ApiResponse.error("Tài khoản không tồn tại");

        Account acc = accOpt.get();
        if (acc.getBalance().compareTo(request.getAmount()) < 0) {
            return ApiResponse.error("Số dư tài khoản không đủ");
        }

        acc.setBalance(acc.getBalance().subtract(request.getAmount()));
        accountRepository.save(acc);

        String code = "VNPOST-T-" + (100000 + new Random().nextInt(900000));
        String txnId = "TXN-" + System.currentTimeMillis() + (100 + new Random().nextInt(900));

        Transaction txn = new Transaction(
            txnId,
            idempotencyKey,
            acc.getAccountNo(),
            currentUser.getFullName(),
            request.getToAccNo() != null ? request.getToAccNo() : "VNPOST CASH",
            "Người nhận tiền mặt VNPOST",
            request.getAmount(),
            BigDecimal.ZERO,
            "TRANSFER",
            request.getContent() != null ? request.getContent() : ("Chuyển tiền mặt VNPOST (Mã: " + code + ")"),
            LocalDateTime.now(),
            "SUCCESS"
        );

        transactionRepository.save(txn);
        return ApiResponse.ok("Tạo lệnh chuyển tiền mặt VNPOST thành công! Mã: " + code, txn);
    }

    /**
     * Tra cứu thông tin tài khoản thụ hưởng theo số tài khoản.
     */
    public ApiResponse<Object> lookupAccount(String accountNo) {
        Optional<Account> accOpt = accountRepository.findByAccountNo(accountNo);
        if (accOpt.isEmpty()) {
            return ApiResponse.error("Tài khoản người nhận không tồn tại trên hệ thống");
        }
        Account acc = accOpt.get();
        String fullName = getFullNameForAccount(acc);

        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("accountNo", acc.getAccountNo());
        data.put("fullName", fullName);
        data.put("bankName", "Ngân hàng TMCP QuangTrung Bank");
        data.put("status", acc.getStatus());
        data.put("type", acc.getType());

        return ApiResponse.ok("Tìm thấy thông tin tài khoản", data);
    }

    // ═══════════════════════════════════════════════════════════
    // SỔ TIẾT KIỆM (Savings Accounts) — NGHIỆP VỤ CHUẨN NGÂN HÀNG THỰC TẾ
    // ═══════════════════════════════════════════════════════════

    /**
     * Mở sổ tiết kiệm trực tuyến (Có kỳ hạn hoặc Không kỳ hạn, hỗ trợ Idempotency).
     */
    @Transactional
    public ApiResponse<SavingsAccount> openSavings(OpenSavingsRequest request, User currentUser, String idempotencyKey) {
        String key = (idempotencyKey != null && !idempotencyKey.isBlank()) ? idempotencyKey : request.getIdempotencyKey();
        Long userId = currentUser != null ? currentUser.getId() : null;

        if (key != null && !key.isBlank()) {
            IdempotencyService.IdempotencyCheckResult<SavingsAccount> check =
                idempotencyService.validateAndLock(key, userId, "/api/customer/savings", request, SavingsAccount.class);
            if (check.isReplayed()) {
                return check.getCachedResponse();
            }
            if (check.isInProgress()) {
                return ApiResponse.error(check.getErrorMessage());
            }
            if (check.isError()) {
                return ApiResponse.error(check.getErrorMessage());
            }
        }

        try {
            ApiResponse<SavingsAccount> response = executeOpenSavings(request, currentUser, key);
            if (key != null && !key.isBlank()) {
                if (response.isSuccess()) {
                    idempotencyService.markCompleted(key, response);
                } else {
                    idempotencyService.markFailedOrRelease(key);
                }
            }
            return response;
        } catch (Exception e) {
            if (key != null && !key.isBlank()) {
                idempotencyService.markFailedOrRelease(key);
            }
            throw e;
        }
    }

    @Transactional
    public ApiResponse<SavingsAccount> executeOpenSavings(OpenSavingsRequest request, User currentUser, String idempotencyKey) {
        String myCustId = getCustomerIdForUser(currentUser);
        if (myCustId == null) return ApiResponse.error("Không tìm thấy thông tin khách hàng");

        if (!hasAccessToAccount(currentUser, request.getSourceAccountNo())) {
            return ApiResponse.error("Bạn không có quyền trích tiền từ tài khoản này");
        }

        boolean isDemand = "DEMAND".equalsIgnoreCase(request.getSavingsType()) || (request.getTermMonths() != null && request.getTermMonths() == 0);
        BigDecimal minRequired = isDemand ? BigDecimal.valueOf(100000) : BigDecimal.valueOf(1000000);

        if (request.getDepositAmount() == null || request.getDepositAmount().compareTo(minRequired) < 0) {
            return ApiResponse.error("Số tiền gửi tối thiểu là " + (isDemand ? "100.000 VNĐ (Không kỳ hạn)" : "1.000.000 VNĐ (Có kỳ hạn)"));
        }

        Optional<Account> accOpt = accountRepository.findByAccountNoForUpdate(request.getSourceAccountNo());
        if (accOpt.isEmpty()) return ApiResponse.error("Tài khoản trích tiền không tồn tại");

        Account acc = accOpt.get();
        if (!"ACTIVE".equalsIgnoreCase(acc.getStatus())) {
            return ApiResponse.error("Tài khoản nguồn đang bị khóa hoặc không hoạt động");
        }

        if (acc.getBalance().compareTo(request.getDepositAmount()) < 0) {
            return ApiResponse.error("Số dư tài khoản thanh toán không đủ để gửi tiết kiệm. Số dư hiện có: " + acc.getBalance().toPlainString() + " " + acc.getCurrency());
        }

        // Lấy lãi suất từ biểu lãi suất trong CSDL
        BigDecimal annualRate = BigDecimal.valueOf(6.5);
        if (isDemand) {
            Optional<SavingsInterestRate> rateOpt = savingsInterestRateRepository.findByTermMonthsAndIsActiveTrue(0);
            annualRate = rateOpt.map(SavingsInterestRate::getAnnualRate).orElse(BigDecimal.valueOf(0.20));
        } else {
            Optional<SavingsInterestRate> rateOpt = savingsInterestRateRepository.findByTermMonthsAndIsActiveTrue(request.getTermMonths());
            if (rateOpt.isPresent()) {
                annualRate = rateOpt.get().getAnnualRate();
            } else {
                if (request.getTermMonths() == 1) annualRate = BigDecimal.valueOf(4.5);
                else if (request.getTermMonths() == 3) annualRate = BigDecimal.valueOf(5.2);
                else if (request.getTermMonths() == 6) annualRate = BigDecimal.valueOf(6.5);
                else if (request.getTermMonths() == 12) annualRate = BigDecimal.valueOf(7.2);
                else if (request.getTermMonths() == 24) annualRate = BigDecimal.valueOf(7.8);
                else if (request.getTermMonths() == 36) annualRate = BigDecimal.valueOf(8.0);
            }
        }

        // Trừ tiền tài khoản nguồn
        acc.setBalance(acc.getBalance().subtract(request.getDepositAmount()));
        accountRepository.save(acc);

        // Tính lãi dự kiến
        BigDecimal expectedInterest = BigDecimal.ZERO;
        LocalDate maturityDate = null;
        if (!isDemand && request.getTermMonths() != null && request.getTermMonths() > 0) {
            expectedInterest = request.getDepositAmount()
                .multiply(annualRate)
                .multiply(BigDecimal.valueOf(request.getTermMonths()))
                .divide(BigDecimal.valueOf(1200), 2, java.math.RoundingMode.HALF_UP);
            maturityDate = LocalDate.now().plusMonths(request.getTermMonths());
        }

        String savNo = String.valueOf(100000 + new Random().nextInt(900000));
        String id = "SAV-" + System.currentTimeMillis();

        SavingsAccount sav = new SavingsAccount();
        sav.setId(id);
        sav.setSavingsNo(savNo);
        sav.setCustomerId(myCustId);
        sav.setCustomerName(currentUser.getFullName());
        sav.setSourceAccountNo(request.getSourceAccountNo());
        sav.setSavingsType(isDemand ? "DEMAND" : "TERM");
        sav.setDepositAmount(request.getDepositAmount());
        sav.setTermMonths(isDemand ? 0 : request.getTermMonths());
        sav.setInterestRate(annualRate);
        sav.setOriginalRate(annualRate);
        sav.setExpectedInterest(expectedInterest);
        sav.setAccruedInterest(BigDecimal.ZERO);
        sav.setEarlyWithdrawalRate(BigDecimal.valueOf(0.20));
        sav.setRenewType(request.getRenewType() != null ? request.getRenewType() : "AUTO_ROLLOVER_ALL");
        sav.setRenewCount(0);
        sav.setStatus("ACTIVE");
        sav.setCreatedAt(LocalDate.now());
        sav.setMaturityDate(maturityDate);
        sav.setLastInterestCalcDate(LocalDate.now());
        sav.setIdempotencyKey(idempotencyKey);

        savingsAccountRepository.save(sav);

        // Ghi nhận biến động số dư giao dịch
        String toNameDesc = isDemand ? "Tiết Kiệm Không Kỳ Hạn (" + annualRate + "%/năm)" : "Tiết Kiệm " + request.getTermMonths() + " Tháng (" + annualRate + "%/năm)";
        String txnId = "TXN-SAV-" + System.currentTimeMillis() + (100 + new Random().nextInt(900));
        Transaction txn = new Transaction(
            txnId,
            idempotencyKey,
            request.getSourceAccountNo(),
            currentUser.getFullName(),
            savNo,
            toNameDesc,
            request.getDepositAmount(),
            BigDecimal.ZERO,
            "TRANSFER",
            "Mở tài khoản tiết kiệm " + savNo + (isDemand ? " (Không kỳ hạn)" : " (Kỳ hạn " + request.getTermMonths() + " tháng)"),
            LocalDateTime.now(),
            "SUCCESS"
        );
        transactionRepository.save(txn);

        pushBalanceNotification(myCustId, request.getSourceAccountNo(), "Biến động số dư Nợ (-)", "Tài khoản " + request.getSourceAccountNo() + " -" + formatMoney(request.getDepositAmount()) + " VNĐ. Mở tài khoản tiết kiệm " + savNo, request.getDepositAmount(), acc.getBalance(), "MONEY_OUT");

        return ApiResponse.ok("Mở tài khoản tiết kiệm trực tuyến thành công! Mã tài khoản: " + savNo, sav);
    }

    /**
     * Tất toán sổ tiết kiệm (Đúng hạn, Trước hạn, hoặc Rút một phần).
     */
    @Transactional
    public ApiResponse<Object> closeSavings(CloseSavingsRequest request, User currentUser, String idempotencyKey) {
        String key = (idempotencyKey != null && !idempotencyKey.isBlank()) ? idempotencyKey : request.getIdempotencyKey();
        Long userId = currentUser != null ? currentUser.getId() : null;

        if (key != null && !key.isBlank()) {
            IdempotencyService.IdempotencyCheckResult<Object> check =
                idempotencyService.validateAndLock(key, userId, "/api/customer/savings/close", request, Object.class);
            if (check.isReplayed()) {
                return check.getCachedResponse();
            }
            if (check.isInProgress()) {
                return ApiResponse.error(check.getErrorMessage());
            }
            if (check.isError()) {
                return ApiResponse.error(check.getErrorMessage());
            }
        }

        try {
            ApiResponse<Object> response = executeCloseSavings(request, currentUser, key);
            if (key != null && !key.isBlank()) {
                if (response.isSuccess()) {
                    idempotencyService.markCompleted(key, response);
                } else {
                    idempotencyService.markFailedOrRelease(key);
                }
            }
            return response;
        } catch (Exception e) {
            if (key != null && !key.isBlank()) {
                idempotencyService.markFailedOrRelease(key);
            }
            throw e;
        }
    }

    @Transactional
    public ApiResponse<Object> executeCloseSavings(CloseSavingsRequest request, User currentUser, String idempotencyKey) {
        String myCustId = getCustomerIdForUser(currentUser);
        if (myCustId == null) return ApiResponse.error("Không tìm thấy thông tin khách hàng");

        Optional<SavingsAccount> savOpt = savingsAccountRepository.findByIdAndCustomerId(request.getSavingsId(), myCustId);
        if (savOpt.isEmpty()) {
            // Thử tìm theo savingsNo
            savOpt = savingsAccountRepository.findBySavingsNo(request.getSavingsId());
            if (savOpt.isEmpty() || !myCustId.equals(savOpt.get().getCustomerId())) {
                return ApiResponse.error("Tài khoản tiết kiệm không tồn tại hoặc bạn không có quyền thao tác");
            }
        }

        SavingsAccount sav = savOpt.get();
        if (!"ACTIVE".equalsIgnoreCase(sav.getStatus())) {
            return ApiResponse.error("Tài khoản tiết kiệm đã được tất toán hoặc không còn hoạt động");
        }

        // Tìm tài khoản nhận tiền (ưu tiên tài khoản nguồn ban đầu, nếu không tìm tài khoản PAYMENT đang ACTIVE)
        Optional<Account> targetAccOpt = accountRepository.findByAccountNoForUpdate(sav.getSourceAccountNo());
        if (targetAccOpt.isEmpty() || !"ACTIVE".equalsIgnoreCase(targetAccOpt.get().getStatus())) {
            List<Account> accounts = accountRepository.findByCustomerId(myCustId);
            targetAccOpt = accounts.stream()
                .filter(a -> "PAYMENT".equalsIgnoreCase(a.getType()) && "ACTIVE".equalsIgnoreCase(a.getStatus()))
                .findFirst();
        }

        if (targetAccOpt.isEmpty()) {
            return ApiResponse.error("Không tìm thấy tài khoản thanh toán nhận tiền hợp lệ");
        }

        Account targetAcc = targetAccOpt.get();
        LocalDate now = LocalDate.now();
        long daysActive = ChronoUnit.DAYS.between(sav.getCreatedAt(), now);
        if (daysActive <= 0) daysActive = 1;

        boolean isDemand = "DEMAND".equalsIgnoreCase(sav.getSavingsType()) || sav.getTermMonths() == 0;
        boolean isPartial = request.getPartialAmount() != null && request.getPartialAmount().compareTo(BigDecimal.ZERO) > 0;

        // ─────────────────────────────────────────────────────────────
        // TRƯỜNG HỢP 1: RÚT MỘT PHẦN TIỀN TIẾT KIỆM (Partial Withdrawal)
        // ─────────────────────────────────────────────────────────────
        if (isPartial) {
            BigDecimal withdrawAmt = request.getPartialAmount();
            if (withdrawAmt.compareTo(sav.getDepositAmount()) >= 0) {
                return ApiResponse.error("Số tiền rút một phần phải nhỏ hơn tổng số dư hiện tại của tài khoản. Nếu muốn rút hết, vui lòng chọn Tất toán toàn bộ.");
            }

            BigDecimal remaining = sav.getDepositAmount().subtract(withdrawAmt);
            BigDecimal minKeep = isDemand ? BigDecimal.valueOf(100000) : BigDecimal.valueOf(1000000);
            if (remaining.compareTo(minKeep) < 0) {
                return ApiResponse.error("Số dư còn lại trong tài khoản sau khi rút phải đạt tối thiểu " + (isDemand ? "100.000 VNĐ" : "1.000.000 VNĐ"));
            }

            // Phần rút trước hạn áp dụng lãi suất KKH (0.2%/năm) theo số ngày thực gửi
            BigDecimal rateForPartial = sav.getEarlyWithdrawalRate() != null ? sav.getEarlyWithdrawalRate() : BigDecimal.valueOf(0.20);
            BigDecimal partialInterest = withdrawAmt
                .multiply(rateForPartial)
                .multiply(BigDecimal.valueOf(daysActive))
                .divide(BigDecimal.valueOf(36500), 2, java.math.RoundingMode.HALF_UP);

            BigDecimal totalPayout = withdrawAmt.add(partialInterest);

            // Cập nhật số dư sổ tiết kiệm
            sav.setDepositAmount(remaining);
            if (!isDemand && sav.getTermMonths() != null && sav.getTermMonths() > 0) {
                BigDecimal newExpectedInterest = remaining
                    .multiply(sav.getInterestRate())
                    .multiply(BigDecimal.valueOf(sav.getTermMonths()))
                    .divide(BigDecimal.valueOf(1200), 2, java.math.RoundingMode.HALF_UP);
                sav.setExpectedInterest(newExpectedInterest);
            }

            // Chuyển tiền vào tài khoản thanh toán
            targetAcc.setBalance(targetAcc.getBalance().add(totalPayout));
            accountRepository.save(targetAcc);
            savingsAccountRepository.save(sav);

            // Ghi nhận Transaction
            String txnId = "TXN-SAV-WDR-" + System.currentTimeMillis() + (100 + new Random().nextInt(900));
            Transaction txn = new Transaction(
                txnId,
                idempotencyKey,
                sav.getSavingsNo(),
                "Tài Khoản Tiết Kiệm (" + sav.getSavingsNo() + ")",
                targetAcc.getAccountNo(),
                currentUser.getFullName(),
                totalPayout,
                BigDecimal.ZERO,
                "TRANSFER",
                "Rút một phần tài khoản TK " + sav.getSavingsNo() + " (Gốc: " + withdrawAmt.toPlainString() + ", Lãi KKH: " + partialInterest.toPlainString() + " VND)",
                LocalDateTime.now(),
                "SUCCESS"
            );
            transactionRepository.save(txn);

            pushBalanceNotification(sav.getCustomerId(), targetAcc.getAccountNo(), "Biến động số dư Có (+)", "Tài khoản " + targetAcc.getAccountNo() + " +" + formatMoney(totalPayout) + " VNĐ. Rút một phần tài khoản tiết kiệm " + sav.getSavingsNo(), totalPayout, targetAcc.getBalance(), "MONEY_IN");

            java.util.Map<String, Object> resMap = new java.util.HashMap<>();
            resMap.put("savingsNo", sav.getSavingsNo());
            resMap.put("withdrawnAmount", withdrawAmt);
            resMap.put("interestEarned", partialInterest);
            resMap.put("totalPayout", totalPayout);
            resMap.put("remainingDepositAmount", remaining);
            resMap.put("targetAccountNo", targetAcc.getAccountNo());
            resMap.put("message", "Rút một phần tài khoản tiết kiệm thành công! Số tiền " + totalPayout.toPlainString() + " VNĐ đã chuyển vào TK " + targetAcc.getAccountNo());

            return ApiResponse.ok("Rút một phần tài khoản tiết kiệm thành công!", resMap);
        }

        // ─────────────────────────────────────────────────────────────
        // TRƯỜNG HỢP 2: TẤT TOÁN TOÀN BỘ SỔ (Full Close)
        // ─────────────────────────────────────────────────────────────
        boolean isMatured = sav.getMaturityDate() != null && !now.isBefore(sav.getMaturityDate());
        boolean isEarly = !isDemand && (!isMatured || request.isEarlyClose());

        BigDecimal payoutInterest;
        BigDecimal payoutRate;
        String closedType;
        String payoutDesc;

        if (isDemand) {
            payoutRate = sav.getInterestRate();
            payoutInterest = sav.getDepositAmount()
                .multiply(payoutRate)
                .multiply(BigDecimal.valueOf(daysActive))
                .divide(BigDecimal.valueOf(36500), 2, java.math.RoundingMode.HALF_UP);
            closedType = "DEMAND_CLOSE";
            payoutDesc = "Tất toán tài khoản tiết kiệm không kỳ hạn " + sav.getSavingsNo();
        } else if (isEarly) {
            // Tất toán trước hạn: Áp dụng Lãi suất Không kỳ hạn (0.2%/năm) theo quy định Ngân hàng Nhà nước
            payoutRate = sav.getEarlyWithdrawalRate() != null ? sav.getEarlyWithdrawalRate() : BigDecimal.valueOf(0.20);
            payoutInterest = sav.getDepositAmount()
                .multiply(payoutRate)
                .multiply(BigDecimal.valueOf(daysActive))
                .divide(BigDecimal.valueOf(36500), 2, java.math.RoundingMode.HALF_UP);
            closedType = "EARLY_FULL";
            payoutDesc = "Tất toán trước hạn tài khoản tiết kiệm " + sav.getSavingsNo() + " (Áp dụng lãi KKH " + payoutRate + "%/năm cho " + daysActive + " ngày thực gửi)";
        } else {
            // Tất toán đúng hạn
            payoutRate = sav.getInterestRate();
            payoutInterest = sav.getExpectedInterest() != null ? sav.getExpectedInterest() : BigDecimal.ZERO;
            closedType = "MATURED";
            payoutDesc = "Tất toán đúng hạn tài khoản tiết kiệm " + sav.getSavingsNo();
        }

        BigDecimal totalPayout = sav.getDepositAmount().add(payoutInterest);

        // Cập nhật trạng thái tài khoản
        sav.setStatus(isEarly ? "CLOSED_EARLY" : "MATURED");
        sav.setClosedAt(now);
        sav.setActualInterestPaid(payoutInterest);
        sav.setClosedType(closedType);
        savingsAccountRepository.save(sav);

        // Chuyển tiền vào tài khoản thanh toán
        targetAcc.setBalance(targetAcc.getBalance().add(totalPayout));
        accountRepository.save(targetAcc);

        // Ghi Transaction
        String txnId = "TXN-SAV-CLS-" + System.currentTimeMillis() + (100 + new Random().nextInt(900));
        Transaction txn = new Transaction(
            txnId,
            idempotencyKey,
            sav.getSavingsNo(),
            "Tài Khoản Tiết Kiệm (" + sav.getSavingsNo() + ")",
            targetAcc.getAccountNo(),
            currentUser.getFullName(),
            totalPayout,
            BigDecimal.ZERO,
            "TRANSFER",
            payoutDesc,
            LocalDateTime.now(),
            "SUCCESS"
        );
        transactionRepository.save(txn);

        pushBalanceNotification(sav.getCustomerId(), targetAcc.getAccountNo(), "Biến động số dư Có (+)", "Tài khoản " + targetAcc.getAccountNo() + " +" + formatMoney(totalPayout) + " VNĐ. Tất toán tài khoản tiết kiệm " + sav.getSavingsNo(), totalPayout, targetAcc.getBalance(), "MONEY_IN");

        java.util.Map<String, Object> resMap = new java.util.HashMap<>();
        resMap.put("savingsNo", sav.getSavingsNo());
        resMap.put("depositAmount", sav.getDepositAmount());
        resMap.put("actualInterestPaid", payoutInterest);
        resMap.put("payoutRate", payoutRate);
        resMap.put("totalPayout", totalPayout);
        resMap.put("closedType", closedType);
        resMap.put("targetAccountNo", targetAcc.getAccountNo());
        resMap.put("message", "Tất toán tài khoản tiết kiệm " + sav.getSavingsNo() + " thành công! Số tiền: " + totalPayout.toPlainString() + " VNĐ đã được cộng vào TK " + targetAcc.getAccountNo());

        return ApiResponse.ok("Tất toán tài khoản tiết kiệm thành công!", resMap);
    }

    /**
     * Nộp thêm tiền vào tài khoản tiết kiệm Không kỳ hạn (Top-up).
     */
    @Transactional
    public ApiResponse<SavingsAccount> topUpSavings(TopUpSavingsRequest request, User currentUser, String idempotencyKey) {
        String key = (idempotencyKey != null && !idempotencyKey.isBlank()) ? idempotencyKey : request.getIdempotencyKey();
        Long userId = currentUser != null ? currentUser.getId() : null;

        if (key != null && !key.isBlank()) {
            IdempotencyService.IdempotencyCheckResult<SavingsAccount> check =
                idempotencyService.validateAndLock(key, userId, "/api/customer/savings/topup", request, SavingsAccount.class);
            if (check.isReplayed()) {
                return check.getCachedResponse();
            }
            if (check.isInProgress()) {
                return ApiResponse.error(check.getErrorMessage());
            }
            if (check.isError()) {
                return ApiResponse.error(check.getErrorMessage());
            }
        }

        try {
            ApiResponse<SavingsAccount> response = executeTopUpSavings(request, currentUser, key);
            if (key != null && !key.isBlank()) {
                if (response.isSuccess()) {
                    idempotencyService.markCompleted(key, response);
                } else {
                    idempotencyService.markFailedOrRelease(key);
                }
            }
            return response;
        } catch (Exception e) {
            if (key != null && !key.isBlank()) {
                idempotencyService.markFailedOrRelease(key);
            }
            throw e;
        }
    }

    @Transactional
    public ApiResponse<SavingsAccount> executeTopUpSavings(TopUpSavingsRequest request, User currentUser, String idempotencyKey) {
        String myCustId = getCustomerIdForUser(currentUser);
        if (myCustId == null) return ApiResponse.error("Không tìm thấy thông tin khách hàng");

        if (!hasAccessToAccount(currentUser, request.getSourceAccountNo())) {
            return ApiResponse.error("Bạn không có quyền trích tiền từ tài khoản nguồn này");
        }

        Optional<SavingsAccount> savOpt = savingsAccountRepository.findByIdAndCustomerId(request.getSavingsId(), myCustId);
        if (savOpt.isEmpty()) {
            savOpt = savingsAccountRepository.findBySavingsNo(request.getSavingsId());
            if (savOpt.isEmpty() || !myCustId.equals(savOpt.get().getCustomerId())) {
                return ApiResponse.error("Tài khoản tiết kiệm không tồn tại hoặc không thuộc quyền sở hữu của bạn");
            }
        }

        SavingsAccount sav = savOpt.get();
        if (!"ACTIVE".equalsIgnoreCase(sav.getStatus())) {
            return ApiResponse.error("Tài khoản tiết kiệm không ở trạng thái hoạt động");
        }

        boolean isDemand = "DEMAND".equalsIgnoreCase(sav.getSavingsType()) || sav.getTermMonths() == 0;
        if (!isDemand) {
            return ApiResponse.error("Theo quy định Ngân hàng, Tài khoản tiết kiệm có kỳ hạn không cho phép nộp thêm tiền giữa chừng. Quý khách vui lòng mở tài khoản tiết kiệm mới hoặc sử dụng Tài khoản tiết kiệm không kỳ hạn.");
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.valueOf(100000)) < 0) {
            return ApiResponse.error("Số tiền nộp thêm tối thiểu là 100.000 VNĐ");
        }

        Optional<Account> sourceAccOpt = accountRepository.findByAccountNoForUpdate(request.getSourceAccountNo());
        if (sourceAccOpt.isEmpty()) return ApiResponse.error("Tài khoản nguồn không tồn tại");

        Account sourceAcc = sourceAccOpt.get();
        if (sourceAcc.getBalance().compareTo(request.getAmount()) < 0) {
            return ApiResponse.error("Số dư tài khoản thanh toán không đủ để gửi thêm tiền");
        }

        // Trừ tiền TK nguồn & cộng vào tài khoản tiết kiệm
        sourceAcc.setBalance(sourceAcc.getBalance().subtract(request.getAmount()));
        sav.setDepositAmount(sav.getDepositAmount().add(request.getAmount()));

        accountRepository.save(sourceAcc);
        savingsAccountRepository.save(sav);

        // Ghi nhận Transaction
        String txnId = "TXN-SAV-TOP-" + System.currentTimeMillis() + (100 + new Random().nextInt(900));
        Transaction txn = new Transaction(
            txnId,
            idempotencyKey,
            request.getSourceAccountNo(),
            currentUser.getFullName(),
            sav.getSavingsNo(),
            "Tài Khoản Tiết Kiệm (" + sav.getSavingsNo() + ")",
            request.getAmount(),
            BigDecimal.ZERO,
            "TRANSFER",
            "Nộp thêm tiền vào tài khoản tiết kiệm không kỳ hạn " + sav.getSavingsNo(),
            LocalDateTime.now(),
            "SUCCESS"
        );
        transactionRepository.save(txn);

        pushBalanceNotification(myCustId, request.getSourceAccountNo(), "Biến động số dư Nợ (-)", "Tài khoản " + request.getSourceAccountNo() + " -" + formatMoney(request.getAmount()) + " VNĐ. Nộp thêm tiền vào tài khoản tiết kiệm " + sav.getSavingsNo(), request.getAmount(), sourceAcc.getBalance(), "MONEY_OUT");

        return ApiResponse.ok("Nộp thêm tiền vào tài khoản tiết kiệm thành công! Số dư mới: " + sav.getDepositAmount().toPlainString() + " VNĐ", sav);
    }

    /**
     * Xem chi tiết tài khoản tiết kiệm kèm tính toán lãi suất tạm tính hiện tại và lịch sử giao dịch.
     */
    public ApiResponse<SavingsDetailResponse> getSavingsDetail(String savingsId, User currentUser) {
        String myCustId = getCustomerIdForUser(currentUser);
        if (myCustId == null) return ApiResponse.error("Không tìm thấy thông tin khách hàng");

        Optional<SavingsAccount> savOpt = savingsAccountRepository.findByIdAndCustomerId(savingsId, myCustId);
        if (savOpt.isEmpty()) {
            savOpt = savingsAccountRepository.findBySavingsNo(savingsId);
            if (savOpt.isEmpty() || !myCustId.equals(savOpt.get().getCustomerId())) {
                return ApiResponse.error("Tài khoản tiết kiệm không tồn tại");
            }
        }

        SavingsAccount sav = savOpt.get();
        LocalDate now = LocalDate.now();
        long daysActive = ChronoUnit.DAYS.between(sav.getCreatedAt(), now);
        if (daysActive <= 0) daysActive = 1;

        boolean isDemand = "DEMAND".equalsIgnoreCase(sav.getSavingsType()) || sav.getTermMonths() == 0;
        boolean isMatured = sav.getMaturityDate() != null && !now.isBefore(sav.getMaturityDate());

        BigDecimal currentAccruedInterest;
        BigDecimal payoutIfClosedToday;

        if ("ACTIVE".equalsIgnoreCase(sav.getStatus())) {
            if (isDemand) {
                currentAccruedInterest = sav.getDepositAmount()
                    .multiply(sav.getInterestRate())
                    .multiply(BigDecimal.valueOf(daysActive))
                    .divide(BigDecimal.valueOf(36500), 2, java.math.RoundingMode.HALF_UP);
                payoutIfClosedToday = sav.getDepositAmount().add(currentAccruedInterest);
            } else if (isMatured) {
                currentAccruedInterest = sav.getExpectedInterest();
                payoutIfClosedToday = sav.getDepositAmount().add(currentAccruedInterest);
            } else {
                // Rút trước hạn tính theo lãi suất KKH
                BigDecimal earlyRate = sav.getEarlyWithdrawalRate() != null ? sav.getEarlyWithdrawalRate() : BigDecimal.valueOf(0.20);
                currentAccruedInterest = sav.getDepositAmount()
                    .multiply(earlyRate)
                    .multiply(BigDecimal.valueOf(daysActive))
                    .divide(BigDecimal.valueOf(36500), 2, java.math.RoundingMode.HALF_UP);
                payoutIfClosedToday = sav.getDepositAmount().add(currentAccruedInterest);
            }
        } else {
            currentAccruedInterest = sav.getActualInterestPaid() != null ? sav.getActualInterestPaid() : BigDecimal.ZERO;
            payoutIfClosedToday = sav.getDepositAmount().add(currentAccruedInterest);
        }

        // Lấy lịch sử giao dịch liên quan đến sổ
        List<Transaction> relatedTxns = transactionRepository.findByFromAccountOrToAccountOrderByTimestampDesc(sav.getSavingsNo(), sav.getSavingsNo());

        SavingsDetailResponse detail = new SavingsDetailResponse(
            sav,
            daysActive,
            currentAccruedInterest,
            payoutIfClosedToday,
            isMatured,
            relatedTxns
        );

        return ApiResponse.ok("Lấy chi tiết tài khoản tiết kiệm thành công", detail);
    }

    /**
     * Lấy toàn bộ danh sách tài khoản tiết kiệm của khách hàng.
     */
    public ApiResponse<List<SavingsAccount>> getSavings(User currentUser) {
        String myCustId = getCustomerIdForUser(currentUser);
        if (myCustId == null) return ApiResponse.error("Không tìm thấy thông tin khách hàng");
        List<SavingsAccount> list = savingsAccountRepository.findByCustomerIdOrderByCreatedAtDesc(myCustId);
        return ApiResponse.ok("Lấy danh sách tài khoản tiết kiệm thành công", list);
    }

    /**
     * Lấy biểu lãi suất tiền gửi tiết kiệm hiện hành.
     */
    public ApiResponse<List<SavingsInterestRate>> getSavingsInterestRates() {
        List<SavingsInterestRate> list = savingsInterestRateRepository.findByIsActiveTrueOrderByTermMonthsAsc();
        return ApiResponse.ok("Lấy biểu lãi suất tiết kiệm thành công", list);
    }

    // ═══════════════════════════════════════════════════════════
    // KHOẢN VAY VỐN (Loans)
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public ApiResponse<Loan> applyLoan(ApplyLoanRequest request, User currentUser) {
        String myCustId = getCustomerIdForUser(currentUser);
        if (myCustId == null) return ApiResponse.error("Không tìm thấy thông tin khách hàng");

        String id = "LOAN-" + System.currentTimeMillis();
        BigDecimal rate = BigDecimal.valueOf(10.5);
        if ("CAR".equals(request.getLoanType())) rate = BigDecimal.valueOf(8.8);
        else if ("MORTGAGE".equals(request.getLoanType())) rate = BigDecimal.valueOf(7.9);
        else if ("OVERDRAFT".equals(request.getLoanType())) rate = BigDecimal.valueOf(11.0);

        BigDecimal monthlyInterestRate = rate.divide(BigDecimal.valueOf(1200), 6, java.math.RoundingMode.HALF_UP);
        BigDecimal monthlyPayment = request.getPrincipalAmount()
            .divide(BigDecimal.valueOf(request.getTermMonths()), 2, java.math.RoundingMode.HALF_UP)
            .add(request.getPrincipalAmount().multiply(monthlyInterestRate));

        Loan loan = new Loan();
        loan.setId(id);
        loan.setCustomerId(myCustId);
        loan.setCustomerName(currentUser.getFullName());
        loan.setAccountNo(request.getAccountNo());
        loan.setLoanType(request.getLoanType());
        loan.setTitle(request.getTitle());
        loan.setPrincipalAmount(request.getPrincipalAmount());
        loan.setRemainingBalance(request.getPrincipalAmount());
        loan.setTermMonths(request.getTermMonths());
        loan.setInterestRate(rate);
        loan.setMonthlyPayment(monthlyPayment);
        loan.setNextDueDate(java.time.LocalDate.now().plusMonths(1).toString());
        loan.setStatus("PENDING");
        loan.setAppliedAt(LocalDateTime.now());

        loanRepository.save(loan);
        return ApiResponse.ok("Nộp hồ sơ vay vốn thành công! Hồ sơ đang được chuyên viên tín dụng thẩm định.", loan);
    }

    public ApiResponse<List<Loan>> getLoans(User currentUser) {
        String myCustId = getCustomerIdForUser(currentUser);
        if (myCustId == null) return ApiResponse.error("Không tìm thấy thông tin khách hàng");
        List<Loan> list = loanRepository.findByCustomerIdOrderByAppliedAtDesc(myCustId);
        return ApiResponse.ok("Lấy danh sách khoản vay thành công", list);
    }

    // ═══════════════════════════════════════════════════════════
    // ĐỊNH DANH EKYC (eKYC Verification)
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public ApiResponse<Customer> submitKyc(SubmitKycRequest request, User currentUser) {
        String myCustId = getCustomerIdForUser(currentUser);
        if (myCustId == null) return ApiResponse.error("Không tìm thấy thông tin khách hàng");

        Optional<Customer> custOpt = customerRepository.findById(myCustId);
        if (custOpt.isEmpty()) return ApiResponse.error("Khách hàng không tồn tại");

        Customer cust = custOpt.get();
        cust.setIdCardFront(request.getIdCardFront());
        cust.setIdCardBack(request.getIdCardBack());
        cust.setSelfiePhoto(request.getSelfiePhoto());
        cust.setKycStatus("VERIFIED"); // Tự động duyệt mô phỏng eKYC
        cust.setKycVerifiedAt(LocalDateTime.now());

        customerRepository.save(cust);
        return ApiResponse.ok("Xác thực eKYC thành công! Hạn mức tài khoản đã được nâng lên tối đa.", cust);
    }

    @Transactional
    public ApiResponse<Customer> approveKyc(String customerId, String newStatus, User currentUser) {
        if (!"ADMIN".equals(currentUser.getRole()) && !"TELLER".equals(currentUser.getRole())) {
            return ApiResponse.error("Chỉ Giao dịch viên hoặc Admin mới có quyền duyệt eKYC");
        }
        Optional<Customer> custOpt = customerRepository.findById(customerId);
        if (custOpt.isEmpty()) return ApiResponse.error("Khách hàng không tồn tại");

        Customer cust = custOpt.get();
        cust.setKycStatus(newStatus);
        if ("VERIFIED".equals(newStatus)) {
            cust.setKycVerifiedAt(LocalDateTime.now());
        }
        customerRepository.save(cust);
        return ApiResponse.ok("Cập nhật trạng thái eKYC thành công: " + newStatus, cust);
    }

    // ═══════════════════════════════════════════════════════════
    // THÔNG BÁO PUSH BIẾN ĐỘNG SỐ DƯ (PUSH NOTIFICATIONS)
    // ═══════════════════════════════════════════════════════════

    public String formatMoney(BigDecimal amount) {
        if (amount == null) return "0";
        java.text.DecimalFormatSymbols symbols = new java.text.DecimalFormatSymbols();
        symbols.setGroupingSeparator('.');
        java.text.DecimalFormat df = new java.text.DecimalFormat("#,##0", symbols);
        return df.format(amount);
    }

    /**
     * Tự động đẩy thông báo biến động số dư cho khách hàng.
     */
    public void pushBalanceNotification(String customerId, String accountNo, String title, String message, BigDecimal amount, BigDecimal balanceAfter, String type) {
        if (customerId == null || customerId.isBlank()) return;
        try {
            String notifId = "NOTIF-" + System.currentTimeMillis() + "-" + (100 + new Random().nextInt(900));
            Notification notification = new Notification(
                notifId,
                customerId,
                accountNo,
                title,
                message,
                amount != null ? amount : BigDecimal.ZERO,
                balanceAfter != null ? balanceAfter : BigDecimal.ZERO,
                type != null ? type : "MONEY_IN",
                false,
                LocalDateTime.now()
            );
            notificationRepository.save(notification);
        } catch (Exception e) {
            System.err.println("[Notification] Warning: Could not push notification: " + e.getMessage());
        }
    }

    /**
     * Lấy danh sách thông báo biến động số dư của khách hàng hiện tại.
     */
    public ApiResponse<List<Notification>> getNotifications(User currentUser) {
        String customerId = getCustomerIdForUser(currentUser);
        if (customerId == null) {
            return ApiResponse.error("Không tìm thấy thông tin khách hàng");
        }
        List<Notification> list = notificationRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        return ApiResponse.ok("Lấy danh sách thông báo thành công", list);
    }

    /**
     * Đánh dấu 1 thông báo là đã đọc.
     */
    @Transactional
    public ApiResponse<String> markNotificationRead(String notificationId, User currentUser) {
        String customerId = getCustomerIdForUser(currentUser);
        Optional<Notification> notifOpt = notificationRepository.findById(notificationId);
        if (notifOpt.isPresent()) {
            Notification n = notifOpt.get();
            if (customerId != null && customerId.equals(n.getCustomerId())) {
                n.setRead(true);
                notificationRepository.save(n);
                return ApiResponse.ok("Đã đánh dấu thông báo là đã đọc", notificationId);
            }
        }
        return ApiResponse.error("Không tìm thấy thông báo hoặc không có quyền");
    }

    /**
     * Đánh dấu tất cả thông báo là đã đọc.
     */
    @Transactional
    public ApiResponse<String> markAllNotificationsRead(User currentUser) {
        String customerId = getCustomerIdForUser(currentUser);
        if (customerId == null) return ApiResponse.error("Không tìm thấy thông tin khách hàng");

        List<Notification> list = notificationRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        list.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(list);
        return ApiResponse.ok("Đã đánh dấu tất cả thông báo là đã đọc", customerId);
    }
}
