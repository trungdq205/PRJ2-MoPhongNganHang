package com.quangtrungbank.grpc;

import com.quangtrungbank.dto.*;
import com.quangtrungbank.entity.*;
import com.quangtrungbank.repository.*;
import com.quangtrungbank.service.AuthService;
import com.quangtrungbank.service.CustomerService;
import com.quangtrungbank.service.TellerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
public class GrpcBankService {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private AuthService authService;

    @Autowired
    private TellerService tellerService;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;

    public User resolveUserIfNull(User currentUser, String accountNo) {
        if (currentUser != null) return currentUser;
        if (accountNo == null || accountNo.isBlank()) return null;
        Optional<Account> accOpt = accountRepository.findByAccountNo(accountNo.trim());
        if (accOpt.isPresent()) {
            Optional<Customer> custOpt = customerRepository.findById(accOpt.get().getCustomerId());
            return custOpt.map(Customer::getUser).orElse(null);
        }
        return null;
    }

    public BigDecimal parseBigDecimal(Object val) {
        if (val == null) return null;
        if (val instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue());
        }
        String str = val.toString().trim();
        if (str.isEmpty()) return null;
        try {
            return new BigDecimal(str);
        } catch (Exception e) {
            return null;
        }
    }

    public Integer parseInteger(Object val) {
        if (val == null) return null;
        if (val instanceof Number n) {
            return n.intValue();
        }
        String str = val.toString().trim();
        if (str.isEmpty()) return null;
        try {
            return Integer.parseInt(str);
        } catch (Exception e) {
            return null;
        }
    }

    public String getString(Map<String, Object> req, String... keys) {
        if (req == null) return null;
        for (String k : keys) {
            Object v = req.get(k);
            if (v != null) {
                String s = v.toString().trim();
                if (!s.isEmpty()) return s;
            }
        }
        return null;
    }

    // === Authentication RPCs ===
    public Map<String, Object> loginRpc(Map<String, Object> req) {
        Map<String, Object> result = new HashMap<>();
        String username = getString(req, "username");
        String password = getString(req, "password");

        AuthService.LoginResult res = authService.login(username, password);
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        if (res.isSuccess() && res.getData() != null) {
            LoginResponse d = res.getData();
            result.put("token", d.getToken());
            result.put("username", d.getUsername());
            result.put("role", d.getRole());
            result.put("full_name", d.getFullName());
            result.put("email", d.getEmail());
            result.put("phone", d.getPhone());
            if (d.getUserId() != null) {
                customerRepository.findByUserId(d.getUserId()).ifPresent(c -> result.put("customer_id", c.getId()));
            }
            result.put("data", d);
        }
        return result;
    }

    public Map<String, Object> faceLoginRpc(Map<String, Object> req) {
        Map<String, Object> result = new HashMap<>();
        FaceLoginRequest dto = new FaceLoginRequest();
        dto.setUsername(getString(req, "username"));
        dto.setFaceData(getString(req, "face_data", "faceData"));
        Object scoreObj = req.get("liveness_score") != null ? req.get("liveness_score") : req.get("livenessScore");
        dto.setLivenessScore(scoreObj != null ? Double.parseDouble(scoreObj.toString()) : 99.5);

        AuthService.LoginResult res = authService.loginWithFace(dto);
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        if (res.isSuccess() && res.getData() != null) {
            LoginResponse d = res.getData();
            result.put("token", d.getToken());
            result.put("username", d.getUsername());
            result.put("role", d.getRole());
            result.put("full_name", d.getFullName());
            result.put("email", d.getEmail());
            result.put("phone", d.getPhone());
            if (d.getUserId() != null) {
                customerRepository.findByUserId(d.getUserId()).ifPresent(c -> result.put("customer_id", c.getId()));
            }
            result.put("data", d);
        }
        return result;
    }

    public Map<String, Object> resetLocksRpc() {
        authService.resetAllLocks();
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Đã giải phóng toàn bộ khóa tài khoản thành công");
        result.put("data", "SUCCESS");
        return result;
    }

    public Map<String, Object> changePasswordRpc(Map<String, Object> req, User currentUser) {
        ChangePasswordRequest dto = new ChangePasswordRequest();
        dto.setCurrentPassword(getString(req, "current_password", "currentPassword"));
        dto.setNewPassword(getString(req, "new_password", "newPassword"));
        dto.setConfirmPassword(getString(req, "confirm_password", "confirmPassword"));

        ApiResponse<String> res = customerService.changePassword(dto, currentUser);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> updateProfileRpc(Map<String, Object> req, User currentUser) {
        UpdateProfileRequest dto = new UpdateProfileRequest();
        dto.setEmail(getString(req, "email"));

        ApiResponse<User> res = customerService.updateProfile(dto, currentUser);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        if (res.getData() != null) {
            result.put("username", res.getData().getUsername());
            result.put("email", res.getData().getEmail());
            result.put("role", res.getData().getRole());
            result.put("data", res.getData());
        }
        return result;
    }

    // === Account RPCs ===
    public Map<String, Object> getAccountsRpc(Map<String, Object> req, User currentUser) {
        String customerId = getString(req, "customer_id", "customerId");
        if ((customerId == null || customerId.isBlank()) && currentUser != null && currentUser.getId() != null) {
            Optional<Customer> custOpt = customerRepository.findByUserId(currentUser.getId());
            if (custOpt.isPresent()) {
                customerId = custOpt.get().getId();
            }
        }
        ApiResponse<List<Account>> res = customerService.getAccounts(customerId, currentUser);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("accounts", res.getData() != null ? res.getData() : List.of());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> lookupAccountRpc(Map<String, Object> req) {
        String accountNo = getString(req, "account_no", "accountNo");
        ApiResponse<Object> res = customerService.lookupAccount(accountNo);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        if (res.getData() instanceof Map<?,?> map) {
            result.put("account_no", map.get("accountNo"));
            result.put("customer_name", map.get("customerName"));
            result.put("bank_name", map.get("bankName"));
        }
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> submitKycRpc(Map<String, Object> req, User currentUser) {
        SubmitKycRequest dto = new SubmitKycRequest();
        dto.setIdCardFront(getString(req, "front_image_url", "frontImageUrl", "id_card_front", "idCardFront"));
        dto.setIdCardBack(getString(req, "back_image_url", "backImageUrl", "id_card_back", "idCardBack"));
        dto.setSelfiePhoto(getString(req, "face_image_url", "faceImageUrl", "selfie_photo", "selfiePhoto"));

        ApiResponse<Customer> res = customerService.submitKyc(dto, currentUser);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("data", res.getData());
        return result;
    }

    // === Transaction RPCs ===
    @Transactional
    public Map<String, Object> transferMoneyRpc(Map<String, Object> req, User currentUser) {
        Map<String, Object> result = new HashMap<>();
        try {
            TransferRequest dto = new TransferRequest();
            String fromAcc = getString(req, "from_account", "fromAccount", "fromAccNo");
            String toAcc = getString(req, "to_account", "toAccount", "toAccNo");
            dto.setFromAccNo(fromAcc);
            dto.setToAccNo(toAcc);

            Object amountObj = req.get("amount") != null ? req.get("amount") : req.get("deposit_amount");
            dto.setAmount(parseBigDecimal(amountObj));

            dto.setContent(getString(req, "content", "note", "description"));
            dto.setIdempotencyKey(getString(req, "idempotency_key", "idempotencyKey"));

            User effectiveUser = resolveUserIfNull(currentUser, dto.getFromAccNo());
            ApiResponse<Transaction> resp = customerService.transfer(dto, effectiveUser, dto.getIdempotencyKey());

            result.put("success", resp.isSuccess());
            result.put("message", resp.getMessage());

            Map<String, Object> data = new HashMap<>();
            if (resp.getData() != null) {
                Transaction t = resp.getData();
                data.put("id", t.getId());
                data.put("transactionId", t.getId());
                data.put("amount", t.getAmount());
                data.put("fee", t.getFee());
                data.put("timestamp", t.getTimestamp());
                data.put("content", t.getContent());
                data.put("type", t.getType());
                data.put("status", t.getStatus());
                data.put("fromAccount", t.getFromAccount());
                data.put("fromName", t.getFromName());
                data.put("toAccount", t.getToAccount());
                data.put("toName", t.getToName());
                data.put("idempotencyKey", t.getIdempotencyKey());

                result.put("transaction_id", t.getId());
                result.put("amount", t.getAmount());
                result.put("fee", t.getFee());
                result.put("timestamp", t.getTimestamp());
            }
            result.put("data", data.isEmpty() ? null : data);
            return result;
        } catch (Exception ex) {
            result.put("success", false);
            result.put("message", ex.getMessage() != null ? ex.getMessage() : "Lỗi xử lý chuyển tiền qua gRPC RPC");
            result.put("data", null);
            return result;
        }
    }

    @Transactional
    public Map<String, Object> atmDepositRpc(Map<String, Object> req, User currentUser) {
        AtmTransactionRequest dto = new AtmTransactionRequest();
        dto.setAccountNo(getString(req, "account_no", "accountNo"));
        dto.setAmount(parseBigDecimal(req.get("amount")));
        dto.setIdempotencyKey(getString(req, "idempotency_key", "idempotencyKey"));
        dto.setPin(getString(req, "pin"));

        User effectiveUser = resolveUserIfNull(currentUser, dto.getAccountNo());
        ApiResponse<Transaction> res = customerService.atmDeposit(dto, effectiveUser, dto.getIdempotencyKey());
        return mapTransactionResponse(res);
    }

    @Transactional
    public Map<String, Object> atmWithdrawRpc(Map<String, Object> req, User currentUser) {
        AtmTransactionRequest dto = new AtmTransactionRequest();
        dto.setAccountNo(getString(req, "account_no", "accountNo"));
        dto.setAmount(parseBigDecimal(req.get("amount")));
        dto.setIdempotencyKey(getString(req, "idempotency_key", "idempotencyKey"));
        dto.setPin(getString(req, "pin"));

        User effectiveUser = resolveUserIfNull(currentUser, dto.getAccountNo());
        ApiResponse<Transaction> res = customerService.atmWithdraw(dto, effectiveUser, dto.getIdempotencyKey());
        return mapTransactionResponse(res);
    }

    @Transactional
    public Map<String, Object> vnpostWithdrawRpc(Map<String, Object> req, User currentUser) {
        TransferRequest dto = new TransferRequest();
        dto.setFromAccNo(getString(req, "from_account", "fromAccount", "fromAccNo"));
        dto.setAmount(parseBigDecimal(req.get("amount")));
        dto.setIdempotencyKey(getString(req, "idempotency_key", "idempotencyKey"));

        User effectiveUser = resolveUserIfNull(currentUser, dto.getFromAccNo());
        ApiResponse<Transaction> res = customerService.vnpostWithdraw(dto, effectiveUser, dto.getIdempotencyKey());
        return mapTransactionResponse(res);
    }

    @Transactional
    public Map<String, Object> vnpostTransferRpc(Map<String, Object> req, User currentUser) {
        TransferRequest dto = new TransferRequest();
        dto.setFromAccNo(getString(req, "from_account", "fromAccount", "fromAccNo"));
        dto.setToAccNo(getString(req, "to_account", "toAccount", "toAccNo"));
        dto.setAmount(parseBigDecimal(req.get("amount")));
        dto.setContent(getString(req, "content", "note"));
        dto.setIdempotencyKey(getString(req, "idempotency_key", "idempotencyKey"));

        User effectiveUser = resolveUserIfNull(currentUser, dto.getFromAccNo());
        ApiResponse<Transaction> res = customerService.vnpostTransfer(dto, effectiveUser, dto.getIdempotencyKey());
        return mapTransactionResponse(res);
    }

    private Map<String, Object> mapTransactionResponse(ApiResponse<Transaction> res) {
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        if (res.getData() != null) {
            Transaction t = res.getData();
            result.put("transaction_id", t.getId());
            result.put("amount", t.getAmount());
            result.put("fee", t.getFee());
            result.put("type", t.getType());
            result.put("status", t.getStatus());
            result.put("timestamp", t.getTimestamp());
            result.put("from_account", t.getFromAccount());
            result.put("to_account", t.getToAccount());
            result.put("content", t.getContent());
            result.put("data", t);
        }
        return result;
    }

    public Map<String, Object> getTransactionHistoryRpc(Map<String, Object> req, User currentUser) {
        String accountNo = getString(req, "account_no", "accountNo");
        String fromDate = getString(req, "from_date", "fromDate");
        String toDate = getString(req, "to_date", "toDate");
        String type = getString(req, "type");
        BigDecimal minAmount = parseBigDecimal(req.get("min_amount") != null ? req.get("min_amount") : req.get("minAmount"));
        BigDecimal maxAmount = parseBigDecimal(req.get("max_amount") != null ? req.get("max_amount") : req.get("maxAmount"));
        String search = getString(req, "search");
        int page = parseInteger(req.get("page")) != null ? parseInteger(req.get("page")) : 0;
        int size = parseInteger(req.get("size")) != null ? parseInteger(req.get("size")) : 10;

        User effectiveUser = resolveUserIfNull(currentUser, accountNo);
        ApiResponse<PageResult<Transaction>> res = customerService.getHistoryFiltered(
                accountNo, fromDate, toDate, type, minAmount, maxAmount, search, page, size, effectiveUser
        );

        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        if (res.getData() != null) {
            result.put("total_elements", res.getData().getTotalElements());
            result.put("total_pages", res.getData().getTotalPages());
            result.put("current_page", res.getData().getPage());
            result.put("transactions", res.getData().getContent());
            result.put("data", res.getData());
        } else {
            result.put("total_elements", 0);
            result.put("total_pages", 0);
            result.put("current_page", 0);
            result.put("transactions", List.of());
        }
        return result;
    }

    public Object getAccountStatementRpc(Map<String, Object> req, User currentUser) {
        String accountNo = getString(req, "account_no", "accountNo");
        String fromDate = getString(req, "from_date", "fromDate");
        String toDate = getString(req, "to_date", "toDate");

        User effectiveUser = resolveUserIfNull(currentUser, accountNo);
        ApiResponse<StatementResponse> resp = customerService.getEStatement(accountNo, fromDate, toDate, effectiveUser);
        return resp != null ? resp.getData() : null;
    }

    // === Cardless ATM Codes ===
    public Map<String, Object> createAtmCodeRpc(Map<String, Object> req, User currentUser) {
        CreateAtmCodeRequest dto = new CreateAtmCodeRequest();
        dto.setAccountNo(getString(req, "account_no", "accountNo"));
        dto.setType(getString(req, "type"));
        dto.setAmount(parseBigDecimal(req.get("amount")));
        dto.setPin(getString(req, "pin"));

        User effectiveUser = resolveUserIfNull(currentUser, dto.getAccountNo());
        ApiResponse<AtmCode> res = customerService.createAtmCode(dto, effectiveUser);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> getAtmCodesRpc(User currentUser) {
        ApiResponse<List<AtmCode>> res = customerService.getAtmCodes(currentUser);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("codes", res.getData() != null ? res.getData() : List.of());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> cancelAtmCodeRpc(Map<String, Object> req, User currentUser) {
        String codeId = getString(req, "code_id", "codeId");
        ApiResponse<String> res = customerService.cancelAtmCode(codeId, currentUser);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("data", res.getData());
        return result;
    }

    // === Savings RPCs ===
    @Transactional
    public Map<String, Object> openSavingsRpc(Map<String, Object> req, User currentUser) {
        Map<String, Object> result = new HashMap<>();
        try {
            OpenSavingsRequest dto = new OpenSavingsRequest();
            String srcAcc = getString(req, "source_account", "sourceAccount", "sourceAccountNo", "from_account");
            dto.setSourceAccountNo(srcAcc);

            Object amountObj = req.get("amount") != null ? req.get("amount") : req.get("deposit_amount");
            dto.setDepositAmount(parseBigDecimal(amountObj));

            Object termObj = req.get("term_months") != null ? req.get("term_months") : req.get("termMonths");
            dto.setTermMonths(parseInteger(termObj));

            dto.setRenewType(getString(req, "renew_type", "renewType"));
            dto.setSavingsType(getString(req, "savings_type", "savingsType"));
            dto.setIdempotencyKey(getString(req, "idempotency_key", "idempotencyKey"));

            User effectiveUser = resolveUserIfNull(currentUser, dto.getSourceAccountNo());
            ApiResponse<SavingsAccount> resp = customerService.openSavings(dto, effectiveUser, dto.getIdempotencyKey());

            result.put("success", resp.isSuccess());
            result.put("message", resp.getMessage());
            if (resp.getData() != null) {
                SavingsAccount s = resp.getData();
                result.put("savings_no", s.getSavingsNo());
                result.put("deposit_amount", s.getDepositAmount());
                result.put("term_months", s.getTermMonths());
                result.put("interest_rate", s.getInterestRate());
                result.put("expected_interest", s.getExpectedInterest());
                result.put("status", s.getStatus());
                result.put("maturity_date", s.getMaturityDate());
                result.put("data", s);
            }
            return result;
        } catch (Exception ex) {
            result.put("success", false);
            result.put("message", ex.getMessage() != null ? ex.getMessage() : "Lỗi mở tài khoản tiết kiệm qua gRPC RPC");
            return result;
        }
    }

    @Transactional
    public Map<String, Object> closeSavingsRpc(Map<String, Object> req, User currentUser) {
        Map<String, Object> result = new HashMap<>();
        try {
            String savingsNo = getString(req, "savings_no", "savingsNo", "savingsId");
            String idempotencyKey = getString(req, "idempotency_key", "idempotencyKey");
            Boolean isEarly = Boolean.parseBoolean(String.valueOf(req.getOrDefault("is_early_close", req.get("isEarlyClose"))));
            BigDecimal partialAmount = parseBigDecimal(req.get("partial_amount") != null ? req.get("partial_amount") : req.get("partialAmount"));

            CloseSavingsRequest closeReq = new CloseSavingsRequest();
            closeReq.setSavingsId(savingsNo);
            closeReq.setEarlyClose(isEarly);
            closeReq.setPartialAmount(partialAmount);
            closeReq.setIdempotencyKey(idempotencyKey);

            ApiResponse<Object> resp = customerService.closeSavings(closeReq, currentUser, idempotencyKey);

            result.put("success", resp.isSuccess());
            result.put("message", resp.getMessage());
            result.put("data", resp.getData());
            if (resp.getData() instanceof SavingsAccount s) {
                result.put("savings_no", s.getSavingsNo());
                result.put("deposit_amount", s.getDepositAmount());
                result.put("actual_paid", s.getActualInterestPaid());
                result.put("status", s.getStatus());
            }
            return result;
        } catch (Exception ex) {
            result.put("success", false);
            result.put("message", ex.getMessage() != null ? ex.getMessage() : "Lỗi tất toán tài khoản tiết kiệm qua gRPC RPC");
            return result;
        }
    }

    @Transactional
    public Map<String, Object> topUpSavingsRpc(Map<String, Object> req, User currentUser) {
        TopUpSavingsRequest dto = new TopUpSavingsRequest();
        dto.setSavingsId(getString(req, "savings_no", "savingsNo", "savingsId"));
        dto.setSourceAccountNo(getString(req, "source_account", "sourceAccount", "sourceAccountNo"));
        dto.setAmount(parseBigDecimal(req.get("amount")));
        dto.setIdempotencyKey(getString(req, "idempotency_key", "idempotencyKey"));

        User effectiveUser = resolveUserIfNull(currentUser, dto.getSourceAccountNo());
        ApiResponse<SavingsAccount> res = customerService.topUpSavings(dto, effectiveUser, dto.getIdempotencyKey());
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> getSavingsDetailRpc(Map<String, Object> req, User currentUser) {
        String savingsId = getString(req, "savings_id", "savingsId", "savings_no");
        ApiResponse<SavingsDetailResponse> res = customerService.getSavingsDetail(savingsId, currentUser);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> getSavingsAccountsRpc(User currentUser) {
        ApiResponse<List<SavingsAccount>> res = customerService.getSavings(currentUser);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("savings_list", res.getData() != null ? res.getData() : List.of());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> getSavingsInterestRatesRpc() {
        ApiResponse<List<SavingsInterestRate>> res = customerService.getSavingsInterestRates();
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("rates", res.getData() != null ? res.getData() : List.of());
        result.put("data", res.getData());
        return result;
    }

    // === Loans RPCs ===
    public Map<String, Object> applyLoanRpc(Map<String, Object> req, User currentUser) {
        ApplyLoanRequest dto = new ApplyLoanRequest();
        dto.setAccountNo(getString(req, "account_no", "accountNo"));
        dto.setLoanType(getString(req, "loan_type", "loanType"));
        dto.setTitle(getString(req, "title"));
        dto.setPrincipalAmount(parseBigDecimal(req.get("principal_amount") != null ? req.get("principal_amount") : req.get("principalAmount")));
        dto.setTermMonths(parseInteger(req.get("term_months") != null ? req.get("term_months") : req.get("termMonths")));

        User effectiveUser = resolveUserIfNull(currentUser, dto.getAccountNo());
        ApiResponse<Loan> res = customerService.applyLoan(dto, effectiveUser);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> getLoansRpc(User currentUser) {
        ApiResponse<List<Loan>> res = customerService.getLoans(currentUser);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("loans", res.getData() != null ? res.getData() : List.of());
        result.put("data", res.getData());
        return result;
    }

    // === Notifications & Tickets RPCs ===
    public Map<String, Object> getNotificationsRpc(User currentUser) {
        Map<String, Object> result = new HashMap<>();
        if (currentUser == null) {
            result.put("success", false);
            result.put("unread_count", 0);
            result.put("notifications", List.of());
            result.put("data", List.of());
            return result;
        }

        ApiResponse<List<Notification>> resp = customerService.getNotifications(currentUser);
        List<Notification> list = resp != null && resp.getData() != null ? resp.getData() : List.of();
        long unread = list.stream().filter(n -> !n.isRead()).count();

        result.put("success", resp != null && resp.isSuccess());
        result.put("unread_count", unread);
        result.put("notifications", list);
        result.put("data", list);
        return result;
    }

    public Map<String, Object> markNotificationReadRpc(Map<String, Object> req, User currentUser) {
        String id = getString(req, "notification_id", "notificationId", "id");
        ApiResponse<String> res = customerService.markNotificationRead(id, currentUser);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> markAllNotificationsReadRpc(User currentUser) {
        ApiResponse<String> res = customerService.markAllNotificationsRead(currentUser);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> createTicketRpc(Map<String, Object> req, User currentUser) {
        CreateTicketRequest dto = new CreateTicketRequest();
        dto.setSubject(getString(req, "subject"));
        dto.setContent(getString(req, "content"));
        dto.setAccountNo(getString(req, "account_no", "accountNo"));

        ApiResponse<SupportTicket> res = customerService.createTicket(dto, currentUser);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> getTicketsRpc(User currentUser) {
        ApiResponse<List<SupportTicket>> res = customerService.getTickets(currentUser);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("tickets", res.getData() != null ? res.getData() : List.of());
        result.put("data", res.getData());
        return result;
    }

    // === Teller RPCs ===
    public Map<String, Object> tellerCreateCustomerRpc(Map<String, Object> req, User currentTeller) {
        CreateCustomerRequest dto = new CreateCustomerRequest();
        dto.setFullName(getString(req, "full_name", "fullName"));
        dto.setIdCard(getString(req, "id_card", "idCard"));
        dto.setPhone(getString(req, "phone"));
        dto.setEmail(getString(req, "email"));
        dto.setAddress(getString(req, "address"));
        dto.setInitialBalance(parseBigDecimal(req.get("initial_balance") != null ? req.get("initial_balance") : req.get("initialBalance")));

        ApiResponse<Customer> res = tellerService.createCustomer(dto, currentTeller);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> tellerToggleAccountStatusRpc(Map<String, Object> req, User currentTeller) {
        String accountNo = getString(req, "account_no", "accountNo");
        String status = getString(req, "status");

        ApiResponse<Account> res = tellerService.toggleAccountStatus(accountNo, status, currentTeller);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> tellerResolveTicketRpc(Map<String, Object> req, User currentTeller) {
        String ticketId = getString(req, "ticket_id", "ticketId");
        ResolveTicketRequest dto = new ResolveTicketRequest();
        dto.setResponse(getString(req, "response"));
        dto.setStatus(getString(req, "status") != null ? getString(req, "status") : "RESOLVED");

        ApiResponse<SupportTicket> res = tellerService.resolveTicket(ticketId, dto, currentTeller);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> tellerGetAllTicketsRpc(User currentTeller) {
        ApiResponse<List<SupportTicket>> res = tellerService.getAllTickets(currentTeller);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("tickets", res.getData() != null ? res.getData() : List.of());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> tellerUpdateCustomerRpc(Map<String, Object> req, User currentTeller) {
        String customerId = getString(req, "customer_id", "customerId");
        UpdateCustomerRequest dto = new UpdateCustomerRequest();
        dto.setFullName(getString(req, "full_name", "fullName"));
        dto.setPhone(getString(req, "phone"));
        dto.setEmail(getString(req, "email"));
        dto.setAddress(getString(req, "address"));

        ApiResponse<Customer> res = tellerService.updateCustomer(customerId, dto, currentTeller);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("data", res.getData());
        return result;
    }

    public Map<String, Object> tellerApproveKycRpc(Map<String, Object> req, User currentTeller) {
        String customerId = getString(req, "customer_id", "customerId");
        String status = getString(req, "status");

        ApiResponse<Customer> res = tellerService.approveKyc(customerId, status, currentTeller);
        Map<String, Object> result = new HashMap<>();
        result.put("success", res.isSuccess());
        result.put("message", res.getMessage());
        result.put("data", res.getData());
        return result;
    }
}

