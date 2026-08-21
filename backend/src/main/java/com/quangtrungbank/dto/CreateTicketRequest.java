package com.quangtrungbank.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateTicketRequest {

    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
    private String subject;

    @NotBlank(message = "Nội dung không được để trống")
    private String content;

    private String accountNo;

    public CreateTicketRequest() {
    }

    public CreateTicketRequest(String subject, String content, String accountNo) {
        this.subject = subject;
        this.content = content;
        this.accountNo = accountNo;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getAccountNo() {
        return accountNo;
    }

    public void setAccountNo(String accountNo) {
        this.accountNo = accountNo;
    }
}
