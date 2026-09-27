package com.flashtix.service;

import com.flashtix.entity.Booking;
import com.flashtix.entity.IdempotencyRecord;
import com.flashtix.entity.Payment;
import com.flashtix.entity.Seat;
import com.flashtix.entity.User;
import com.flashtix.repository.BookingRepository;
import com.flashtix.repository.IdempotencyRecordRepository;
import com.flashtix.repository.PaymentRepository;
import com.flashtix.repository.SeatRepository;
import com.flashtix.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {

    private final SeatRepository seatRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final IdempotencyRecordRepository idempotencyRecordRepository;
    private final IdempotencyService idempotencyService;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;

    public BookingService(SeatRepository seatRepository, BookingRepository bookingRepository,
                          UserRepository userRepository, IdempotencyRecordRepository idempotencyRecordRepository,
                          IdempotencyService idempotencyService, PaymentRepository paymentRepository,
                          PaymentService paymentService) {
        this.seatRepository = seatRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.idempotencyRecordRepository = idempotencyRecordRepository;
        this.idempotencyService = idempotencyService;
        this.paymentRepository = paymentRepository;
        this.paymentService = paymentService;
    }

    // PHASE 1: Hold the seat, create a pending booking. No payment yet.
    @Transactional
    public Booking holdSeat(Long seatId, Long userId, String idempotencyKey) {

        if (idempotencyKey != null) {
            IdempotencyRecord existing = idempotencyRecordRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
            if (existing != null) {
                if (existing.getBookingId() != null) {
                    return bookingRepository.findById(existing.getBookingId())
                            .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
                }
                throw new IllegalArgumentException("Duplicate request already in progress, please retry shortly");
            }
            boolean reserved = idempotencyService.tryReserve(idempotencyKey);
            if (!reserved) {
                throw new IllegalArgumentException("Duplicate request already in progress, please retry shortly");
            }
        }

        int updatedRows = seatRepository.holdSeat(seatId);
        if (updatedRows == 0) {
            throw new IllegalArgumentException("Seat is no longer available");
        }

        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new IllegalArgumentException("Seat not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Booking booking = new Booking(user, seat, "PENDING_PAYMENT");
        booking = bookingRepository.save(booking);

        if (idempotencyKey != null) {
            idempotencyService.completeWithBooking(idempotencyKey, booking.getId());
        }

        return booking;
    }

    // PHASE 2: Attempt payment. On success, confirm the seat and booking.
    // On failure, release the seat back to AVAILABLE.
    @Transactional
    public Payment confirmPayment(Long bookingId, Long userId, double amount) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if (!booking.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("You are not authorized to pay for this booking");
        }

        if (!"PENDING_PAYMENT".equals(booking.getStatus())) {
            throw new IllegalArgumentException("This booking is not awaiting payment");
        }

        Long seatId = booking.getSeat().getId();

        try {
            PaymentService.PaymentResult result = paymentService.charge(bookingId, amount);

            Payment payment = new Payment(booking, amount, result.status(), result.providerReference());
            payment = paymentRepository.save(payment);

            if (result.success()) {
                seatRepository.confirmSeat(seatId);
                booking.setStatus("CONFIRMED");
            } else {
                seatRepository.releaseSeat(seatId);
                booking.setStatus("PAYMENT_FAILED");
            }
            bookingRepository.save(booking);

            return payment;

        } catch (RuntimeException e) {
            // Payment service itself was unreachable/unavailable — release the seat, don't leave it stuck HELD
            seatRepository.releaseSeat(seatId);
            booking.setStatus("PAYMENT_FAILED");
            bookingRepository.save(booking);
            throw new IllegalArgumentException("Payment could not be processed: " + e.getMessage());
        }
    }
}