package com.quangtrungbank.dto;

import jakarta.validation.constraints.NotBlank;

public class ResolveTicketRequest {

    @NotBlank(message = "Nội dung phản hồi không được để trống")
    private String response;

    private String status = "RESOLVED"; // RESOLVED or REJECTED

    public ResolveTicketRequest() {
    }

    public ResolveTicketRequest(String response, String status) {
        this.response = response;
        this.status = status;
    }

    public String getResponse() {
        return response;
    }

    public void setResponse(String response) {
        this.response = response;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
