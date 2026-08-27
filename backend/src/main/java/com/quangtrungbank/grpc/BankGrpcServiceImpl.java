package com.quangtrungbank.grpc;

import com.quangtrungbank.entity.Account;
import com.quangtrungbank.entity.Customer;
import com.quangtrungbank.entity.User;
import com.quangtrungbank.grpc.generated.*;
import com.quangtrungbank.repository.AccountRepository;
import com.quangtrungbank.repository.CustomerRepository;
import com.quangtrungbank.repository.UserRepository;
import io.grpc.stub.StreamObserver;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class BankGrpcServiceImpl extends BankServiceGrpc.BankServiceImplBase {

    @Autowired
    private GrpcBankService grpcBankService;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private UserRepository userRepository;

    private User resolveUserFromAccount(String accountNo) {
        if (accountNo == null || accountNo.isBlank()) return null;
        Optional<Account> accountOpt = accountRepository.findByAccountNo(accountNo);
        if (accountOpt.isEmpty()) return null;
        Optional<Customer> customerOpt = customerRepository.findById(accountOpt.get().getCustomerId());
        return customerOpt.map(Customer::getUser).orElse(null);
    }

    // === Authentication RPCs ===
    @Override
    public void login(LoginRequest request, StreamObserver<LoginResponse> responseObserver) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("username", request.getUsername());
            req.put("password", request.getPassword());

            Map<String, Object> res = grpcBankService.loginRpc(req);
            LoginResponse response = LoginResponse.newBuilder()
                    .setSuccess(Boolean.TRUE.equals(res.get("success")))
                    .setMessage(String.valueOf(res.getOrDefault("message", "")))
                    .setToken(String.valueOf(res.getOrDefault("token", "")))
                    .setUsername(String.valueOf(res.getOrDefault("username", "")))
                    .setRole(String.valueOf(res.getOrDefault("role", "")))
                    .setFullName(String.valueOf(res.getOrDefault("full_name", "")))
                    .setCustomerId(String.valueOf(res.getOrDefault("customer_id", "")))
                    .setEmail(String.valueOf(res.getOrDefault("email", "")))
                    .setPhone(String.valueOf(res.getOrDefault("phone", "")))
                    .build();
            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception ex) {
            responseObserver.onNext(LoginResponse.newBuilder().setSuccess(false).setMessage(ex.getMessage()).build());
            responseObserver.onCompleted();
        }
    }



    @Override
    public void resetLocks(EmptyRequest request, StreamObserver<SimpleResponse> responseObserver) {
        Map<String, Object> res = grpcBankService.resetLocksRpc();
        responseObserver.onNext(SimpleResponse.newBuilder()
                .setSuccess(true)
                .setMessage(String.valueOf(res.get("message")))
                .setData("SUCCESS")
                .build());
        responseObserver.onCompleted();
    }

    @Override
    public void changePassword(ChangePasswordRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("current_password", request.getCurrentPassword());
            req.put("new_password", request.getNewPassword());
            req.put("confirm_password", request.getConfirmPassword());

            Map<String, Object> res = grpcBankService.changePasswordRpc(req, null);
            responseObserver.onNext(SimpleResponse.newBuilder()
                    .setSuccess(Boolean.TRUE.equals(res.get("success")))
                    .setMessage(String.valueOf(res.getOrDefault("message", "")))
                    .setData(String.valueOf(res.getOrDefault("data", "")))
                    .build());
            responseObserver.onCompleted();
        } catch (Exception ex) {
            responseObserver.onNext(SimpleResponse.newBuilder().setSuccess(false).setMessage(ex.getMessage()).build());
            responseObserver.onCompleted();
        }
    }

    @Override
    public void updateProfile(UpdateProfileRequest request, StreamObserver<UserResponse> responseObserver) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("email", request.getEmail());
            Map<String, Object> res = grpcBankService.updateProfileRpc(req, null);
            responseObserver.onNext(UserResponse.newBuilder()
                    .setSuccess(Boolean.TRUE.equals(res.get("success")))
                    .setMessage(String.valueOf(res.getOrDefault("message", "")))
                    .setUsername(String.valueOf(res.getOrDefault("username", "")))
                    .setEmail(String.valueOf(res.getOrDefault("email", "")))
                    .setRole(String.valueOf(res.getOrDefault("role", "")))
                    .build());
            responseObserver.onCompleted();
        } catch (Exception ex) {
            responseObserver.onNext(UserResponse.newBuilder().setSuccess(false).setMessage(ex.getMessage()).build());
            responseObserver.onCompleted();
        }
    }

    // === Account RPCs ===
    @Override
    public void getAccounts(GetAccountsRequest request, StreamObserver<AccountListResponse> responseObserver) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("customer_id", request.getCustomerId());
            Map<String, Object> res = grpcBankService.getAccountsRpc(req, null);

            AccountListResponse.Builder builder = AccountListResponse.newBuilder()
                    .setSuccess(Boolean.TRUE.equals(res.get("success")))
                    .setMessage(String.valueOf(res.getOrDefault("message", "")));

            if (res.get("accounts") instanceof List<?> list) {
                for (Object item : list) {
                    if (item instanceof Account acc) {
                        builder.addAccounts(AccountItem.newBuilder()
                                .setAccountNo(acc.getAccountNo() != null ? acc.getAccountNo() : "")
                                .setCustomerId(acc.getCustomerId() != null ? acc.getCustomerId() : "")
                                .setAccountType(acc.getType() != null ? acc.getType() : "")
                                .setBalance(acc.getBalance() != null ? acc.getBalance().doubleValue() : 0.0)
                                .setCurrency(acc.getCurrency() != null ? acc.getCurrency() : "VND")
                                .setStatus(acc.getStatus() != null ? acc.getStatus() : "")
                                .setCreatedAt(acc.getCreatedAt() != null ? acc.getCreatedAt().toString() : "")
                                .build());
                    }
                }
            }
            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception ex) {
            responseObserver.onNext(AccountListResponse.newBuilder().setSuccess(false).setMessage(ex.getMessage()).build());
            responseObserver.onCompleted();
        }
    }

    @Override
    public void lookupAccount(LookupAccountRequest request, StreamObserver<LookupAccountResponse> responseObserver) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("account_no", request.getAccountNo());
            Map<String, Object> res = grpcBankService.lookupAccountRpc(req);
            responseObserver.onNext(LookupAccountResponse.newBuilder()
                    .setSuccess(Boolean.TRUE.equals(res.get("success")))
                    .setMessage(String.valueOf(res.getOrDefault("message", "")))
                    .setAccountNo(String.valueOf(res.getOrDefault("account_no", "")))
                    .setCustomerName(String.valueOf(res.getOrDefault("customer_name", "")))
                    .setBankName(String.valueOf(res.getOrDefault("bank_name", "")))
                    .build());
            responseObserver.onCompleted();
        } catch (Exception ex) {
            responseObserver.onNext(LookupAccountResponse.newBuilder().setSuccess(false).setMessage(ex.getMessage()).build());
            responseObserver.onCompleted();
        }
    }

    // === Transaction RPCs ===
    @Override
    public void transferMoney(TransferRequest request, StreamObserver<TransferResponse> responseObserver) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("from_account", request.getFromAccount());
            req.put("to_account", request.getToAccount());
            req.put("amount", request.getAmount());
            req.put("content", request.getContent());
            req.put("idempotency_key", request.getIdempotencyKey());

            User currentUser = resolveUserFromAccount(request.getFromAccount());
            Map<String, Object> res = grpcBankService.transferMoneyRpc(req, currentUser);

            responseObserver.onNext(TransferResponse.newBuilder()
                    .setSuccess(Boolean.TRUE.equals(res.get("success")))
                    .setMessage(String.valueOf(res.getOrDefault("message", "")))
                    .setTransactionId(String.valueOf(res.getOrDefault("transaction_id", "")))
                    .setAmount(res.get("amount") != null ? Double.parseDouble(res.get("amount").toString()) : 0.0)
                    .setFee(res.get("fee") != null ? Double.parseDouble(res.get("fee").toString()) : 0.0)
                    .setBalanceAfter(res.get("balance_after") != null ? Double.parseDouble(res.get("balance_after").toString()) : 0.0)
                    .setTimestamp(String.valueOf(res.getOrDefault("timestamp", "")))
                    .build());
            responseObserver.onCompleted();
        } catch (Exception ex) {
            responseObserver.onNext(TransferResponse.newBuilder().setSuccess(false).setMessage(ex.getMessage()).build());
            responseObserver.onCompleted();
        }
    }

    @Override
    public void atmDeposit(AtmTransactionRequest request, StreamObserver<TransactionResponse> responseObserver) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("account_no", request.getAccountNo());
            req.put("amount", request.getAmount());
            req.put("idempotency_key", request.getIdempotencyKey());
            req.put("pin", request.getPin());

            User currentUser = resolveUserFromAccount(request.getAccountNo());
            Map<String, Object> res = grpcBankService.atmDepositRpc(req, currentUser);
            responseObserver.onNext(buildTransactionResponse(res));
            responseObserver.onCompleted();
        } catch (Exception ex) {
            responseObserver.onNext(TransactionResponse.newBuilder().setSuccess(false).setMessage(ex.getMessage()).build());
            responseObserver.onCompleted();
        }
    }

    @Override
    public void atmWithdraw(AtmTransactionRequest request, StreamObserver<TransactionResponse> responseObserver) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("account_no", request.getAccountNo());
            req.put("amount", request.getAmount());
            req.put("idempotency_key", request.getIdempotencyKey());
            req.put("pin", request.getPin());

            User currentUser = resolveUserFromAccount(request.getAccountNo());
            Map<String, Object> res = grpcBankService.atmWithdrawRpc(req, currentUser);
            responseObserver.onNext(buildTransactionResponse(res));
            responseObserver.onCompleted();
        } catch (Exception ex) {
            responseObserver.onNext(TransactionResponse.newBuilder().setSuccess(false).setMessage(ex.getMessage()).build());
            responseObserver.onCompleted();
        }
    }



    private TransactionResponse buildTransactionResponse(Map<String, Object> res) {
        return TransactionResponse.newBuilder()
                .setSuccess(Boolean.TRUE.equals(res.get("success")))
                .setMessage(String.valueOf(res.getOrDefault("message", "")))
                .setTransactionId(String.valueOf(res.getOrDefault("transaction_id", "")))
                .setAmount(res.get("amount") != null ? Double.parseDouble(res.get("amount").toString()) : 0.0)
                .setFee(res.get("fee") != null ? Double.parseDouble(res.get("fee").toString()) : 0.0)
                .setType(String.valueOf(res.getOrDefault("type", "")))
                .setStatus(String.valueOf(res.getOrDefault("status", "")))
                .setTimestamp(String.valueOf(res.getOrDefault("timestamp", "")))
                .setFromAccount(String.valueOf(res.getOrDefault("from_account", "")))
                .setToAccount(String.valueOf(res.getOrDefault("to_account", "")))
                .setContent(String.valueOf(res.getOrDefault("content", "")))
                .build();
    }

    // === Savings RPCs ===
    @Override
    public void openSavings(OpenSavingsRequest request, StreamObserver<SavingsResponse> responseObserver) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("source_account", request.getSourceAccount());
            req.put("amount", request.getAmount());
            req.put("term_months", request.getTermMonths());
            req.put("renew_type", request.getRenewType());
            req.put("savings_type", request.getSavingsType());
            req.put("idempotency_key", request.getIdempotencyKey());

            User currentUser = resolveUserFromAccount(request.getSourceAccount());
            Map<String, Object> res = grpcBankService.openSavingsRpc(req, currentUser);

            responseObserver.onNext(SavingsResponse.newBuilder()
                    .setSuccess(Boolean.TRUE.equals(res.get("success")))
                    .setMessage(String.valueOf(res.getOrDefault("message", "")))
                    .setSavingsNo(String.valueOf(res.getOrDefault("savings_no", "")))
                    .setDepositAmount(res.get("deposit_amount") != null ? Double.parseDouble(res.get("deposit_amount").toString()) : 0.0)
                    .setTermMonths(res.get("term_months") != null ? Integer.parseInt(res.get("term_months").toString()) : 0)
                    .setInterestRate(res.get("interest_rate") != null ? Double.parseDouble(res.get("interest_rate").toString()) : 0.0)
                    .setExpectedInterest(res.get("expected_interest") != null ? Double.parseDouble(res.get("expected_interest").toString()) : 0.0)
                    .setStatus(String.valueOf(res.getOrDefault("status", "")))
                    .setMaturityDate(String.valueOf(res.getOrDefault("maturity_date", "")))
                    .build());
            responseObserver.onCompleted();
        } catch (Exception ex) {
            responseObserver.onNext(SavingsResponse.newBuilder().setSuccess(false).setMessage(ex.getMessage()).build());
            responseObserver.onCompleted();
        }
    }

    @Override
    public void closeSavings(CloseSavingsRequest request, StreamObserver<SavingsResponse> responseObserver) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("savings_no", request.getSavingsNo());
            req.put("is_early_close", request.getIsEarlyClose());
            req.put("partial_amount", request.getPartialAmount());
            req.put("idempotency_key", request.getIdempotencyKey());

            Map<String, Object> res = grpcBankService.closeSavingsRpc(req, null);
            responseObserver.onNext(SavingsResponse.newBuilder()
                    .setSuccess(Boolean.TRUE.equals(res.get("success")))
                    .setMessage(String.valueOf(res.getOrDefault("message", "")))
                    .setSavingsNo(String.valueOf(res.getOrDefault("savings_no", "")))
                    .setDepositAmount(res.get("deposit_amount") != null ? Double.parseDouble(res.get("deposit_amount").toString()) : 0.0)
                    .setActualPaid(res.get("actual_paid") != null ? Double.parseDouble(res.get("actual_paid").toString()) : 0.0)
                    .setStatus(String.valueOf(res.getOrDefault("status", "")))
                    .build());
            responseObserver.onCompleted();
        } catch (Exception ex) {
            responseObserver.onNext(SavingsResponse.newBuilder().setSuccess(false).setMessage(ex.getMessage()).build());
            responseObserver.onCompleted();
        }
    }

    @Override
    public void getNotifications(NotificationRequest request, StreamObserver<NotificationListResponse> responseObserver) {
        try {
            Map<String, Object> res = grpcBankService.getNotificationsRpc(null);
            NotificationListResponse.Builder builder = NotificationListResponse.newBuilder()
                    .setSuccess(Boolean.TRUE.equals(res.get("success")))
                    .setMessage(String.valueOf(res.getOrDefault("message", "")))
                    .setUnreadCount(res.get("unread_count") != null ? Long.parseLong(res.get("unread_count").toString()) : 0);
            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception ex) {
            responseObserver.onNext(NotificationListResponse.newBuilder().setSuccess(false).setMessage(ex.getMessage()).build());
            responseObserver.onCompleted();
        }
    }
}

