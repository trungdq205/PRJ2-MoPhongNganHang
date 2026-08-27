package com.quangtrungbank.grpc.generated;

import static io.grpc.MethodDescriptor.generateFullMethodName;

/**
 * <pre>
 * Dynamic Banking gRPC Service Definition
 * </pre>
 */
@javax.annotation.Generated(
    value = "by gRPC proto compiler (version 1.62.2)",
    comments = "Source: bank_service.proto")
@io.grpc.stub.annotations.GrpcGenerated
public final class BankServiceGrpc {

  private BankServiceGrpc() {}

  public static final java.lang.String SERVICE_NAME = "com.quangtrungbank.grpc.BankService";

  // Static method descriptors that strictly reflect the proto.
  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.LoginRequest,
      com.quangtrungbank.grpc.generated.LoginResponse> getLoginMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "Login",
      requestType = com.quangtrungbank.grpc.generated.LoginRequest.class,
      responseType = com.quangtrungbank.grpc.generated.LoginResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.LoginRequest,
      com.quangtrungbank.grpc.generated.LoginResponse> getLoginMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.LoginRequest, com.quangtrungbank.grpc.generated.LoginResponse> getLoginMethod;
    if ((getLoginMethod = BankServiceGrpc.getLoginMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getLoginMethod = BankServiceGrpc.getLoginMethod) == null) {
          BankServiceGrpc.getLoginMethod = getLoginMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.LoginRequest, com.quangtrungbank.grpc.generated.LoginResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "Login"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.LoginRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.LoginResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("Login"))
              .build();
        }
      }
    }
    return getLoginMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest,
      com.quangtrungbank.grpc.generated.SimpleResponse> getResetLocksMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "ResetLocks",
      requestType = com.quangtrungbank.grpc.generated.EmptyRequest.class,
      responseType = com.quangtrungbank.grpc.generated.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest,
      com.quangtrungbank.grpc.generated.SimpleResponse> getResetLocksMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest, com.quangtrungbank.grpc.generated.SimpleResponse> getResetLocksMethod;
    if ((getResetLocksMethod = BankServiceGrpc.getResetLocksMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getResetLocksMethod = BankServiceGrpc.getResetLocksMethod) == null) {
          BankServiceGrpc.getResetLocksMethod = getResetLocksMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.EmptyRequest, com.quangtrungbank.grpc.generated.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "ResetLocks"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.EmptyRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("ResetLocks"))
              .build();
        }
      }
    }
    return getResetLocksMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.ChangePasswordRequest,
      com.quangtrungbank.grpc.generated.SimpleResponse> getChangePasswordMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "ChangePassword",
      requestType = com.quangtrungbank.grpc.generated.ChangePasswordRequest.class,
      responseType = com.quangtrungbank.grpc.generated.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.ChangePasswordRequest,
      com.quangtrungbank.grpc.generated.SimpleResponse> getChangePasswordMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.ChangePasswordRequest, com.quangtrungbank.grpc.generated.SimpleResponse> getChangePasswordMethod;
    if ((getChangePasswordMethod = BankServiceGrpc.getChangePasswordMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getChangePasswordMethod = BankServiceGrpc.getChangePasswordMethod) == null) {
          BankServiceGrpc.getChangePasswordMethod = getChangePasswordMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.ChangePasswordRequest, com.quangtrungbank.grpc.generated.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "ChangePassword"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.ChangePasswordRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("ChangePassword"))
              .build();
        }
      }
    }
    return getChangePasswordMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.UpdateProfileRequest,
      com.quangtrungbank.grpc.generated.UserResponse> getUpdateProfileMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "UpdateProfile",
      requestType = com.quangtrungbank.grpc.generated.UpdateProfileRequest.class,
      responseType = com.quangtrungbank.grpc.generated.UserResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.UpdateProfileRequest,
      com.quangtrungbank.grpc.generated.UserResponse> getUpdateProfileMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.UpdateProfileRequest, com.quangtrungbank.grpc.generated.UserResponse> getUpdateProfileMethod;
    if ((getUpdateProfileMethod = BankServiceGrpc.getUpdateProfileMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getUpdateProfileMethod = BankServiceGrpc.getUpdateProfileMethod) == null) {
          BankServiceGrpc.getUpdateProfileMethod = getUpdateProfileMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.UpdateProfileRequest, com.quangtrungbank.grpc.generated.UserResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "UpdateProfile"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.UpdateProfileRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.UserResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("UpdateProfile"))
              .build();
        }
      }
    }
    return getUpdateProfileMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.GetAccountsRequest,
      com.quangtrungbank.grpc.generated.AccountListResponse> getGetAccountsMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetAccounts",
      requestType = com.quangtrungbank.grpc.generated.GetAccountsRequest.class,
      responseType = com.quangtrungbank.grpc.generated.AccountListResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.GetAccountsRequest,
      com.quangtrungbank.grpc.generated.AccountListResponse> getGetAccountsMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.GetAccountsRequest, com.quangtrungbank.grpc.generated.AccountListResponse> getGetAccountsMethod;
    if ((getGetAccountsMethod = BankServiceGrpc.getGetAccountsMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getGetAccountsMethod = BankServiceGrpc.getGetAccountsMethod) == null) {
          BankServiceGrpc.getGetAccountsMethod = getGetAccountsMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.GetAccountsRequest, com.quangtrungbank.grpc.generated.AccountListResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetAccounts"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.GetAccountsRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.AccountListResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("GetAccounts"))
              .build();
        }
      }
    }
    return getGetAccountsMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.LookupAccountRequest,
      com.quangtrungbank.grpc.generated.LookupAccountResponse> getLookupAccountMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "LookupAccount",
      requestType = com.quangtrungbank.grpc.generated.LookupAccountRequest.class,
      responseType = com.quangtrungbank.grpc.generated.LookupAccountResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.LookupAccountRequest,
      com.quangtrungbank.grpc.generated.LookupAccountResponse> getLookupAccountMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.LookupAccountRequest, com.quangtrungbank.grpc.generated.LookupAccountResponse> getLookupAccountMethod;
    if ((getLookupAccountMethod = BankServiceGrpc.getLookupAccountMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getLookupAccountMethod = BankServiceGrpc.getLookupAccountMethod) == null) {
          BankServiceGrpc.getLookupAccountMethod = getLookupAccountMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.LookupAccountRequest, com.quangtrungbank.grpc.generated.LookupAccountResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "LookupAccount"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.LookupAccountRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.LookupAccountResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("LookupAccount"))
              .build();
        }
      }
    }
    return getLookupAccountMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TransferRequest,
      com.quangtrungbank.grpc.generated.TransferResponse> getTransferMoneyMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "TransferMoney",
      requestType = com.quangtrungbank.grpc.generated.TransferRequest.class,
      responseType = com.quangtrungbank.grpc.generated.TransferResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TransferRequest,
      com.quangtrungbank.grpc.generated.TransferResponse> getTransferMoneyMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TransferRequest, com.quangtrungbank.grpc.generated.TransferResponse> getTransferMoneyMethod;
    if ((getTransferMoneyMethod = BankServiceGrpc.getTransferMoneyMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getTransferMoneyMethod = BankServiceGrpc.getTransferMoneyMethod) == null) {
          BankServiceGrpc.getTransferMoneyMethod = getTransferMoneyMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.TransferRequest, com.quangtrungbank.grpc.generated.TransferResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "TransferMoney"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.TransferRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.TransferResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("TransferMoney"))
              .build();
        }
      }
    }
    return getTransferMoneyMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.AtmTransactionRequest,
      com.quangtrungbank.grpc.generated.TransactionResponse> getAtmDepositMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "AtmDeposit",
      requestType = com.quangtrungbank.grpc.generated.AtmTransactionRequest.class,
      responseType = com.quangtrungbank.grpc.generated.TransactionResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.AtmTransactionRequest,
      com.quangtrungbank.grpc.generated.TransactionResponse> getAtmDepositMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.AtmTransactionRequest, com.quangtrungbank.grpc.generated.TransactionResponse> getAtmDepositMethod;
    if ((getAtmDepositMethod = BankServiceGrpc.getAtmDepositMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getAtmDepositMethod = BankServiceGrpc.getAtmDepositMethod) == null) {
          BankServiceGrpc.getAtmDepositMethod = getAtmDepositMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.AtmTransactionRequest, com.quangtrungbank.grpc.generated.TransactionResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "AtmDeposit"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.AtmTransactionRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.TransactionResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("AtmDeposit"))
              .build();
        }
      }
    }
    return getAtmDepositMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.AtmTransactionRequest,
      com.quangtrungbank.grpc.generated.TransactionResponse> getAtmWithdrawMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "AtmWithdraw",
      requestType = com.quangtrungbank.grpc.generated.AtmTransactionRequest.class,
      responseType = com.quangtrungbank.grpc.generated.TransactionResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.AtmTransactionRequest,
      com.quangtrungbank.grpc.generated.TransactionResponse> getAtmWithdrawMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.AtmTransactionRequest, com.quangtrungbank.grpc.generated.TransactionResponse> getAtmWithdrawMethod;
    if ((getAtmWithdrawMethod = BankServiceGrpc.getAtmWithdrawMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getAtmWithdrawMethod = BankServiceGrpc.getAtmWithdrawMethod) == null) {
          BankServiceGrpc.getAtmWithdrawMethod = getAtmWithdrawMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.AtmTransactionRequest, com.quangtrungbank.grpc.generated.TransactionResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "AtmWithdraw"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.AtmTransactionRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.TransactionResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("AtmWithdraw"))
              .build();
        }
      }
    }
    return getAtmWithdrawMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TransactionHistoryRequest,
      com.quangtrungbank.grpc.generated.TransactionListResponse> getGetTransactionHistoryMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetTransactionHistory",
      requestType = com.quangtrungbank.grpc.generated.TransactionHistoryRequest.class,
      responseType = com.quangtrungbank.grpc.generated.TransactionListResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TransactionHistoryRequest,
      com.quangtrungbank.grpc.generated.TransactionListResponse> getGetTransactionHistoryMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TransactionHistoryRequest, com.quangtrungbank.grpc.generated.TransactionListResponse> getGetTransactionHistoryMethod;
    if ((getGetTransactionHistoryMethod = BankServiceGrpc.getGetTransactionHistoryMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getGetTransactionHistoryMethod = BankServiceGrpc.getGetTransactionHistoryMethod) == null) {
          BankServiceGrpc.getGetTransactionHistoryMethod = getGetTransactionHistoryMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.TransactionHistoryRequest, com.quangtrungbank.grpc.generated.TransactionListResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetTransactionHistory"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.TransactionHistoryRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.TransactionListResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("GetTransactionHistory"))
              .build();
        }
      }
    }
    return getGetTransactionHistoryMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.StatementRequest,
      com.quangtrungbank.grpc.generated.StatementResponse> getGetAccountStatementMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetAccountStatement",
      requestType = com.quangtrungbank.grpc.generated.StatementRequest.class,
      responseType = com.quangtrungbank.grpc.generated.StatementResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.StatementRequest,
      com.quangtrungbank.grpc.generated.StatementResponse> getGetAccountStatementMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.StatementRequest, com.quangtrungbank.grpc.generated.StatementResponse> getGetAccountStatementMethod;
    if ((getGetAccountStatementMethod = BankServiceGrpc.getGetAccountStatementMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getGetAccountStatementMethod = BankServiceGrpc.getGetAccountStatementMethod) == null) {
          BankServiceGrpc.getGetAccountStatementMethod = getGetAccountStatementMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.StatementRequest, com.quangtrungbank.grpc.generated.StatementResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetAccountStatement"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.StatementRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.StatementResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("GetAccountStatement"))
              .build();
        }
      }
    }
    return getGetAccountStatementMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.CreateAtmCodeRequest,
      com.quangtrungbank.grpc.generated.AtmCodeResponse> getCreateAtmCodeMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "CreateAtmCode",
      requestType = com.quangtrungbank.grpc.generated.CreateAtmCodeRequest.class,
      responseType = com.quangtrungbank.grpc.generated.AtmCodeResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.CreateAtmCodeRequest,
      com.quangtrungbank.grpc.generated.AtmCodeResponse> getCreateAtmCodeMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.CreateAtmCodeRequest, com.quangtrungbank.grpc.generated.AtmCodeResponse> getCreateAtmCodeMethod;
    if ((getCreateAtmCodeMethod = BankServiceGrpc.getCreateAtmCodeMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getCreateAtmCodeMethod = BankServiceGrpc.getCreateAtmCodeMethod) == null) {
          BankServiceGrpc.getCreateAtmCodeMethod = getCreateAtmCodeMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.CreateAtmCodeRequest, com.quangtrungbank.grpc.generated.AtmCodeResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "CreateAtmCode"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.CreateAtmCodeRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.AtmCodeResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("CreateAtmCode"))
              .build();
        }
      }
    }
    return getCreateAtmCodeMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest,
      com.quangtrungbank.grpc.generated.AtmCodeListResponse> getGetAtmCodesMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetAtmCodes",
      requestType = com.quangtrungbank.grpc.generated.EmptyRequest.class,
      responseType = com.quangtrungbank.grpc.generated.AtmCodeListResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest,
      com.quangtrungbank.grpc.generated.AtmCodeListResponse> getGetAtmCodesMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest, com.quangtrungbank.grpc.generated.AtmCodeListResponse> getGetAtmCodesMethod;
    if ((getGetAtmCodesMethod = BankServiceGrpc.getGetAtmCodesMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getGetAtmCodesMethod = BankServiceGrpc.getGetAtmCodesMethod) == null) {
          BankServiceGrpc.getGetAtmCodesMethod = getGetAtmCodesMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.EmptyRequest, com.quangtrungbank.grpc.generated.AtmCodeListResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetAtmCodes"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.EmptyRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.AtmCodeListResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("GetAtmCodes"))
              .build();
        }
      }
    }
    return getGetAtmCodesMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.CancelAtmCodeRequest,
      com.quangtrungbank.grpc.generated.SimpleResponse> getCancelAtmCodeMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "CancelAtmCode",
      requestType = com.quangtrungbank.grpc.generated.CancelAtmCodeRequest.class,
      responseType = com.quangtrungbank.grpc.generated.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.CancelAtmCodeRequest,
      com.quangtrungbank.grpc.generated.SimpleResponse> getCancelAtmCodeMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.CancelAtmCodeRequest, com.quangtrungbank.grpc.generated.SimpleResponse> getCancelAtmCodeMethod;
    if ((getCancelAtmCodeMethod = BankServiceGrpc.getCancelAtmCodeMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getCancelAtmCodeMethod = BankServiceGrpc.getCancelAtmCodeMethod) == null) {
          BankServiceGrpc.getCancelAtmCodeMethod = getCancelAtmCodeMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.CancelAtmCodeRequest, com.quangtrungbank.grpc.generated.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "CancelAtmCode"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.CancelAtmCodeRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("CancelAtmCode"))
              .build();
        }
      }
    }
    return getCancelAtmCodeMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.OpenSavingsRequest,
      com.quangtrungbank.grpc.generated.SavingsResponse> getOpenSavingsMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "OpenSavings",
      requestType = com.quangtrungbank.grpc.generated.OpenSavingsRequest.class,
      responseType = com.quangtrungbank.grpc.generated.SavingsResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.OpenSavingsRequest,
      com.quangtrungbank.grpc.generated.SavingsResponse> getOpenSavingsMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.OpenSavingsRequest, com.quangtrungbank.grpc.generated.SavingsResponse> getOpenSavingsMethod;
    if ((getOpenSavingsMethod = BankServiceGrpc.getOpenSavingsMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getOpenSavingsMethod = BankServiceGrpc.getOpenSavingsMethod) == null) {
          BankServiceGrpc.getOpenSavingsMethod = getOpenSavingsMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.OpenSavingsRequest, com.quangtrungbank.grpc.generated.SavingsResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "OpenSavings"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.OpenSavingsRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.SavingsResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("OpenSavings"))
              .build();
        }
      }
    }
    return getOpenSavingsMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.CloseSavingsRequest,
      com.quangtrungbank.grpc.generated.SavingsResponse> getCloseSavingsMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "CloseSavings",
      requestType = com.quangtrungbank.grpc.generated.CloseSavingsRequest.class,
      responseType = com.quangtrungbank.grpc.generated.SavingsResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.CloseSavingsRequest,
      com.quangtrungbank.grpc.generated.SavingsResponse> getCloseSavingsMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.CloseSavingsRequest, com.quangtrungbank.grpc.generated.SavingsResponse> getCloseSavingsMethod;
    if ((getCloseSavingsMethod = BankServiceGrpc.getCloseSavingsMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getCloseSavingsMethod = BankServiceGrpc.getCloseSavingsMethod) == null) {
          BankServiceGrpc.getCloseSavingsMethod = getCloseSavingsMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.CloseSavingsRequest, com.quangtrungbank.grpc.generated.SavingsResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "CloseSavings"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.CloseSavingsRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.SavingsResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("CloseSavings"))
              .build();
        }
      }
    }
    return getCloseSavingsMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TopUpSavingsRequest,
      com.quangtrungbank.grpc.generated.SavingsResponse> getTopUpSavingsMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "TopUpSavings",
      requestType = com.quangtrungbank.grpc.generated.TopUpSavingsRequest.class,
      responseType = com.quangtrungbank.grpc.generated.SavingsResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TopUpSavingsRequest,
      com.quangtrungbank.grpc.generated.SavingsResponse> getTopUpSavingsMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TopUpSavingsRequest, com.quangtrungbank.grpc.generated.SavingsResponse> getTopUpSavingsMethod;
    if ((getTopUpSavingsMethod = BankServiceGrpc.getTopUpSavingsMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getTopUpSavingsMethod = BankServiceGrpc.getTopUpSavingsMethod) == null) {
          BankServiceGrpc.getTopUpSavingsMethod = getTopUpSavingsMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.TopUpSavingsRequest, com.quangtrungbank.grpc.generated.SavingsResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "TopUpSavings"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.TopUpSavingsRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.SavingsResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("TopUpSavings"))
              .build();
        }
      }
    }
    return getTopUpSavingsMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.SavingsDetailRequest,
      com.quangtrungbank.grpc.generated.SavingsDetailResponse> getGetSavingsDetailMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetSavingsDetail",
      requestType = com.quangtrungbank.grpc.generated.SavingsDetailRequest.class,
      responseType = com.quangtrungbank.grpc.generated.SavingsDetailResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.SavingsDetailRequest,
      com.quangtrungbank.grpc.generated.SavingsDetailResponse> getGetSavingsDetailMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.SavingsDetailRequest, com.quangtrungbank.grpc.generated.SavingsDetailResponse> getGetSavingsDetailMethod;
    if ((getGetSavingsDetailMethod = BankServiceGrpc.getGetSavingsDetailMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getGetSavingsDetailMethod = BankServiceGrpc.getGetSavingsDetailMethod) == null) {
          BankServiceGrpc.getGetSavingsDetailMethod = getGetSavingsDetailMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.SavingsDetailRequest, com.quangtrungbank.grpc.generated.SavingsDetailResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetSavingsDetail"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.SavingsDetailRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.SavingsDetailResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("GetSavingsDetail"))
              .build();
        }
      }
    }
    return getGetSavingsDetailMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest,
      com.quangtrungbank.grpc.generated.SavingsListResponse> getGetSavingsAccountsMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetSavingsAccounts",
      requestType = com.quangtrungbank.grpc.generated.EmptyRequest.class,
      responseType = com.quangtrungbank.grpc.generated.SavingsListResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest,
      com.quangtrungbank.grpc.generated.SavingsListResponse> getGetSavingsAccountsMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest, com.quangtrungbank.grpc.generated.SavingsListResponse> getGetSavingsAccountsMethod;
    if ((getGetSavingsAccountsMethod = BankServiceGrpc.getGetSavingsAccountsMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getGetSavingsAccountsMethod = BankServiceGrpc.getGetSavingsAccountsMethod) == null) {
          BankServiceGrpc.getGetSavingsAccountsMethod = getGetSavingsAccountsMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.EmptyRequest, com.quangtrungbank.grpc.generated.SavingsListResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetSavingsAccounts"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.EmptyRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.SavingsListResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("GetSavingsAccounts"))
              .build();
        }
      }
    }
    return getGetSavingsAccountsMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest,
      com.quangtrungbank.grpc.generated.InterestRateListResponse> getGetSavingsInterestRatesMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetSavingsInterestRates",
      requestType = com.quangtrungbank.grpc.generated.EmptyRequest.class,
      responseType = com.quangtrungbank.grpc.generated.InterestRateListResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest,
      com.quangtrungbank.grpc.generated.InterestRateListResponse> getGetSavingsInterestRatesMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest, com.quangtrungbank.grpc.generated.InterestRateListResponse> getGetSavingsInterestRatesMethod;
    if ((getGetSavingsInterestRatesMethod = BankServiceGrpc.getGetSavingsInterestRatesMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getGetSavingsInterestRatesMethod = BankServiceGrpc.getGetSavingsInterestRatesMethod) == null) {
          BankServiceGrpc.getGetSavingsInterestRatesMethod = getGetSavingsInterestRatesMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.EmptyRequest, com.quangtrungbank.grpc.generated.InterestRateListResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetSavingsInterestRates"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.EmptyRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.InterestRateListResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("GetSavingsInterestRates"))
              .build();
        }
      }
    }
    return getGetSavingsInterestRatesMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.ApplyLoanRequest,
      com.quangtrungbank.grpc.generated.LoanResponse> getApplyLoanMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "ApplyLoan",
      requestType = com.quangtrungbank.grpc.generated.ApplyLoanRequest.class,
      responseType = com.quangtrungbank.grpc.generated.LoanResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.ApplyLoanRequest,
      com.quangtrungbank.grpc.generated.LoanResponse> getApplyLoanMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.ApplyLoanRequest, com.quangtrungbank.grpc.generated.LoanResponse> getApplyLoanMethod;
    if ((getApplyLoanMethod = BankServiceGrpc.getApplyLoanMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getApplyLoanMethod = BankServiceGrpc.getApplyLoanMethod) == null) {
          BankServiceGrpc.getApplyLoanMethod = getApplyLoanMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.ApplyLoanRequest, com.quangtrungbank.grpc.generated.LoanResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "ApplyLoan"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.ApplyLoanRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.LoanResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("ApplyLoan"))
              .build();
        }
      }
    }
    return getApplyLoanMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest,
      com.quangtrungbank.grpc.generated.LoanListResponse> getGetLoansMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetLoans",
      requestType = com.quangtrungbank.grpc.generated.EmptyRequest.class,
      responseType = com.quangtrungbank.grpc.generated.LoanListResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest,
      com.quangtrungbank.grpc.generated.LoanListResponse> getGetLoansMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest, com.quangtrungbank.grpc.generated.LoanListResponse> getGetLoansMethod;
    if ((getGetLoansMethod = BankServiceGrpc.getGetLoansMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getGetLoansMethod = BankServiceGrpc.getGetLoansMethod) == null) {
          BankServiceGrpc.getGetLoansMethod = getGetLoansMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.EmptyRequest, com.quangtrungbank.grpc.generated.LoanListResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetLoans"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.EmptyRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.LoanListResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("GetLoans"))
              .build();
        }
      }
    }
    return getGetLoansMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.NotificationRequest,
      com.quangtrungbank.grpc.generated.NotificationListResponse> getGetNotificationsMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetNotifications",
      requestType = com.quangtrungbank.grpc.generated.NotificationRequest.class,
      responseType = com.quangtrungbank.grpc.generated.NotificationListResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.NotificationRequest,
      com.quangtrungbank.grpc.generated.NotificationListResponse> getGetNotificationsMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.NotificationRequest, com.quangtrungbank.grpc.generated.NotificationListResponse> getGetNotificationsMethod;
    if ((getGetNotificationsMethod = BankServiceGrpc.getGetNotificationsMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getGetNotificationsMethod = BankServiceGrpc.getGetNotificationsMethod) == null) {
          BankServiceGrpc.getGetNotificationsMethod = getGetNotificationsMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.NotificationRequest, com.quangtrungbank.grpc.generated.NotificationListResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetNotifications"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.NotificationRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.NotificationListResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("GetNotifications"))
              .build();
        }
      }
    }
    return getGetNotificationsMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.MarkNotificationReadRequest,
      com.quangtrungbank.grpc.generated.SimpleResponse> getMarkNotificationReadMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "MarkNotificationRead",
      requestType = com.quangtrungbank.grpc.generated.MarkNotificationReadRequest.class,
      responseType = com.quangtrungbank.grpc.generated.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.MarkNotificationReadRequest,
      com.quangtrungbank.grpc.generated.SimpleResponse> getMarkNotificationReadMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.MarkNotificationReadRequest, com.quangtrungbank.grpc.generated.SimpleResponse> getMarkNotificationReadMethod;
    if ((getMarkNotificationReadMethod = BankServiceGrpc.getMarkNotificationReadMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getMarkNotificationReadMethod = BankServiceGrpc.getMarkNotificationReadMethod) == null) {
          BankServiceGrpc.getMarkNotificationReadMethod = getMarkNotificationReadMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.MarkNotificationReadRequest, com.quangtrungbank.grpc.generated.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "MarkNotificationRead"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.MarkNotificationReadRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("MarkNotificationRead"))
              .build();
        }
      }
    }
    return getMarkNotificationReadMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest,
      com.quangtrungbank.grpc.generated.SimpleResponse> getMarkAllNotificationsReadMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "MarkAllNotificationsRead",
      requestType = com.quangtrungbank.grpc.generated.EmptyRequest.class,
      responseType = com.quangtrungbank.grpc.generated.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest,
      com.quangtrungbank.grpc.generated.SimpleResponse> getMarkAllNotificationsReadMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.EmptyRequest, com.quangtrungbank.grpc.generated.SimpleResponse> getMarkAllNotificationsReadMethod;
    if ((getMarkAllNotificationsReadMethod = BankServiceGrpc.getMarkAllNotificationsReadMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getMarkAllNotificationsReadMethod = BankServiceGrpc.getMarkAllNotificationsReadMethod) == null) {
          BankServiceGrpc.getMarkAllNotificationsReadMethod = getMarkAllNotificationsReadMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.EmptyRequest, com.quangtrungbank.grpc.generated.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "MarkAllNotificationsRead"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.EmptyRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("MarkAllNotificationsRead"))
              .build();
        }
      }
    }
    return getMarkAllNotificationsReadMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TellerCreateCustomerRequest,
      com.quangtrungbank.grpc.generated.CustomerResponse> getTellerCreateCustomerMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "TellerCreateCustomer",
      requestType = com.quangtrungbank.grpc.generated.TellerCreateCustomerRequest.class,
      responseType = com.quangtrungbank.grpc.generated.CustomerResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TellerCreateCustomerRequest,
      com.quangtrungbank.grpc.generated.CustomerResponse> getTellerCreateCustomerMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TellerCreateCustomerRequest, com.quangtrungbank.grpc.generated.CustomerResponse> getTellerCreateCustomerMethod;
    if ((getTellerCreateCustomerMethod = BankServiceGrpc.getTellerCreateCustomerMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getTellerCreateCustomerMethod = BankServiceGrpc.getTellerCreateCustomerMethod) == null) {
          BankServiceGrpc.getTellerCreateCustomerMethod = getTellerCreateCustomerMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.TellerCreateCustomerRequest, com.quangtrungbank.grpc.generated.CustomerResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "TellerCreateCustomer"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.TellerCreateCustomerRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.CustomerResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("TellerCreateCustomer"))
              .build();
        }
      }
    }
    return getTellerCreateCustomerMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TellerToggleAccountStatusRequest,
      com.quangtrungbank.grpc.generated.AccountResponse> getTellerToggleAccountStatusMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "TellerToggleAccountStatus",
      requestType = com.quangtrungbank.grpc.generated.TellerToggleAccountStatusRequest.class,
      responseType = com.quangtrungbank.grpc.generated.AccountResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TellerToggleAccountStatusRequest,
      com.quangtrungbank.grpc.generated.AccountResponse> getTellerToggleAccountStatusMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TellerToggleAccountStatusRequest, com.quangtrungbank.grpc.generated.AccountResponse> getTellerToggleAccountStatusMethod;
    if ((getTellerToggleAccountStatusMethod = BankServiceGrpc.getTellerToggleAccountStatusMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getTellerToggleAccountStatusMethod = BankServiceGrpc.getTellerToggleAccountStatusMethod) == null) {
          BankServiceGrpc.getTellerToggleAccountStatusMethod = getTellerToggleAccountStatusMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.TellerToggleAccountStatusRequest, com.quangtrungbank.grpc.generated.AccountResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "TellerToggleAccountStatus"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.TellerToggleAccountStatusRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.AccountResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("TellerToggleAccountStatus"))
              .build();
        }
      }
    }
    return getTellerToggleAccountStatusMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TellerUpdateCustomerRequest,
      com.quangtrungbank.grpc.generated.CustomerResponse> getTellerUpdateCustomerMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "TellerUpdateCustomer",
      requestType = com.quangtrungbank.grpc.generated.TellerUpdateCustomerRequest.class,
      responseType = com.quangtrungbank.grpc.generated.CustomerResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TellerUpdateCustomerRequest,
      com.quangtrungbank.grpc.generated.CustomerResponse> getTellerUpdateCustomerMethod() {
    io.grpc.MethodDescriptor<com.quangtrungbank.grpc.generated.TellerUpdateCustomerRequest, com.quangtrungbank.grpc.generated.CustomerResponse> getTellerUpdateCustomerMethod;
    if ((getTellerUpdateCustomerMethod = BankServiceGrpc.getTellerUpdateCustomerMethod) == null) {
      synchronized (BankServiceGrpc.class) {
        if ((getTellerUpdateCustomerMethod = BankServiceGrpc.getTellerUpdateCustomerMethod) == null) {
          BankServiceGrpc.getTellerUpdateCustomerMethod = getTellerUpdateCustomerMethod =
              io.grpc.MethodDescriptor.<com.quangtrungbank.grpc.generated.TellerUpdateCustomerRequest, com.quangtrungbank.grpc.generated.CustomerResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "TellerUpdateCustomer"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.TellerUpdateCustomerRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.quangtrungbank.grpc.generated.CustomerResponse.getDefaultInstance()))
              .setSchemaDescriptor(new BankServiceMethodDescriptorSupplier("TellerUpdateCustomer"))
              .build();
        }
      }
    }
    return getTellerUpdateCustomerMethod;
  }

  /**
   * Creates a new async stub that supports all call types for the service
   */
  public static BankServiceStub newStub(io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<BankServiceStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<BankServiceStub>() {
        @java.lang.Override
        public BankServiceStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new BankServiceStub(channel, callOptions);
        }
      };
    return BankServiceStub.newStub(factory, channel);
  }

  /**
   * Creates a new blocking-style stub that supports unary and streaming output calls on the service
   */
  public static BankServiceBlockingStub newBlockingStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<BankServiceBlockingStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<BankServiceBlockingStub>() {
        @java.lang.Override
        public BankServiceBlockingStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new BankServiceBlockingStub(channel, callOptions);
        }
      };
    return BankServiceBlockingStub.newStub(factory, channel);
  }

  /**
   * Creates a new ListenableFuture-style stub that supports unary calls on the service
   */
  public static BankServiceFutureStub newFutureStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<BankServiceFutureStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<BankServiceFutureStub>() {
        @java.lang.Override
        public BankServiceFutureStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new BankServiceFutureStub(channel, callOptions);
        }
      };
    return BankServiceFutureStub.newStub(factory, channel);
  }

  /**
   * <pre>
   * Dynamic Banking gRPC Service Definition
   * </pre>
   */
  public interface AsyncService {

    /**
     * <pre>
     * === Authentication &amp; Security ===
     * </pre>
     */
    default void login(com.quangtrungbank.grpc.generated.LoginRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.LoginResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getLoginMethod(), responseObserver);
    }

    /**
     */
    default void resetLocks(com.quangtrungbank.grpc.generated.EmptyRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getResetLocksMethod(), responseObserver);
    }

    /**
     */
    default void changePassword(com.quangtrungbank.grpc.generated.ChangePasswordRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getChangePasswordMethod(), responseObserver);
    }

    /**
     */
    default void updateProfile(com.quangtrungbank.grpc.generated.UpdateProfileRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.UserResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getUpdateProfileMethod(), responseObserver);
    }

    /**
     * <pre>
     * === Customer Accounts &amp; Profile ===
     * </pre>
     */
    default void getAccounts(com.quangtrungbank.grpc.generated.GetAccountsRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.AccountListResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetAccountsMethod(), responseObserver);
    }

    /**
     */
    default void lookupAccount(com.quangtrungbank.grpc.generated.LookupAccountRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.LookupAccountResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getLookupAccountMethod(), responseObserver);
    }

    /**
     * <pre>
     * === Core Transactions ===
     * </pre>
     */
    default void transferMoney(com.quangtrungbank.grpc.generated.TransferRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.TransferResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getTransferMoneyMethod(), responseObserver);
    }

    /**
     */
    default void atmDeposit(com.quangtrungbank.grpc.generated.AtmTransactionRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.TransactionResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getAtmDepositMethod(), responseObserver);
    }

    /**
     */
    default void atmWithdraw(com.quangtrungbank.grpc.generated.AtmTransactionRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.TransactionResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getAtmWithdrawMethod(), responseObserver);
    }

    /**
     */
    default void getTransactionHistory(com.quangtrungbank.grpc.generated.TransactionHistoryRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.TransactionListResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetTransactionHistoryMethod(), responseObserver);
    }

    /**
     */
    default void getAccountStatement(com.quangtrungbank.grpc.generated.StatementRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.StatementResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetAccountStatementMethod(), responseObserver);
    }

    /**
     * <pre>
     * === Cardless ATM Codes ===
     * </pre>
     */
    default void createAtmCode(com.quangtrungbank.grpc.generated.CreateAtmCodeRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.AtmCodeResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getCreateAtmCodeMethod(), responseObserver);
    }

    /**
     */
    default void getAtmCodes(com.quangtrungbank.grpc.generated.EmptyRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.AtmCodeListResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetAtmCodesMethod(), responseObserver);
    }

    /**
     */
    default void cancelAtmCode(com.quangtrungbank.grpc.generated.CancelAtmCodeRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getCancelAtmCodeMethod(), responseObserver);
    }

    /**
     * <pre>
     * === Savings (Tiết kiệm) ===
     * </pre>
     */
    default void openSavings(com.quangtrungbank.grpc.generated.OpenSavingsRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SavingsResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getOpenSavingsMethod(), responseObserver);
    }

    /**
     */
    default void closeSavings(com.quangtrungbank.grpc.generated.CloseSavingsRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SavingsResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getCloseSavingsMethod(), responseObserver);
    }

    /**
     */
    default void topUpSavings(com.quangtrungbank.grpc.generated.TopUpSavingsRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SavingsResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getTopUpSavingsMethod(), responseObserver);
    }

    /**
     */
    default void getSavingsDetail(com.quangtrungbank.grpc.generated.SavingsDetailRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SavingsDetailResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetSavingsDetailMethod(), responseObserver);
    }

    /**
     */
    default void getSavingsAccounts(com.quangtrungbank.grpc.generated.EmptyRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SavingsListResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetSavingsAccountsMethod(), responseObserver);
    }

    /**
     */
    default void getSavingsInterestRates(com.quangtrungbank.grpc.generated.EmptyRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.InterestRateListResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetSavingsInterestRatesMethod(), responseObserver);
    }

    /**
     * <pre>
     * === Loans (Tín dụng &amp; Khoản vay) ===
     * </pre>
     */
    default void applyLoan(com.quangtrungbank.grpc.generated.ApplyLoanRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.LoanResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getApplyLoanMethod(), responseObserver);
    }

    /**
     */
    default void getLoans(com.quangtrungbank.grpc.generated.EmptyRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.LoanListResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetLoansMethod(), responseObserver);
    }

    /**
     * <pre>
     * === Notifications ===
     * </pre>
     */
    default void getNotifications(com.quangtrungbank.grpc.generated.NotificationRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.NotificationListResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetNotificationsMethod(), responseObserver);
    }

    /**
     */
    default void markNotificationRead(com.quangtrungbank.grpc.generated.MarkNotificationReadRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getMarkNotificationReadMethod(), responseObserver);
    }

    /**
     */
    default void markAllNotificationsRead(com.quangtrungbank.grpc.generated.EmptyRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getMarkAllNotificationsReadMethod(), responseObserver);
    }

    /**
     * <pre>
     * === Teller Operations ===
     * </pre>
     */
    default void tellerCreateCustomer(com.quangtrungbank.grpc.generated.TellerCreateCustomerRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.CustomerResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getTellerCreateCustomerMethod(), responseObserver);
    }

    /**
     */
    default void tellerToggleAccountStatus(com.quangtrungbank.grpc.generated.TellerToggleAccountStatusRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.AccountResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getTellerToggleAccountStatusMethod(), responseObserver);
    }

    /**
     */
    default void tellerUpdateCustomer(com.quangtrungbank.grpc.generated.TellerUpdateCustomerRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.CustomerResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getTellerUpdateCustomerMethod(), responseObserver);
    }
  }

  /**
   * Base class for the server implementation of the service BankService.
   * <pre>
   * Dynamic Banking gRPC Service Definition
   * </pre>
   */
  public static abstract class BankServiceImplBase
      implements io.grpc.BindableService, AsyncService {

    @java.lang.Override public final io.grpc.ServerServiceDefinition bindService() {
      return BankServiceGrpc.bindService(this);
    }
  }

  /**
   * A stub to allow clients to do asynchronous rpc calls to service BankService.
   * <pre>
   * Dynamic Banking gRPC Service Definition
   * </pre>
   */
  public static final class BankServiceStub
      extends io.grpc.stub.AbstractAsyncStub<BankServiceStub> {
    private BankServiceStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected BankServiceStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new BankServiceStub(channel, callOptions);
    }

    /**
     * <pre>
     * === Authentication &amp; Security ===
     * </pre>
     */
    public void login(com.quangtrungbank.grpc.generated.LoginRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.LoginResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getLoginMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void resetLocks(com.quangtrungbank.grpc.generated.EmptyRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getResetLocksMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void changePassword(com.quangtrungbank.grpc.generated.ChangePasswordRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getChangePasswordMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void updateProfile(com.quangtrungbank.grpc.generated.UpdateProfileRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.UserResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getUpdateProfileMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * === Customer Accounts &amp; Profile ===
     * </pre>
     */
    public void getAccounts(com.quangtrungbank.grpc.generated.GetAccountsRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.AccountListResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetAccountsMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void lookupAccount(com.quangtrungbank.grpc.generated.LookupAccountRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.LookupAccountResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getLookupAccountMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * === Core Transactions ===
     * </pre>
     */
    public void transferMoney(com.quangtrungbank.grpc.generated.TransferRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.TransferResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getTransferMoneyMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void atmDeposit(com.quangtrungbank.grpc.generated.AtmTransactionRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.TransactionResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getAtmDepositMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void atmWithdraw(com.quangtrungbank.grpc.generated.AtmTransactionRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.TransactionResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getAtmWithdrawMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void getTransactionHistory(com.quangtrungbank.grpc.generated.TransactionHistoryRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.TransactionListResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetTransactionHistoryMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void getAccountStatement(com.quangtrungbank.grpc.generated.StatementRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.StatementResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetAccountStatementMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * === Cardless ATM Codes ===
     * </pre>
     */
    public void createAtmCode(com.quangtrungbank.grpc.generated.CreateAtmCodeRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.AtmCodeResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getCreateAtmCodeMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void getAtmCodes(com.quangtrungbank.grpc.generated.EmptyRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.AtmCodeListResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetAtmCodesMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void cancelAtmCode(com.quangtrungbank.grpc.generated.CancelAtmCodeRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getCancelAtmCodeMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * === Savings (Tiết kiệm) ===
     * </pre>
     */
    public void openSavings(com.quangtrungbank.grpc.generated.OpenSavingsRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SavingsResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getOpenSavingsMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void closeSavings(com.quangtrungbank.grpc.generated.CloseSavingsRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SavingsResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getCloseSavingsMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void topUpSavings(com.quangtrungbank.grpc.generated.TopUpSavingsRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SavingsResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getTopUpSavingsMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void getSavingsDetail(com.quangtrungbank.grpc.generated.SavingsDetailRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SavingsDetailResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetSavingsDetailMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void getSavingsAccounts(com.quangtrungbank.grpc.generated.EmptyRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SavingsListResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetSavingsAccountsMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void getSavingsInterestRates(com.quangtrungbank.grpc.generated.EmptyRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.InterestRateListResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetSavingsInterestRatesMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * === Loans (Tín dụng &amp; Khoản vay) ===
     * </pre>
     */
    public void applyLoan(com.quangtrungbank.grpc.generated.ApplyLoanRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.LoanResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getApplyLoanMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void getLoans(com.quangtrungbank.grpc.generated.EmptyRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.LoanListResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetLoansMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * === Notifications ===
     * </pre>
     */
    public void getNotifications(com.quangtrungbank.grpc.generated.NotificationRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.NotificationListResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetNotificationsMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void markNotificationRead(com.quangtrungbank.grpc.generated.MarkNotificationReadRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getMarkNotificationReadMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void markAllNotificationsRead(com.quangtrungbank.grpc.generated.EmptyRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getMarkAllNotificationsReadMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * === Teller Operations ===
     * </pre>
     */
    public void tellerCreateCustomer(com.quangtrungbank.grpc.generated.TellerCreateCustomerRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.CustomerResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getTellerCreateCustomerMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void tellerToggleAccountStatus(com.quangtrungbank.grpc.generated.TellerToggleAccountStatusRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.AccountResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getTellerToggleAccountStatusMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void tellerUpdateCustomer(com.quangtrungbank.grpc.generated.TellerUpdateCustomerRequest request,
        io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.CustomerResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getTellerUpdateCustomerMethod(), getCallOptions()), request, responseObserver);
    }
  }

  /**
   * A stub to allow clients to do synchronous rpc calls to service BankService.
   * <pre>
   * Dynamic Banking gRPC Service Definition
   * </pre>
   */
  public static final class BankServiceBlockingStub
      extends io.grpc.stub.AbstractBlockingStub<BankServiceBlockingStub> {
    private BankServiceBlockingStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected BankServiceBlockingStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new BankServiceBlockingStub(channel, callOptions);
    }

    /**
     * <pre>
     * === Authentication &amp; Security ===
     * </pre>
     */
    public com.quangtrungbank.grpc.generated.LoginResponse login(com.quangtrungbank.grpc.generated.LoginRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getLoginMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.SimpleResponse resetLocks(com.quangtrungbank.grpc.generated.EmptyRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getResetLocksMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.SimpleResponse changePassword(com.quangtrungbank.grpc.generated.ChangePasswordRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getChangePasswordMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.UserResponse updateProfile(com.quangtrungbank.grpc.generated.UpdateProfileRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getUpdateProfileMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * === Customer Accounts &amp; Profile ===
     * </pre>
     */
    public com.quangtrungbank.grpc.generated.AccountListResponse getAccounts(com.quangtrungbank.grpc.generated.GetAccountsRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetAccountsMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.LookupAccountResponse lookupAccount(com.quangtrungbank.grpc.generated.LookupAccountRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getLookupAccountMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * === Core Transactions ===
     * </pre>
     */
    public com.quangtrungbank.grpc.generated.TransferResponse transferMoney(com.quangtrungbank.grpc.generated.TransferRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getTransferMoneyMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.TransactionResponse atmDeposit(com.quangtrungbank.grpc.generated.AtmTransactionRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getAtmDepositMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.TransactionResponse atmWithdraw(com.quangtrungbank.grpc.generated.AtmTransactionRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getAtmWithdrawMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.TransactionListResponse getTransactionHistory(com.quangtrungbank.grpc.generated.TransactionHistoryRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetTransactionHistoryMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.StatementResponse getAccountStatement(com.quangtrungbank.grpc.generated.StatementRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetAccountStatementMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * === Cardless ATM Codes ===
     * </pre>
     */
    public com.quangtrungbank.grpc.generated.AtmCodeResponse createAtmCode(com.quangtrungbank.grpc.generated.CreateAtmCodeRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getCreateAtmCodeMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.AtmCodeListResponse getAtmCodes(com.quangtrungbank.grpc.generated.EmptyRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetAtmCodesMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.SimpleResponse cancelAtmCode(com.quangtrungbank.grpc.generated.CancelAtmCodeRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getCancelAtmCodeMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * === Savings (Tiết kiệm) ===
     * </pre>
     */
    public com.quangtrungbank.grpc.generated.SavingsResponse openSavings(com.quangtrungbank.grpc.generated.OpenSavingsRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getOpenSavingsMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.SavingsResponse closeSavings(com.quangtrungbank.grpc.generated.CloseSavingsRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getCloseSavingsMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.SavingsResponse topUpSavings(com.quangtrungbank.grpc.generated.TopUpSavingsRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getTopUpSavingsMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.SavingsDetailResponse getSavingsDetail(com.quangtrungbank.grpc.generated.SavingsDetailRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetSavingsDetailMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.SavingsListResponse getSavingsAccounts(com.quangtrungbank.grpc.generated.EmptyRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetSavingsAccountsMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.InterestRateListResponse getSavingsInterestRates(com.quangtrungbank.grpc.generated.EmptyRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetSavingsInterestRatesMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * === Loans (Tín dụng &amp; Khoản vay) ===
     * </pre>
     */
    public com.quangtrungbank.grpc.generated.LoanResponse applyLoan(com.quangtrungbank.grpc.generated.ApplyLoanRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getApplyLoanMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.LoanListResponse getLoans(com.quangtrungbank.grpc.generated.EmptyRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetLoansMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * === Notifications ===
     * </pre>
     */
    public com.quangtrungbank.grpc.generated.NotificationListResponse getNotifications(com.quangtrungbank.grpc.generated.NotificationRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetNotificationsMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.SimpleResponse markNotificationRead(com.quangtrungbank.grpc.generated.MarkNotificationReadRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getMarkNotificationReadMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.SimpleResponse markAllNotificationsRead(com.quangtrungbank.grpc.generated.EmptyRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getMarkAllNotificationsReadMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * === Teller Operations ===
     * </pre>
     */
    public com.quangtrungbank.grpc.generated.CustomerResponse tellerCreateCustomer(com.quangtrungbank.grpc.generated.TellerCreateCustomerRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getTellerCreateCustomerMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.AccountResponse tellerToggleAccountStatus(com.quangtrungbank.grpc.generated.TellerToggleAccountStatusRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getTellerToggleAccountStatusMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.quangtrungbank.grpc.generated.CustomerResponse tellerUpdateCustomer(com.quangtrungbank.grpc.generated.TellerUpdateCustomerRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getTellerUpdateCustomerMethod(), getCallOptions(), request);
    }
  }

  /**
   * A stub to allow clients to do ListenableFuture-style rpc calls to service BankService.
   * <pre>
   * Dynamic Banking gRPC Service Definition
   * </pre>
   */
  public static final class BankServiceFutureStub
      extends io.grpc.stub.AbstractFutureStub<BankServiceFutureStub> {
    private BankServiceFutureStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected BankServiceFutureStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new BankServiceFutureStub(channel, callOptions);
    }

    /**
     * <pre>
     * === Authentication &amp; Security ===
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.LoginResponse> login(
        com.quangtrungbank.grpc.generated.LoginRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getLoginMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.SimpleResponse> resetLocks(
        com.quangtrungbank.grpc.generated.EmptyRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getResetLocksMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.SimpleResponse> changePassword(
        com.quangtrungbank.grpc.generated.ChangePasswordRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getChangePasswordMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.UserResponse> updateProfile(
        com.quangtrungbank.grpc.generated.UpdateProfileRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getUpdateProfileMethod(), getCallOptions()), request);
    }

    /**
     * <pre>
     * === Customer Accounts &amp; Profile ===
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.AccountListResponse> getAccounts(
        com.quangtrungbank.grpc.generated.GetAccountsRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetAccountsMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.LookupAccountResponse> lookupAccount(
        com.quangtrungbank.grpc.generated.LookupAccountRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getLookupAccountMethod(), getCallOptions()), request);
    }

    /**
     * <pre>
     * === Core Transactions ===
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.TransferResponse> transferMoney(
        com.quangtrungbank.grpc.generated.TransferRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getTransferMoneyMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.TransactionResponse> atmDeposit(
        com.quangtrungbank.grpc.generated.AtmTransactionRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getAtmDepositMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.TransactionResponse> atmWithdraw(
        com.quangtrungbank.grpc.generated.AtmTransactionRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getAtmWithdrawMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.TransactionListResponse> getTransactionHistory(
        com.quangtrungbank.grpc.generated.TransactionHistoryRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetTransactionHistoryMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.StatementResponse> getAccountStatement(
        com.quangtrungbank.grpc.generated.StatementRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetAccountStatementMethod(), getCallOptions()), request);
    }

    /**
     * <pre>
     * === Cardless ATM Codes ===
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.AtmCodeResponse> createAtmCode(
        com.quangtrungbank.grpc.generated.CreateAtmCodeRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getCreateAtmCodeMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.AtmCodeListResponse> getAtmCodes(
        com.quangtrungbank.grpc.generated.EmptyRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetAtmCodesMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.SimpleResponse> cancelAtmCode(
        com.quangtrungbank.grpc.generated.CancelAtmCodeRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getCancelAtmCodeMethod(), getCallOptions()), request);
    }

    /**
     * <pre>
     * === Savings (Tiết kiệm) ===
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.SavingsResponse> openSavings(
        com.quangtrungbank.grpc.generated.OpenSavingsRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getOpenSavingsMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.SavingsResponse> closeSavings(
        com.quangtrungbank.grpc.generated.CloseSavingsRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getCloseSavingsMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.SavingsResponse> topUpSavings(
        com.quangtrungbank.grpc.generated.TopUpSavingsRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getTopUpSavingsMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.SavingsDetailResponse> getSavingsDetail(
        com.quangtrungbank.grpc.generated.SavingsDetailRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetSavingsDetailMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.SavingsListResponse> getSavingsAccounts(
        com.quangtrungbank.grpc.generated.EmptyRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetSavingsAccountsMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.InterestRateListResponse> getSavingsInterestRates(
        com.quangtrungbank.grpc.generated.EmptyRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetSavingsInterestRatesMethod(), getCallOptions()), request);
    }

    /**
     * <pre>
     * === Loans (Tín dụng &amp; Khoản vay) ===
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.LoanResponse> applyLoan(
        com.quangtrungbank.grpc.generated.ApplyLoanRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getApplyLoanMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.LoanListResponse> getLoans(
        com.quangtrungbank.grpc.generated.EmptyRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetLoansMethod(), getCallOptions()), request);
    }

    /**
     * <pre>
     * === Notifications ===
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.NotificationListResponse> getNotifications(
        com.quangtrungbank.grpc.generated.NotificationRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetNotificationsMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.SimpleResponse> markNotificationRead(
        com.quangtrungbank.grpc.generated.MarkNotificationReadRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getMarkNotificationReadMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.SimpleResponse> markAllNotificationsRead(
        com.quangtrungbank.grpc.generated.EmptyRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getMarkAllNotificationsReadMethod(), getCallOptions()), request);
    }

    /**
     * <pre>
     * === Teller Operations ===
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.CustomerResponse> tellerCreateCustomer(
        com.quangtrungbank.grpc.generated.TellerCreateCustomerRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getTellerCreateCustomerMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.AccountResponse> tellerToggleAccountStatus(
        com.quangtrungbank.grpc.generated.TellerToggleAccountStatusRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getTellerToggleAccountStatusMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.quangtrungbank.grpc.generated.CustomerResponse> tellerUpdateCustomer(
        com.quangtrungbank.grpc.generated.TellerUpdateCustomerRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getTellerUpdateCustomerMethod(), getCallOptions()), request);
    }
  }

  private static final int METHODID_LOGIN = 0;
  private static final int METHODID_RESET_LOCKS = 1;
  private static final int METHODID_CHANGE_PASSWORD = 2;
  private static final int METHODID_UPDATE_PROFILE = 3;
  private static final int METHODID_GET_ACCOUNTS = 4;
  private static final int METHODID_LOOKUP_ACCOUNT = 5;
  private static final int METHODID_TRANSFER_MONEY = 6;
  private static final int METHODID_ATM_DEPOSIT = 7;
  private static final int METHODID_ATM_WITHDRAW = 8;
  private static final int METHODID_GET_TRANSACTION_HISTORY = 9;
  private static final int METHODID_GET_ACCOUNT_STATEMENT = 10;
  private static final int METHODID_CREATE_ATM_CODE = 11;
  private static final int METHODID_GET_ATM_CODES = 12;
  private static final int METHODID_CANCEL_ATM_CODE = 13;
  private static final int METHODID_OPEN_SAVINGS = 14;
  private static final int METHODID_CLOSE_SAVINGS = 15;
  private static final int METHODID_TOP_UP_SAVINGS = 16;
  private static final int METHODID_GET_SAVINGS_DETAIL = 17;
  private static final int METHODID_GET_SAVINGS_ACCOUNTS = 18;
  private static final int METHODID_GET_SAVINGS_INTEREST_RATES = 19;
  private static final int METHODID_APPLY_LOAN = 20;
  private static final int METHODID_GET_LOANS = 21;
  private static final int METHODID_GET_NOTIFICATIONS = 22;
  private static final int METHODID_MARK_NOTIFICATION_READ = 23;
  private static final int METHODID_MARK_ALL_NOTIFICATIONS_READ = 24;
  private static final int METHODID_TELLER_CREATE_CUSTOMER = 25;
  private static final int METHODID_TELLER_TOGGLE_ACCOUNT_STATUS = 26;
  private static final int METHODID_TELLER_UPDATE_CUSTOMER = 27;

  private static final class MethodHandlers<Req, Resp> implements
      io.grpc.stub.ServerCalls.UnaryMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ServerStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ClientStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.BidiStreamingMethod<Req, Resp> {
    private final AsyncService serviceImpl;
    private final int methodId;

    MethodHandlers(AsyncService serviceImpl, int methodId) {
      this.serviceImpl = serviceImpl;
      this.methodId = methodId;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public void invoke(Req request, io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        case METHODID_LOGIN:
          serviceImpl.login((com.quangtrungbank.grpc.generated.LoginRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.LoginResponse>) responseObserver);
          break;
        case METHODID_RESET_LOCKS:
          serviceImpl.resetLocks((com.quangtrungbank.grpc.generated.EmptyRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SimpleResponse>) responseObserver);
          break;
        case METHODID_CHANGE_PASSWORD:
          serviceImpl.changePassword((com.quangtrungbank.grpc.generated.ChangePasswordRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SimpleResponse>) responseObserver);
          break;
        case METHODID_UPDATE_PROFILE:
          serviceImpl.updateProfile((com.quangtrungbank.grpc.generated.UpdateProfileRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.UserResponse>) responseObserver);
          break;
        case METHODID_GET_ACCOUNTS:
          serviceImpl.getAccounts((com.quangtrungbank.grpc.generated.GetAccountsRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.AccountListResponse>) responseObserver);
          break;
        case METHODID_LOOKUP_ACCOUNT:
          serviceImpl.lookupAccount((com.quangtrungbank.grpc.generated.LookupAccountRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.LookupAccountResponse>) responseObserver);
          break;
        case METHODID_TRANSFER_MONEY:
          serviceImpl.transferMoney((com.quangtrungbank.grpc.generated.TransferRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.TransferResponse>) responseObserver);
          break;
        case METHODID_ATM_DEPOSIT:
          serviceImpl.atmDeposit((com.quangtrungbank.grpc.generated.AtmTransactionRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.TransactionResponse>) responseObserver);
          break;
        case METHODID_ATM_WITHDRAW:
          serviceImpl.atmWithdraw((com.quangtrungbank.grpc.generated.AtmTransactionRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.TransactionResponse>) responseObserver);
          break;
        case METHODID_GET_TRANSACTION_HISTORY:
          serviceImpl.getTransactionHistory((com.quangtrungbank.grpc.generated.TransactionHistoryRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.TransactionListResponse>) responseObserver);
          break;
        case METHODID_GET_ACCOUNT_STATEMENT:
          serviceImpl.getAccountStatement((com.quangtrungbank.grpc.generated.StatementRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.StatementResponse>) responseObserver);
          break;
        case METHODID_CREATE_ATM_CODE:
          serviceImpl.createAtmCode((com.quangtrungbank.grpc.generated.CreateAtmCodeRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.AtmCodeResponse>) responseObserver);
          break;
        case METHODID_GET_ATM_CODES:
          serviceImpl.getAtmCodes((com.quangtrungbank.grpc.generated.EmptyRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.AtmCodeListResponse>) responseObserver);
          break;
        case METHODID_CANCEL_ATM_CODE:
          serviceImpl.cancelAtmCode((com.quangtrungbank.grpc.generated.CancelAtmCodeRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SimpleResponse>) responseObserver);
          break;
        case METHODID_OPEN_SAVINGS:
          serviceImpl.openSavings((com.quangtrungbank.grpc.generated.OpenSavingsRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SavingsResponse>) responseObserver);
          break;
        case METHODID_CLOSE_SAVINGS:
          serviceImpl.closeSavings((com.quangtrungbank.grpc.generated.CloseSavingsRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SavingsResponse>) responseObserver);
          break;
        case METHODID_TOP_UP_SAVINGS:
          serviceImpl.topUpSavings((com.quangtrungbank.grpc.generated.TopUpSavingsRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SavingsResponse>) responseObserver);
          break;
        case METHODID_GET_SAVINGS_DETAIL:
          serviceImpl.getSavingsDetail((com.quangtrungbank.grpc.generated.SavingsDetailRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SavingsDetailResponse>) responseObserver);
          break;
        case METHODID_GET_SAVINGS_ACCOUNTS:
          serviceImpl.getSavingsAccounts((com.quangtrungbank.grpc.generated.EmptyRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SavingsListResponse>) responseObserver);
          break;
        case METHODID_GET_SAVINGS_INTEREST_RATES:
          serviceImpl.getSavingsInterestRates((com.quangtrungbank.grpc.generated.EmptyRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.InterestRateListResponse>) responseObserver);
          break;
        case METHODID_APPLY_LOAN:
          serviceImpl.applyLoan((com.quangtrungbank.grpc.generated.ApplyLoanRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.LoanResponse>) responseObserver);
          break;
        case METHODID_GET_LOANS:
          serviceImpl.getLoans((com.quangtrungbank.grpc.generated.EmptyRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.LoanListResponse>) responseObserver);
          break;
        case METHODID_GET_NOTIFICATIONS:
          serviceImpl.getNotifications((com.quangtrungbank.grpc.generated.NotificationRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.NotificationListResponse>) responseObserver);
          break;
        case METHODID_MARK_NOTIFICATION_READ:
          serviceImpl.markNotificationRead((com.quangtrungbank.grpc.generated.MarkNotificationReadRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SimpleResponse>) responseObserver);
          break;
        case METHODID_MARK_ALL_NOTIFICATIONS_READ:
          serviceImpl.markAllNotificationsRead((com.quangtrungbank.grpc.generated.EmptyRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.SimpleResponse>) responseObserver);
          break;
        case METHODID_TELLER_CREATE_CUSTOMER:
          serviceImpl.tellerCreateCustomer((com.quangtrungbank.grpc.generated.TellerCreateCustomerRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.CustomerResponse>) responseObserver);
          break;
        case METHODID_TELLER_TOGGLE_ACCOUNT_STATUS:
          serviceImpl.tellerToggleAccountStatus((com.quangtrungbank.grpc.generated.TellerToggleAccountStatusRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.AccountResponse>) responseObserver);
          break;
        case METHODID_TELLER_UPDATE_CUSTOMER:
          serviceImpl.tellerUpdateCustomer((com.quangtrungbank.grpc.generated.TellerUpdateCustomerRequest) request,
              (io.grpc.stub.StreamObserver<com.quangtrungbank.grpc.generated.CustomerResponse>) responseObserver);
          break;
        default:
          throw new AssertionError();
      }
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public io.grpc.stub.StreamObserver<Req> invoke(
        io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        default:
          throw new AssertionError();
      }
    }
  }

  public static final io.grpc.ServerServiceDefinition bindService(AsyncService service) {
    return io.grpc.ServerServiceDefinition.builder(getServiceDescriptor())
        .addMethod(
          getLoginMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.LoginRequest,
              com.quangtrungbank.grpc.generated.LoginResponse>(
                service, METHODID_LOGIN)))
        .addMethod(
          getResetLocksMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.EmptyRequest,
              com.quangtrungbank.grpc.generated.SimpleResponse>(
                service, METHODID_RESET_LOCKS)))
        .addMethod(
          getChangePasswordMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.ChangePasswordRequest,
              com.quangtrungbank.grpc.generated.SimpleResponse>(
                service, METHODID_CHANGE_PASSWORD)))
        .addMethod(
          getUpdateProfileMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.UpdateProfileRequest,
              com.quangtrungbank.grpc.generated.UserResponse>(
                service, METHODID_UPDATE_PROFILE)))
        .addMethod(
          getGetAccountsMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.GetAccountsRequest,
              com.quangtrungbank.grpc.generated.AccountListResponse>(
                service, METHODID_GET_ACCOUNTS)))
        .addMethod(
          getLookupAccountMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.LookupAccountRequest,
              com.quangtrungbank.grpc.generated.LookupAccountResponse>(
                service, METHODID_LOOKUP_ACCOUNT)))
        .addMethod(
          getTransferMoneyMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.TransferRequest,
              com.quangtrungbank.grpc.generated.TransferResponse>(
                service, METHODID_TRANSFER_MONEY)))
        .addMethod(
          getAtmDepositMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.AtmTransactionRequest,
              com.quangtrungbank.grpc.generated.TransactionResponse>(
                service, METHODID_ATM_DEPOSIT)))
        .addMethod(
          getAtmWithdrawMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.AtmTransactionRequest,
              com.quangtrungbank.grpc.generated.TransactionResponse>(
                service, METHODID_ATM_WITHDRAW)))
        .addMethod(
          getGetTransactionHistoryMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.TransactionHistoryRequest,
              com.quangtrungbank.grpc.generated.TransactionListResponse>(
                service, METHODID_GET_TRANSACTION_HISTORY)))
        .addMethod(
          getGetAccountStatementMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.StatementRequest,
              com.quangtrungbank.grpc.generated.StatementResponse>(
                service, METHODID_GET_ACCOUNT_STATEMENT)))
        .addMethod(
          getCreateAtmCodeMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.CreateAtmCodeRequest,
              com.quangtrungbank.grpc.generated.AtmCodeResponse>(
                service, METHODID_CREATE_ATM_CODE)))
        .addMethod(
          getGetAtmCodesMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.EmptyRequest,
              com.quangtrungbank.grpc.generated.AtmCodeListResponse>(
                service, METHODID_GET_ATM_CODES)))
        .addMethod(
          getCancelAtmCodeMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.CancelAtmCodeRequest,
              com.quangtrungbank.grpc.generated.SimpleResponse>(
                service, METHODID_CANCEL_ATM_CODE)))
        .addMethod(
          getOpenSavingsMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.OpenSavingsRequest,
              com.quangtrungbank.grpc.generated.SavingsResponse>(
                service, METHODID_OPEN_SAVINGS)))
        .addMethod(
          getCloseSavingsMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.CloseSavingsRequest,
              com.quangtrungbank.grpc.generated.SavingsResponse>(
                service, METHODID_CLOSE_SAVINGS)))
        .addMethod(
          getTopUpSavingsMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.TopUpSavingsRequest,
              com.quangtrungbank.grpc.generated.SavingsResponse>(
                service, METHODID_TOP_UP_SAVINGS)))
        .addMethod(
          getGetSavingsDetailMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.SavingsDetailRequest,
              com.quangtrungbank.grpc.generated.SavingsDetailResponse>(
                service, METHODID_GET_SAVINGS_DETAIL)))
        .addMethod(
          getGetSavingsAccountsMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.EmptyRequest,
              com.quangtrungbank.grpc.generated.SavingsListResponse>(
                service, METHODID_GET_SAVINGS_ACCOUNTS)))
        .addMethod(
          getGetSavingsInterestRatesMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.EmptyRequest,
              com.quangtrungbank.grpc.generated.InterestRateListResponse>(
                service, METHODID_GET_SAVINGS_INTEREST_RATES)))
        .addMethod(
          getApplyLoanMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.ApplyLoanRequest,
              com.quangtrungbank.grpc.generated.LoanResponse>(
                service, METHODID_APPLY_LOAN)))
        .addMethod(
          getGetLoansMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.EmptyRequest,
              com.quangtrungbank.grpc.generated.LoanListResponse>(
                service, METHODID_GET_LOANS)))
        .addMethod(
          getGetNotificationsMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.NotificationRequest,
              com.quangtrungbank.grpc.generated.NotificationListResponse>(
                service, METHODID_GET_NOTIFICATIONS)))
        .addMethod(
          getMarkNotificationReadMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.MarkNotificationReadRequest,
              com.quangtrungbank.grpc.generated.SimpleResponse>(
                service, METHODID_MARK_NOTIFICATION_READ)))
        .addMethod(
          getMarkAllNotificationsReadMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.EmptyRequest,
              com.quangtrungbank.grpc.generated.SimpleResponse>(
                service, METHODID_MARK_ALL_NOTIFICATIONS_READ)))
        .addMethod(
          getTellerCreateCustomerMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.TellerCreateCustomerRequest,
              com.quangtrungbank.grpc.generated.CustomerResponse>(
                service, METHODID_TELLER_CREATE_CUSTOMER)))
        .addMethod(
          getTellerToggleAccountStatusMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.TellerToggleAccountStatusRequest,
              com.quangtrungbank.grpc.generated.AccountResponse>(
                service, METHODID_TELLER_TOGGLE_ACCOUNT_STATUS)))
        .addMethod(
          getTellerUpdateCustomerMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.quangtrungbank.grpc.generated.TellerUpdateCustomerRequest,
              com.quangtrungbank.grpc.generated.CustomerResponse>(
                service, METHODID_TELLER_UPDATE_CUSTOMER)))
        .build();
  }

  private static abstract class BankServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoFileDescriptorSupplier, io.grpc.protobuf.ProtoServiceDescriptorSupplier {
    BankServiceBaseDescriptorSupplier() {}

    @java.lang.Override
    public com.google.protobuf.Descriptors.FileDescriptor getFileDescriptor() {
      return com.quangtrungbank.grpc.generated.BankServiceProto.getDescriptor();
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.ServiceDescriptor getServiceDescriptor() {
      return getFileDescriptor().findServiceByName("BankService");
    }
  }

  private static final class BankServiceFileDescriptorSupplier
      extends BankServiceBaseDescriptorSupplier {
    BankServiceFileDescriptorSupplier() {}
  }

  private static final class BankServiceMethodDescriptorSupplier
      extends BankServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoMethodDescriptorSupplier {
    private final java.lang.String methodName;

    BankServiceMethodDescriptorSupplier(java.lang.String methodName) {
      this.methodName = methodName;
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.MethodDescriptor getMethodDescriptor() {
      return getServiceDescriptor().findMethodByName(methodName);
    }
  }

  private static volatile io.grpc.ServiceDescriptor serviceDescriptor;

  public static io.grpc.ServiceDescriptor getServiceDescriptor() {
    io.grpc.ServiceDescriptor result = serviceDescriptor;
    if (result == null) {
      synchronized (BankServiceGrpc.class) {
        result = serviceDescriptor;
        if (result == null) {
          serviceDescriptor = result = io.grpc.ServiceDescriptor.newBuilder(SERVICE_NAME)
              .setSchemaDescriptor(new BankServiceFileDescriptorSupplier())
              .addMethod(getLoginMethod())
              .addMethod(getResetLocksMethod())
              .addMethod(getChangePasswordMethod())
              .addMethod(getUpdateProfileMethod())
              .addMethod(getGetAccountsMethod())
              .addMethod(getLookupAccountMethod())
              .addMethod(getTransferMoneyMethod())
              .addMethod(getAtmDepositMethod())
              .addMethod(getAtmWithdrawMethod())
              .addMethod(getGetTransactionHistoryMethod())
              .addMethod(getGetAccountStatementMethod())
              .addMethod(getCreateAtmCodeMethod())
              .addMethod(getGetAtmCodesMethod())
              .addMethod(getCancelAtmCodeMethod())
              .addMethod(getOpenSavingsMethod())
              .addMethod(getCloseSavingsMethod())
              .addMethod(getTopUpSavingsMethod())
              .addMethod(getGetSavingsDetailMethod())
              .addMethod(getGetSavingsAccountsMethod())
              .addMethod(getGetSavingsInterestRatesMethod())
              .addMethod(getApplyLoanMethod())
              .addMethod(getGetLoansMethod())
              .addMethod(getGetNotificationsMethod())
              .addMethod(getMarkNotificationReadMethod())
              .addMethod(getMarkAllNotificationsReadMethod())
              .addMethod(getTellerCreateCustomerMethod())
              .addMethod(getTellerToggleAccountStatusMethod())
              .addMethod(getTellerUpdateCustomerMethod())
              .build();
        }
      }
    }
    return result;
  }
}
