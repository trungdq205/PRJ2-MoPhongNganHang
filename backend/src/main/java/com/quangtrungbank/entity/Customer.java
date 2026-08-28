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

    public Customer() {
    }

    public Customer(String id, User user, String idCard, String address) {
        this.id = id;
        this.user = user;
        this.idCard = idCard;
        this.address = address;
        this.contactAddress = address;
    }

    public Customer(String id, User user, String idCard, String address, String contactAddress) {
        this.id = id;
        this.user = user;
        this.idCard = idCard;
        this.address = address;
        this.contactAddress = contactAddress != null && !contactAddress.isBlank() ? contactAddress : address;
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
}
