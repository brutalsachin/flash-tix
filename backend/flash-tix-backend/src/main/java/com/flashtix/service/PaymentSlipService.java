package com.flashtix.service;

import com.flashtix.dto.PaymentSlipResponse;
import com.flashtix.entity.Booking;
import com.flashtix.repository.BookingRepository;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class PaymentSlipService {

    private final BookingRepository bookingRepository;

    public PaymentSlipService(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    public PaymentSlipResponse generateSlip(Long bookingId, Long requestingUserId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if (!booking.getUser().getId().equals(requestingUserId)) {
            throw new IllegalArgumentException("You are not authorized to view this receipt");
        }

        String receiptNumber = "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        return new PaymentSlipResponse(
                receiptNumber,
                booking.getId(),
                booking.getSeat().getSeatNumber(),
                booking.getSeat().getEvent().getName(),
                booking.getCreatedAt(),
                booking.getStatus()
        );
    }
}