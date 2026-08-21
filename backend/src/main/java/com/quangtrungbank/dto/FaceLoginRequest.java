package com.quangtrungbank.dto;

public class FaceLoginRequest {
    private String username;
    private String faceData;
    private Double livenessScore;

    public FaceLoginRequest() {
    }

    public FaceLoginRequest(String username, String faceData, Double livenessScore) {
        this.username = username;
        this.faceData = faceData;
        this.livenessScore = livenessScore;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getFaceData() {
        return faceData;
    }

    public void setFaceData(String faceData) {
        this.faceData = faceData;
    }

    public Double getLivenessScore() {
        return livenessScore;
    }

    public void setLivenessScore(Double livenessScore) {
        this.livenessScore = livenessScore;
    }
}
