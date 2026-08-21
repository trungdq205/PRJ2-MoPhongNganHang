package com.quangtrungbank.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quangtrungbank.entity.User;
import com.quangtrungbank.grpc.GrpcBankService;
import com.quangtrungbank.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

/**
 * Controller gRPC-Web Protocol Gateway Dispatcher
 * Tiếp nhận và định tuyến 100% các cuộc gọi gRPC RPC từ Web Frontend SPA qua giao thức gRPC-Web.
 */
@RestController
@RequestMapping({"/api/grpc", "/grpc/com.quangtrungbank.grpc.BankService", "/grpc/BankService"})
public class GrpcWebGatewayController {

    @Autowired
    private GrpcBankService grpcBankService;

    @Autowired
    private UserRepository userRepository;

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null) return null;
        Object principal = authentication.getPrincipal();
        if (principal instanceof User user) {
            return user;
        }
        String username = principal instanceof String s ? s : authentication.getName();
        return userRepository.findByUsername(username).orElse(null);
    }

    /**
     * Dynamic gRPC-Web RPC Gateway Dispatcher
     */
    @PostMapping(value = "/{rpcMethod}",
            consumes = {"application/json", "application/grpc-web+json", "application/grpc-web+proto", "application/grpc-web", "text/plain", "*/*"},
            produces = {"application/json", "application/grpc-web+json", "application/grpc-web+proto"})
    public ResponseEntity<?> handleGrpcRpc(
            @PathVariable String rpcMethod,
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) {

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Grpc-Web", "1");
        headers.set("grpc-status", "0");
        headers.set("grpc-message", "OK");
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            User currentUser = getCurrentUser(authentication);
            Map<String, Object> payload = parseGrpcRequest(request, rpcMethod);
            Object rpcResult = dispatchRpc(rpcMethod, payload, currentUser);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(rpcResult);
        } catch (Exception ex) {
            headers.set("grpc-status", "2");
            headers.set("grpc-message", ex.getMessage() != null ? ex.getMessage() : "RPC Error");

            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", ex.getMessage() != null ? ex.getMessage() : "Lỗi thực thi gRPC RPC " + rpcMethod);
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(err);
        }
    }

    private Object dispatchRpc(String rpcMethod, Map<String, Object> payload, User currentUser) {
        return switch (rpcMethod) {
            // === Auth ===
            case "Login", "login" -> grpcBankService.loginRpc(payload);
            case "FaceLogin", "faceLogin", "face-login" -> grpcBankService.faceLoginRpc(payload);
            case "ResetLocks", "resetLocks" -> grpcBankService.resetLocksRpc();
            case "ChangePassword", "changePassword" -> grpcBankService.changePasswordRpc(payload, currentUser);
            case "UpdateProfile", "updateProfile" -> grpcBankService.updateProfileRpc(payload, currentUser);

            // === Account ===
            case "GetAccounts", "getAccounts" -> grpcBankService.getAccountsRpc(payload, currentUser);
            case "LookupAccount", "lookupAccount" -> grpcBankService.lookupAccountRpc(payload);
            case "SubmitKyc", "submitKyc" -> grpcBankService.submitKycRpc(payload, currentUser);

            // === Transactions ===
            case "TransferMoney", "transferMoney" -> grpcBankService.transferMoneyRpc(payload, currentUser);
            case "AtmDeposit", "atmDeposit" -> grpcBankService.atmDepositRpc(payload, currentUser);
            case "AtmWithdraw", "atmWithdraw" -> grpcBankService.atmWithdrawRpc(payload, currentUser);
            case "VnpostWithdraw", "vnpostWithdraw" -> grpcBankService.vnpostWithdrawRpc(payload, currentUser);
            case "VnpostTransfer", "vnpostTransfer" -> grpcBankService.vnpostTransferRpc(payload, currentUser);
            case "GetTransactionHistory", "getTransactionHistory" -> grpcBankService.getTransactionHistoryRpc(payload, currentUser);
            case "GetAccountStatement", "getAccountStatement" -> grpcBankService.getAccountStatementRpc(payload, currentUser);

            // === ATM Codes ===
            case "CreateAtmCode", "createAtmCode" -> grpcBankService.createAtmCodeRpc(payload, currentUser);
            case "GetAtmCodes", "getAtmCodes" -> grpcBankService.getAtmCodesRpc(currentUser);
            case "CancelAtmCode", "cancelAtmCode" -> grpcBankService.cancelAtmCodeRpc(payload, currentUser);

            // === Savings ===
            case "OpenSavings", "openSavings", "OpenSavingsAccount" -> grpcBankService.openSavingsRpc(payload, currentUser);
            case "CloseSavings", "closeSavings", "WithdrawSavingsEarly" -> grpcBankService.closeSavingsRpc(payload, currentUser);
            case "TopUpSavings", "topUpSavings" -> grpcBankService.topUpSavingsRpc(payload, currentUser);
            case "GetSavingsDetail", "getSavingsDetail" -> grpcBankService.getSavingsDetailRpc(payload, currentUser);
            case "GetSavingsAccounts", "getSavingsAccounts" -> grpcBankService.getSavingsAccountsRpc(currentUser);
            case "GetSavingsInterestRates", "getSavingsInterestRates" -> grpcBankService.getSavingsInterestRatesRpc();

            // === Loans ===
            case "ApplyLoan", "applyLoan" -> grpcBankService.applyLoanRpc(payload, currentUser);
            case "GetLoans", "getLoans" -> grpcBankService.getLoansRpc(currentUser);

            // === Notifications & Tickets ===
            case "GetNotifications", "getNotifications" -> grpcBankService.getNotificationsRpc(currentUser);
            case "MarkNotificationRead", "markNotificationRead" -> grpcBankService.markNotificationReadRpc(payload, currentUser);
            case "MarkAllNotificationsRead", "markAllNotificationsRead" -> grpcBankService.markAllNotificationsReadRpc(currentUser);
            case "CreateTicket", "createTicket" -> grpcBankService.createTicketRpc(payload, currentUser);
            case "GetTickets", "getTickets" -> grpcBankService.getTicketsRpc(currentUser);

            // === Teller Operations ===
            case "TellerCreateCustomer", "tellerCreateCustomer" -> grpcBankService.tellerCreateCustomerRpc(payload, currentUser);
            case "TellerToggleAccountStatus", "tellerToggleAccountStatus" -> grpcBankService.tellerToggleAccountStatusRpc(payload, currentUser);
            case "TellerResolveTicket", "tellerResolveTicket" -> grpcBankService.tellerResolveTicketRpc(payload, currentUser);
            case "TellerGetAllTickets", "tellerGetAllTickets" -> grpcBankService.tellerGetAllTicketsRpc(currentUser);
            case "TellerUpdateCustomer", "tellerUpdateCustomer" -> grpcBankService.tellerUpdateCustomerRpc(payload, currentUser);
            case "TellerApproveKyc", "tellerApproveKyc" -> grpcBankService.tellerApproveKycRpc(payload, currentUser);

            default -> {
                Map<String, Object> unknown = new HashMap<>();
                unknown.put("success", false);
                unknown.put("message", "Chưa hỗ trợ RPC method: " + rpcMethod);
                yield unknown;
            }
        };
    }

    private Map<String, Object> parseGrpcRequest(HttpServletRequest request, String rpcMethod) {
        try {
            byte[] raw = request.getInputStream().readAllBytes();
            if (raw == null || raw.length == 0) {
                return new HashMap<>();
            }

            String contentType = request.getContentType() == null ? "" : request.getContentType().toLowerCase();
            String body = new String(raw, StandardCharsets.UTF_8).trim();

            if (body.startsWith("{") || body.startsWith("[")) {
                return new ObjectMapper().readValue(body, new TypeReference<Map<String, Object>>() {});
            }

            if ((contentType.contains("application/json") || contentType.contains("grpc-web+json") || contentType.contains("text/plain"))
                    && !body.isEmpty()) {
                try {
                    return new ObjectMapper().readValue(body, new TypeReference<Map<String, Object>>() {});
                } catch (Exception ignored) {}
            }

            if (contentType.contains("grpc") && raw.length >= 5 && raw[0] == 0x00) {
                int length = ((raw[1] & 0xff) << 24) | ((raw[2] & 0xff) << 16) | ((raw[3] & 0xff) << 8) | (raw[4] & 0xff);
                byte[] payload = Arrays.copyOfRange(raw, 5, Math.min(raw.length, 5 + length));
                return decodeGrpcWirePayload(payload);
            }
        } catch (Exception e) {
            System.err.println("[GrpcWebGateway] Error parsing payload for " + rpcMethod + ": " + e.getMessage());
        }

        return new HashMap<>();
    }

    private Map<String, Object> decodeGrpcWirePayload(byte[] payload) {
        Map<String, Object> result = new HashMap<>();
        int index = 0;
        while (index < payload.length) {
            long key = readVarint(payload, index);
            index = (int) (index + varintLength(payload, index));
            if (index > payload.length) break;

            int fieldNumber = (int) (key >> 3);
            int wireType = (int) (key & 0x07);
            if (wireType == 0) {
                long value = readVarint(payload, index);
                index = (int) (index + varintLength(payload, index));
                result.put("field_" + fieldNumber, value);
            } else if (wireType == 1) {
                long value = readFixed64(payload, index);
                index += 8;
                result.put("field_" + fieldNumber, value);
            } else if (wireType == 2) {
                long length = readVarint(payload, index);
                index = (int) (index + varintLength(payload, index));
                int bytesLength = (int) length;
                String value = new String(Arrays.copyOfRange(payload, index, index + bytesLength), StandardCharsets.UTF_8);
                index += bytesLength;
                result.put("field_" + fieldNumber, value);
            } else if (wireType == 5) {
                int value = readFixed32(payload, index);
                index += 4;
                result.put("field_" + fieldNumber, value);
            } else {
                break;
            }
        }
        return result;
    }

    private long readVarint(byte[] data, int offset) {
        long result = 0;
        int shift = 0;
        int index = offset;
        while (index < data.length) {
            int b = data[index++] & 0xff;
            result |= (long) (b & 0x7f) << shift;
            if ((b & 0x80) == 0) {
                return result;
            }
            shift += 7;
        }
        return result;
    }

    private int varintLength(byte[] data, int offset) {
        int length = 1;
        int index = offset;
        while (index < data.length && (data[index++] & 0x80) != 0) {
            length++;
        }
        return length;
    }

    private long readFixed64(byte[] data, int offset) {
        long result = 0;
        for (int i = 0; i < 8; i++) {
            result |= ((long) (data[offset + i] & 0xff)) << (i * 8);
        }
        return result;
    }

    private int readFixed32(byte[] data, int offset) {
        return ((data[offset] & 0xff))
                | ((data[offset + 1] & 0xff) << 8)
                | ((data[offset + 2] & 0xff) << 16)
                | ((data[offset + 3] & 0xff) << 24);
    }
}

