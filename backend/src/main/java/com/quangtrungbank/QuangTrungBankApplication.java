package com.quangtrungbank;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class QuangTrungBankApplication {
    public static void main(String[] args) {
        SpringApplication.run(QuangTrungBankApplication.class, args);
        System.out.println("=================================================");
        System.out.println("🚀 QuangTrung Bank Backend is running on port 8080");
        System.out.println("=================================================");
    }
}
