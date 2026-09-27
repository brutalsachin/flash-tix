package com.flashtix.dto;

import java.time.LocalDateTime;

public class PaymentSlipResponse {
    private final String receiptNumber;
    private final Long bookingId;
    private final String seatNumber;
    private final String eventName;
    private final LocalDateTime issuedAt;
    private final String status;

    public PaymentSlipResponse(String receiptNumber, Long bookingId, String seatNumber,
                               String eventName, LocalDateTime issuedAt, String status) {
        this.receiptNumber = receiptNumber;
        this.bookingId = bookingId;
        this.seatNumber = seatNumber;
        this.eventName = eventName;
        this.issuedAt = issuedAt;
        this.status = status;
    }

    public String getReceiptNumber() { return receiptNumber; }
    public Long getBookingId() { return bookingId; }
    public String getSeatNumber() { return seatNumber; }
    public String getEventName() { return eventName; }
    public LocalDateTime getIssuedAt() { return issuedAt; }
    public String getStatus() { return status; }
}