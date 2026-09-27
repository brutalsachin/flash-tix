package com.flashtix.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(nullable = false)
    private double amount;

    @Column(nullable = false)
    private String status; // INITIATED, SUCCESS, FAILED

    private String providerReference;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public Payment() {}

    public Payment(Booking booking, double amount, String status, String providerReference) {
        this.booking = booking;
        this.amount = amount;
        this.status = status;
        this.providerReference = providerReference;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Booking getBooking() { return booking; }
    public double getAmount() { return amount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getProviderReference() { return providerReference; }
    public void setProviderReference(String providerReference) { this.providerReference = providerReference; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}