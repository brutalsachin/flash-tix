package com.flashtix.dto;

public class SeatResponse {
    private final Long id;
    private final String seatNumber;
    private final String status;

    public SeatResponse(Long id, String seatNumber, String status) {
        this.id = id;
        this.seatNumber = seatNumber;
        this.status = status;
    }

    public Long getId() { return id; }
    public String getSeatNumber() { return seatNumber; }
    public String getStatus() { return status; }
}