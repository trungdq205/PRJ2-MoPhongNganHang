package com.quangtrungbank.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "tellers")
public class Teller {
    @Id
    @Column(length = 50)
    private String id;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id", unique = true)
    private User user;

    @Column(name = "staff_code", nullable = false, unique = true, length = 20)
    private String staffCode;

    @Column(length = 100)
    private String branch = "Hội Sở QuangTrung Bank";

    @Column(columnDefinition = "TEXT")
    private String permissions;

    public Teller() {
    }

    public Teller(String id, User user, String staffCode, String branch, String permissions) {
        this.id = id;
        this.user = user;
        this.staffCode = staffCode;
        this.branch = branch;
        this.permissions = permissions;
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

    public String getStaffCode() {
        return staffCode;
    }

    public void setStaffCode(String staffCode) {
        this.staffCode = staffCode;
    }

    public String getBranch() {
        return branch;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public String getPermissions() {
        return permissions;
    }

    public void setPermissions(String permissions) {
        this.permissions = permissions;
    }
}
