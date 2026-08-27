package com.quangtrungbank.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "customers")
public class Customer {
    @Id
    @Column(length = 50)
    private String id;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id", unique = true)
    private User user;


    @Column(name = "id_card", nullable = false, unique = true, length = 20)
    private String idCard;

    @Column(name = "address")
    private String address;

    @Column(name = "contact_address")
    private String contactAddress;

    @Column(name = "kyc_status", length = 20)
    private String kycStatus = "NOT_VERIFIED";

    @Lob
    @Column(name = "id_card_front", columnDefinition = "LONGTEXT")
    private String idCardFront;

    @Lob
    @Column(name = "id_card_back", columnDefinition = "LONGTEXT")
    private String idCardBack;

    @Lob
    @Column(name = "selfie_photo", columnDefinition = "LONGTEXT")
    private String selfiePhoto;

    @Column(name = "kyc_verified_at")
    private java.time.LocalDateTime kycVerifiedAt;

    public Customer() {
    }

    public Customer(String id, User user, String idCard, String address) {
        this.id = id;
        this.user = user;
        this.idCard = idCard;
        this.address = address;
        this.contactAddress = address;
        this.kycStatus = "NOT_VERIFIED";
    }

    public Customer(String id, User user, String idCard, String address, String contactAddress) {
        this.id = id;
        this.user = user;
        this.idCard = idCard;
        this.address = address;
        this.contactAddress = contactAddress != null && !contactAddress.isBlank() ? contactAddress : address;
        this.kycStatus = "NOT_VERIFIED";
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getIdCard() {
        return idCard;
    }

    public void setIdCard(String idCard) {
        this.idCard = idCard;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getContactAddress() {
        return contactAddress;
    }

    public void setContactAddress(String contactAddress) {
        this.contactAddress = contactAddress;
    }

    public String getKycStatus() {
        return kycStatus;
    }

    public void setKycStatus(String kycStatus) {
        this.kycStatus = kycStatus;
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

    public java.time.LocalDateTime getKycVerifiedAt() {
        return kycVerifiedAt;
    }

    public void setKycVerifiedAt(java.time.LocalDateTime kycVerifiedAt) {
        this.kycVerifiedAt = kycVerifiedAt;
    }
}
