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
import java.util.Map;
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
        this.atmCodeRepository = atmCodeRepository;
        this.savingsAccountRepository = savingsAccountRepository;
        this.savingsInterestRateRepository = savingsInterestRateRepository;
        this.loanRepository = loanRepository;
        this.idempotencyService = idempotencyService;
        this.notificationRepository = notificationRepository;
    }

    /**
     * Sinh mã giao dịch thuần số (8-9 chữ số), không có tiền tố chữ cái, ngắn gọn và duy nhất.
     */
    public static String generateNumericTxnId() {
        long timePart = (System.currentTimeMillis() / 1000) % 100000;
        int randPart = 1000 + new Random().nextInt(9000);
        return String.valueOf(timePart * 10000L + randPart);
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

        // Ghi nhận giao dịch với mã thuần số
        String txnId = generateNumericTxnId();
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
                String t = type.trim().toUpperCase();
                if ("SAVINGS_DEPOSIT".equals(t) || "OPEN_SAVINGS".equals(t)) {
                    predicates.add(root.get("type").in(List.of("SAVINGS_DEPOSIT", "OPEN_SAVINGS", "SAVINGS_TOPUP", "SAVINGS")));
                } else if ("SAVINGS_SETTLEMENT".equals(t) || "CLOSE_SAVINGS".equals(t)) {
                    predicates.add(root.get("type").in(List.of("SAVINGS_SETTLEMENT", "CLOSE_SAVINGS", "WITHDRAW_SAVINGS", "SAVINGS_WITHDRAW")));
                } else if ("DEPOSIT".equals(t)) {
                    predicates.add(root.get("type").in(List.of("DEPOSIT", "ATM_DEPOSIT")));
                } else if ("WITHDRAW".equals(t)) {
                    predicates.add(root.get("type").in(List.of("WITHDRAW", "ATM_WITHDRAW", "CARD_ATM")));
                } else if ("TRANSFER".equals(t)) {
                    predicates.add(root.get("type").in(List.of("TRANSFER", "TRANSFER_OUT", "CARD_POS")));
                } else if ("TRANSFER_IN".equals(t) || "RECEIVE".equals(t)) {
                    predicates.add(root.get("type").in(List.of("TRANSFER_IN", "RECEIVE", "TRANSFER")));
                } else if ("LOAN_DISBURSEMENT".equals(t) || "DISBURSEMENT".equals(t)) {
                    predicates.add(root.get("type").in(List.of("LOAN_DISBURSEMENT", "DISBURSEMENT")));
                } else if ("LOAN_REPAYMENT".equals(t) || "REPAYMENT".equals(t) || "LOAN_PAYMENT".equals(t) || "LOAN_SETTLEMENT".equals(t)) {
                    predicates.add(root.get("type").in(List.of("LOAN_REPAYMENT", "REPAYMENT", "LOAN_PAYMENT", "LOAN_SETTLEMENT")));
                } else if ("INTEREST".equals(t) || "INTEREST_CREDIT".equals(t)) {
                    predicates.add(root.get("type").in(List.of("INTEREST", "INTEREST_CREDIT", "SAVINGS_INTEREST")));
                } else {
                    predicates.add(cb.equal(cb.upper(root.get("type")), t));
                }
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

        if (request.getContactAddress() != null && !request.getContactAddress().isBlank()) {
            Optional<Customer> custOpt = customerRepository.findByUserId(user.getId());
            if (custOpt.isPresent()) {
                Customer cust = custOpt.get();
                cust.setContactAddress(request.getContactAddress().trim());
                customerRepository.saveAndFlush(cust);
            }
        }

        return ApiResponse.ok("Cập nhật thông tin liên lạc thành công!", user);
    }

    /**
     * Xác minh mật khẩu hiện tại của người dùng trước khi tiến hành quy trình bảo mật (ví dụ đổi mật khẩu).
     */
    public ApiResponse<Boolean> verifyPassword(String currentPassword, User currentUser) {
        if (currentUser == null) {
            return ApiResponse.error("Phiên làm việc không hợp lệ");
        }
        if (currentPassword == null || currentPassword.isBlank()) {
            return ApiResponse.error("Vui lòng nhập mật khẩu hiện tại");
        }

        Optional<User> userOpt = userRepository.findById(currentUser.getId());
        if (userOpt.isEmpty()) {
            return ApiResponse.error("Không tìm thấy người dùng trong hệ thống");
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ApiResponse.error("Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại.");
        }

        return ApiResponse.ok("Mật khẩu hiện tại chính xác.", true);
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

        // 5. Lưu thông báo bảo mật vào Notification Repository
        String myCustId = getCustomerIdForUser(user);
        if (myCustId != null && !myCustId.isBlank()) {
            String timeStr = java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy").format(LocalDateTime.now());
            String notifMsg = "Mật khẩu đăng nhập tài khoản của quý khách đã được thay đổi thành công vào lúc " + timeStr + ". Vui lòng liên hệ hotline 1900 6868 nếu quý khách không thực hiện thao tác này.";
            pushBalanceNotification(myCustId, "", "Cảnh báo bảo mật: Đổi mật khẩu thành công", notifMsg, BigDecimal.ZERO, BigDecimal.ZERO, "SECURITY");
        }

        return ApiResponse.ok("Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới của quý khách.");
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

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.valueOf(10000)) < 0) {
            return ApiResponse.error("Số tiền tối thiểu để tạo mã ATM là 10.000 VNĐ");
        }

        if (request.getAmount().remainder(BigDecimal.valueOf(10000)).compareTo(BigDecimal.ZERO) != 0) {
            return ApiResponse.error("Số tiền giao dịch tại ATM phải là bội số của 10.000 VNĐ");
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
        List<AtmCode> codes = atmCodeRepository.findByCustomerIdOrderByCreatedAtDesc(myCustId)
                .stream()
                .filter(c -> !"CANCELLED".equals(c.getStatus()))
                .toList();
        return ApiResponse.ok("Lấy danh sách mã ATM thành công", codes);
    }

    /**
     * Hủy mã ATM chưa sử dụng (xóa mã).
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

        String digits = code.getCode();
        atmCodeRepository.delete(code);
        return ApiResponse.ok("Đã hủy và xóa thành công mã ATM " + digits, digits);
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
        String txnId = generateNumericTxnId();
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
        LocalDate createdDate = sav.getCreatedAt() != null ? sav.getCreatedAt() : now;
        long daysActive = Math.max(0, ChronoUnit.DAYS.between(createdDate, now));

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
            String txnId = generateNumericTxnId();
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
        String txnId = generateNumericTxnId();
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
        String txnId = generateNumericTxnId();
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
        LocalDate createdDate = sav.getCreatedAt() != null ? sav.getCreatedAt() : now;
        long daysActive = Math.max(0, ChronoUnit.DAYS.between(createdDate, now));

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

    @Transactional
    public ApiResponse<List<SavingsInterestRate>> updateSavingsInterestRates(List<Map<String, Object>> rates) {
        if (rates == null || rates.isEmpty()) {
            return ApiResponse.error("Danh sách lãi suất không hợp lệ");
        }
        for (Map<String, Object> r : rates) {
            Integer term = null;
            if (r.get("term") != null) term = Integer.valueOf(String.valueOf(r.get("term")));
            else if (r.get("termMonths") != null) term = Integer.valueOf(String.valueOf(r.get("termMonths")));

            BigDecimal rate = null;
            if (r.get("rate") != null) rate = new BigDecimal(String.valueOf(r.get("rate")));
            else if (r.get("annualRate") != null) rate = new BigDecimal(String.valueOf(r.get("annualRate")));

            if (term != null && rate != null) {
                Optional<SavingsInterestRate> existingOpt = savingsInterestRateRepository.findByTermMonthsAndIsActiveTrue(term);
                if (existingOpt.isPresent()) {
                    SavingsInterestRate existing = existingOpt.get();
                    existing.setAnnualRate(rate);
                    savingsInterestRateRepository.save(existing);
                } else {
                    String label = term == 0 ? "Không kỳ hạn" : (term + " Tháng");
                    BigDecimal minAmount = term == 0 ? BigDecimal.valueOf(100000) : BigDecimal.valueOf(1000000);
                    SavingsInterestRate newRate = new SavingsInterestRate(term, label, rate, minAmount);
                    savingsInterestRateRepository.save(newRate);
                }
            }
        }
        List<SavingsInterestRate> list = savingsInterestRateRepository.findByIsActiveTrueOrderByTermMonthsAsc();
        return ApiResponse.ok("Cập nhật biểu lãi suất tiết kiệm thành công", list);
    }

    // ═══════════════════════════════════════════════════════════
    // BIỂU LÃI SUẤT CHO VAY (Loan Interest Rates)
    // ═══════════════════════════════════════════════════════════

    private final Map<String, Map<String, Object>> loanInterestRates = new java.util.concurrent.ConcurrentHashMap<>(Map.of(
        "CONSUMER", new java.util.concurrent.ConcurrentHashMap<>(Map.of("6", 8.90, "12", 9.50, "24", 10.50, "36", 11.50, "48", 12.00, "60", 12.50)),
        "CAR", new java.util.concurrent.ConcurrentHashMap<>(Map.of("12", 7.80, "24", 8.20, "36", 8.50, "48", 8.90, "60", 9.20, "84", 9.80)),
        "MORTGAGE", new java.util.concurrent.ConcurrentHashMap<>(Map.of("36", 6.80, "60", 7.50, "120", 8.20, "180", 8.60, "240", 8.90)),
        "BUSINESS", new java.util.concurrent.ConcurrentHashMap<>(Map.of("6", 6.80, "12", 7.50, "24", 7.80, "36", 8.00, "60", 8.40, "120", 8.80))
    ));

    public ApiResponse<Map<String, Map<String, Object>>> getLoanInterestRates() {
        return ApiResponse.ok("Lấy biểu lãi suất cho vay thành công", loanInterestRates);
    }

    public ApiResponse<Map<String, Map<String, Object>>> updateLoanInterestRates(Map<String, Object> newRates) {
        if (newRates != null) {
            for (Map.Entry<String, Object> entry : newRates.entrySet()) {
                String pkg = entry.getKey();
                if (entry.getValue() instanceof Map<?, ?> termMap) {
                    Map<String, Object> target = loanInterestRates.computeIfAbsent(pkg, k -> new java.util.concurrent.ConcurrentHashMap<>());
                    for (Map.Entry<?, ?> tEntry : termMap.entrySet()) {
                        try {
                            String term = String.valueOf(tEntry.getKey());
                            Double val = Double.valueOf(String.valueOf(tEntry.getValue()));
                            target.put(term, val);
                        } catch (Exception ignored) {}
                    }
                }
            }
        }
        return ApiResponse.ok("Cập nhật biểu lãi suất cho vay thành công", loanInterestRates);
    }

    // ═══════════════════════════════════════════════════════════
    // KHOẢN VAY VỐN (Loans)
    // ═══════════════════════════════════════════════════════════

    @Transactional
    public ApiResponse<Loan> applyLoan(ApplyLoanRequest request, User currentUser) {
        String myCustId = getCustomerIdForUser(currentUser);
        if (myCustId == null && currentUser != null && currentUser.getId() != null) {
            Optional<Customer> custOpt = customerRepository.findByUserId(currentUser.getId());
            if (custOpt.isPresent()) {
                myCustId = custOpt.get().getId();
            }
        }
        if (myCustId == null && request.getAccountNo() != null) {
            Optional<Account> accOpt = accountRepository.findByAccountNo(request.getAccountNo());
            if (accOpt.isPresent()) {
                myCustId = accOpt.get().getCustomerId();
            }
        }
        if (myCustId == null) return ApiResponse.error("Không tìm thấy thông tin khách hàng");

        String id = generateNumericTxnId();
        BigDecimal rate = request.getInterestRate();
        if (rate == null || rate.compareTo(BigDecimal.ZERO) <= 0) {
            rate = BigDecimal.valueOf(10.5);
            if ("CAR".equals(request.getLoanType())) rate = BigDecimal.valueOf(7.8);
            else if ("MORTGAGE".equals(request.getLoanType())) rate = BigDecimal.valueOf(6.8);
            else if ("BUSINESS".equals(request.getLoanType())) rate = BigDecimal.valueOf(6.8);
        }

        int termMonths = request.getTermMonths() != null && request.getTermMonths() > 0 ? request.getTermMonths() : 12;
        BigDecimal monthlyInterestRate = rate.divide(BigDecimal.valueOf(1200), 6, java.math.RoundingMode.HALF_UP);
        BigDecimal monthlyPayment = request.getPrincipalAmount()
            .divide(BigDecimal.valueOf(termMonths), 2, java.math.RoundingMode.HALF_UP)
            .add(request.getPrincipalAmount().multiply(monthlyInterestRate));

        String contractNo = "HDTD-" + java.time.LocalDate.now().getYear() + "-" + (1000 + new java.util.Random().nextInt(9000));
        String customerName = currentUser != null && currentUser.getFullName() != null && !currentUser.getFullName().isBlank()
            ? currentUser.getFullName()
            : customerRepository.findById(myCustId).map(c -> c.getUser() != null ? c.getUser().getFullName() : "Khách hàng").orElse("Khách hàng");

        Loan loan = new Loan();
        loan.setId("LOAN-" + id);
        loan.setContractNo(contractNo);
        loan.setCustomerId(myCustId);
        loan.setCustomerName(customerName);
        loan.setAccountNo(request.getAccountNo());
        loan.setLoanType(request.getLoanType());
        loan.setTitle(request.getTitle() != null && !request.getTitle().isBlank() ? request.getTitle() : "Vay vốn tín dụng");
        loan.setPrincipalAmount(request.getPrincipalAmount());
        loan.setRemainingBalance(request.getPrincipalAmount());
        loan.setTermMonths(termMonths);
        loan.setInterestRate(rate);
        loan.setMonthlyPayment(monthlyPayment);
        loan.setNextDueDate("Chờ giải ngân");
        loan.setInstallmentPaidCount(0);
        loan.setStatus("PENDING");
        loan.setAppliedAt(LocalDateTime.now());

        loanRepository.save(loan);

        // Tạo thông báo gửi cho khách hàng (Thông tin tiếp nhận hồ sơ, chưa giải ngân tiền)
        String notifMsg = "Hồ sơ đăng ký vay vốn [" + loan.getTitle() + "] số tiền " + formatMoney(request.getPrincipalAmount()) + " VNĐ (" + contractNo + ") đã được tiếp nhận và chuyển chuyên viên thẩm định.";
        pushBalanceNotification(myCustId, request.getAccountNo(), "Đăng ký vay vốn thành công", notifMsg, BigDecimal.ZERO, null, "INFO");

        // Tạo thông báo đẩy cho Giao dịch viên trên toàn hệ thống
        try {
            Notification tellerNotif = new Notification(
                generateNumericTxnId(),
                "TELLER_ALL",
                request.getAccountNo(),
                "Hồ sơ vay vốn mới cần thẩm định",
                String.format("Khách hàng %s gửi hồ sơ vay %s VNĐ (%s, HĐ: %s). Cần duyệt hồ sơ tại quầy.",
                    customerName, formatMoney(request.getPrincipalAmount()), loan.getTitle(), contractNo),
                request.getPrincipalAmount(),
                BigDecimal.ZERO,
                "LOAN",
                "TELLER",
                false,
                LocalDateTime.now()
            );
            notificationRepository.save(tellerNotif);
        } catch (Exception ignored) {}

        return ApiResponse.ok("Nộp hồ sơ vay vốn thành công! Hồ sơ đang được chuyên viên tín dụng thẩm định.", loan);
    }

    public ApiResponse<List<Loan>> getLoans(User currentUser) {
        String myCustId = getCustomerIdForUser(currentUser);
        if (myCustId == null && currentUser != null && currentUser.getId() != null) {
            Optional<Customer> custOpt = customerRepository.findByUserId(currentUser.getId());
            if (custOpt.isPresent()) {
                myCustId = custOpt.get().getId();
            }
        }
        if (myCustId == null) {
            return ApiResponse.ok("Lấy danh sách khoản vay thành công", List.of());
        }
        List<Loan> list = loanRepository.findByCustomerIdOrderByAppliedAtDesc(myCustId);
        return ApiResponse.ok("Lấy danh sách khoản vay thành công", list);
    }

    @Transactional
    public ApiResponse<Object> payLoan(String loanId, boolean isPayOffAll, User currentUser, String idempotencyKey) {
        Optional<Loan> loanOpt = loanRepository.findById(loanId);
        if (loanOpt.isEmpty()) {
            loanOpt = loanRepository.findAll().stream()
                .filter(l -> loanId.equals(l.getId()) || loanId.equals(l.getContractNo()))
                .findFirst();
        }

        if (loanOpt.isEmpty()) {
            return ApiResponse.error("Khoản vay không tồn tại");
        }

        Loan loan = loanOpt.get();
        String myCustId = currentUser != null ? getCustomerIdForUser(currentUser) : null;
        if (myCustId == null) {
            myCustId = loan.getCustomerId();
        }

        if (myCustId != null && !myCustId.equals(loan.getCustomerId())) {
            return ApiResponse.error("Bạn không có quyền thao tác trên khoản vay này");
        }

        if (!"ACTIVE".equalsIgnoreCase(loan.getStatus())) {
            return ApiResponse.error("Khoản vay hiện không trong trạng thái hoạt động để thanh toán");
        }

        // Tìm tài khoản trích nợ
        Optional<Account> payAccOpt = accountRepository.findByAccountNo(loan.getAccountNo());
        if (payAccOpt.isEmpty()) {
            payAccOpt = accountRepository.findByCustomerId(myCustId).stream()
                .filter(a -> "PAYMENT".equalsIgnoreCase(a.getType()) && "ACTIVE".equalsIgnoreCase(a.getStatus()))
                .findFirst();
        }

        if (payAccOpt.isEmpty()) {
            return ApiResponse.error("Không tìm thấy tài khoản thanh toán để trích nợ");
        }

        Account payAcc = payAccOpt.get();

        BigDecimal payAmount;
        BigDecimal penaltyFee = BigDecimal.ZERO;

        if (isPayOffAll) {
            // Phí phạt tất toán trước hạn (1.5% trên số dư nợ còn lại)
            penaltyFee = loan.getRemainingBalance()
                .multiply(BigDecimal.valueOf(0.015))
                .setScale(0, java.math.RoundingMode.HALF_UP);
            payAmount = loan.getRemainingBalance().add(penaltyFee);
        } else {
            payAmount = loan.getMonthlyPayment() != null && loan.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0
                ? loan.getMonthlyPayment().min(loan.getRemainingBalance())
                : loan.getRemainingBalance();
        }

        if (payAcc.getBalance().compareTo(payAmount) < 0) {
            String msg = "Số dư tài khoản " + payAcc.getAccountNo() + " không đủ để thanh toán nợ. Cần: " + formatMoney(payAmount) + " VNĐ";
            if (penaltyFee.compareTo(BigDecimal.ZERO) > 0) {
                msg += " (Gồm " + formatMoney(penaltyFee) + " VNĐ phí tất toán trước hạn 1.5%)";
            }
            msg += ", Hiện có: " + formatMoney(payAcc.getBalance()) + " VNĐ";
            return ApiResponse.error(msg);
        }

        // Trừ tiền tài khoản
        payAcc.setBalance(payAcc.getBalance().subtract(payAmount));
        accountRepository.save(payAcc);

        String contractOrId = loan.getContractNo() != null && !loan.getContractNo().isBlank() ? loan.getContractNo() : loan.getId();

        if (isPayOffAll) {
            loan.setRemainingBalance(BigDecimal.ZERO);
            loan.setStatus("PAID_OFF");
        } else {
            BigDecimal termMonthsBd = BigDecimal.valueOf(loan.getTermMonths() != null && loan.getTermMonths() > 0 ? loan.getTermMonths() : 12);
            BigDecimal monthlyPrincipal = loan.getPrincipalAmount().divide(termMonthsBd, 0, java.math.RoundingMode.HALF_UP);
            BigDecimal newRemaining = loan.getRemainingBalance().subtract(monthlyPrincipal);
            if (newRemaining.compareTo(BigDecimal.ZERO) <= 0) {
                newRemaining = BigDecimal.ZERO;
            }
            loan.setRemainingBalance(newRemaining);

            int paidCount = (loan.getInstallmentPaidCount() != null ? loan.getInstallmentPaidCount() : 0) + 1;
            loan.setInstallmentPaidCount(paidCount);

            if (newRemaining.compareTo(BigDecimal.ZERO) <= 0 || (loan.getTermMonths() != null && paidCount >= loan.getTermMonths())) {
                loan.setRemainingBalance(BigDecimal.ZERO);
                loan.setStatus("PAID_OFF");
                loan.setNextDueDate("Đã tất toán");
            } else {
                try {
                    LocalDateTime baseTime = loan.getApprovedAt() != null ? loan.getApprovedAt() 
                        : (loan.getAppliedAt() != null ? loan.getAppliedAt() : LocalDateTime.now());
                    java.time.LocalDate nextDue = baseTime.toLocalDate().plusMonths(paidCount + 1);
                    loan.setNextDueDate(nextDue.toString());
                } catch (Exception ignored) {
                    loan.setNextDueDate(java.time.LocalDate.now().plusMonths(1).toString());
                }
            }
        }
        loanRepository.save(loan);

        // Tạo Transaction
        String txnId = generateNumericTxnId();
        String txnDesc = isPayOffAll
            ? "Tất toán toàn bộ hợp đồng tín dụng " + contractOrId
            : "Thanh toán kỳ nợ số " + (loan.getInstallmentPaidCount() != null ? loan.getInstallmentPaidCount() : 1) + " hợp đồng " + contractOrId;

        String payerName = currentUser != null && currentUser.getFullName() != null && !currentUser.getFullName().isBlank()
            ? currentUser.getFullName()
            : (loan.getCustomerName() != null && !loan.getCustomerName().isBlank() ? loan.getCustomerName() : "Khách hàng");

        Transaction txn = new Transaction(
            txnId,
            idempotencyKey,
            payAcc.getAccountNo(),
            payerName,
            contractOrId,
            "QuangTrung Bank - Thu nợ " + contractOrId,
            payAmount,
            penaltyFee,
            "LOAN_REPAYMENT",
            txnDesc,
            LocalDateTime.now(),
            "SUCCESS"
        );
        transactionRepository.save(txn);

        // Tạo Notification
        String notifMsg = "Tài khoản " + payAcc.getAccountNo() + " -" + formatMoney(payAmount) + " VNĐ. "
            + (isPayOffAll ? "Tất toán hợp đồng " : "Thanh toán kỳ nợ ") + contractOrId;
        pushBalanceNotification(myCustId, payAcc.getAccountNo(), "Biến động số dư Nợ (-)", notifMsg, payAmount, payAcc.getBalance(), "MONEY_OUT");

        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("loanId", loan.getId());
        data.put("contractNo", loan.getContractNo());
        data.put("paidAmount", payAmount);
        data.put("remainingBalance", loan.getRemainingBalance());
        data.put("status", loan.getStatus());
        data.put("installmentPaidCount", loan.getInstallmentPaidCount());
        data.put("accountBalance", payAcc.getBalance());

        String successMsg = "Thanh toán " + (isPayOffAll ? "tất toán toàn bộ" : "kỳ nợ") + " thành công " + formatMoney(payAmount) + " VNĐ! Dư nợ gốc còn lại: " + formatMoney(loan.getRemainingBalance()) + " VNĐ";
        return ApiResponse.ok(successMsg, data);
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
        if (currentUser != null && ("TELLER".equals(currentUser.getRole()) || "ADMIN".equals(currentUser.getRole()))) {
            List<Notification> list = notificationRepository.findByRecipientRoleOrderByCreatedAtDesc(currentUser.getRole());
            return ApiResponse.ok("Lấy danh sách thông báo thành công", list);
        }
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
        Optional<Notification> notifOpt = notificationRepository.findById(notificationId);
        if (notifOpt.isPresent()) {
            Notification n = notifOpt.get();
            if (currentUser != null && ("TELLER".equals(currentUser.getRole()) || "ADMIN".equals(currentUser.getRole()))) {
                n.setRead(true);
                notificationRepository.save(n);
                return ApiResponse.ok("Đã đánh dấu thông báo là đã đọc", notificationId);
            }
            String customerId = getCustomerIdForUser(currentUser);
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
        if (currentUser != null && ("TELLER".equals(currentUser.getRole()) || "ADMIN".equals(currentUser.getRole()))) {
            List<Notification> list = notificationRepository.findByRecipientRoleOrderByCreatedAtDesc(currentUser.getRole());
            list.forEach(n -> n.setRead(true));
            notificationRepository.saveAll(list);
            return ApiResponse.ok("Đã đánh dấu tất cả thông báo là đã đọc", currentUser.getRole());
        }
        String customerId = getCustomerIdForUser(currentUser);
        if (customerId == null) return ApiResponse.error("Không tìm thấy thông tin khách hàng");

        List<Notification> list = notificationRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
        list.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(list);
        return ApiResponse.ok("Đã đánh dấu tất cả thông báo là đã đọc", customerId);
    }
}
