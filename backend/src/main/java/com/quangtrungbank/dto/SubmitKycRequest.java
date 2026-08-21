package com.quangtrungbank.dto;

public class SubmitKycRequest {
    private String idCardFront;
    private String idCardBack;
    private String selfiePhoto;

    public SubmitKycRequest() {
    }

    public SubmitKycRequest(String idCardFront, String idCardBack, String selfiePhoto) {
        this.idCardFront = idCardFront;
        this.idCardBack = idCardBack;
        this.selfiePhoto = selfiePhoto;
    }

    public String getIdCardFront() {
        return idCardFront;
    }

    public void setIdCardFront(String idCardFront) {
        this.idCardFront = idCardFront;
    }

    public String getIdCardBack() {
        return idCardBack;
    }

    public void setIdCardBack(String idCardBack) {
        this.idCardBack = idCardBack;
    }

    public String getSelfiePhoto() {
        return selfiePhoto;
    }

    public void setSelfiePhoto(String selfiePhoto) {
        this.selfiePhoto = selfiePhoto;
    }
}
