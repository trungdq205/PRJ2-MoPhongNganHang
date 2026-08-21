package com.quangtrungbank;

import com.quangtrungbank.entity.Account;
import com.quangtrungbank.entity.Customer;
import com.quangtrungbank.entity.User;
import com.quangtrungbank.grpc.BankGrpcServiceImpl;
import com.quangtrungbank.grpc.generated.BankServiceGrpc;
import com.quangtrungbank.grpc.generated.TransferRequest;
import com.quangtrungbank.grpc.generated.TransferResponse;
import com.quangtrungbank.repository.AccountRepository;
import com.quangtrungbank.repository.CustomerRepository;
import com.quangtrungbank.repository.UserRepository;
import io.grpc.ManagedChannel;
import io.grpc.inprocess.InProcessChannelBuilder;
import io.grpc.inprocess.InProcessServerBuilder;
import io.grpc.Server;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class BankGrpcTransferIntegrationTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Test
    @DisplayName("gRPC transfer RPC should succeed for a valid transfer request")
    void transferMoneyGrpc_shouldSucceed() throws Exception {
        String uuid = UUID.randomUUID().toString().replace("-", "").substring(0, 8);

        User senderUser = new User();
        senderUser.setUsername("grpc_test_sender_" + uuid);
        senderUser.setPassword("Password@123");
        senderUser.setFullName("gRPC Test Sender");
        senderUser.setRole("CUSTOMER");
        senderUser = userRepository.save(senderUser);

        Customer customer = new Customer();
        customer.setId("CUST-GRPC-" + uuid);
        customer.setUser(senderUser);
        customer.setIdCard("901" + System.currentTimeMillis() % 1000000000L);
        customer = customerRepository.save(customer);

        Account source = new Account();
        source.setAccountNo("GRPC_SRC_" + uuid);
        source.setCustomerId(customer.getId());
        source.setBalance(new BigDecimal("50000000"));
        source.setType("PAYMENT");
        source.setStatus("ACTIVE");
        source = accountRepository.save(source);

        Account target = new Account();
        target.setAccountNo("GRPC_RECV_" + uuid);
        target.setCustomerId(customer.getId());
        target.setBalance(new BigDecimal("10000000"));
        target.setType("PAYMENT");
        target.setStatus("ACTIVE");
        target = accountRepository.save(target);

        String serverName = InProcessServerBuilder.generateName();
        Server server = InProcessServerBuilder.forName(serverName)
                .directExecutor()
                .addService(applicationContext.getBean(BankGrpcServiceImpl.class))
                .build()
                .start();

        try {
            ManagedChannel channel = InProcessChannelBuilder.forName(serverName)
                    .directExecutor()
                    .build();

            try {
                BankServiceGrpc.BankServiceBlockingStub stub = BankServiceGrpc.newBlockingStub(channel);
                TransferRequest request = TransferRequest.newBuilder()
                        .setFromAccount(source.getAccountNo())
                        .setToAccount(target.getAccountNo())
                        .setAmount(5000000.0)
                        .setContent("gRPC integration transfer")
                        .setIdempotencyKey(UUID.randomUUID().toString())
                        .build();

                TransferResponse response = stub.transferMoney(request);

                assertTrue(response.getSuccess());
                assertNotNull(response.getTransactionId());
                assertEquals(5000000.0, response.getAmount(), 0.0001);
            } finally {
                channel.shutdownNow();
            }
        } finally {
            server.shutdownNow();
        }
    }
}
