package com.quangtrungbank.config;

import com.quangtrungbank.grpc.BankGrpcServiceImpl;
import io.grpc.Server;
import io.grpc.netty.shaded.io.grpc.netty.NettyServerBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GrpcServerConfig {

    @Value("${grpc.server.port:9090}")
    private int grpcServerPort;

    @Bean(initMethod = "start", destroyMethod = "shutdown")
    @ConditionalOnProperty(name = "grpc.server.enabled", havingValue = "true", matchIfMissing = true)
    public Server grpcServer(BankGrpcServiceImpl bankGrpcServiceImpl) {
        return NettyServerBuilder.forPort(grpcServerPort)
                .addService(bankGrpcServiceImpl)
                .build();
    }
}
