package com.flashtix.service;

import com.flashtix.entity.Booking;
import com.flashtix.entity.IdempotencyRecord;
import com.flashtix.entity.Seat;
import com.flashtix.entity.User;
import com.flashtix.repository.BookingRepository;
import com.flashtix.repository.IdempotencyRecordRepository;
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

    public BookingService(SeatRepository seatRepository, BookingRepository bookingRepository, UserRepository userRepository, IdempotencyRecordRepository idempotencyRecordRepository, IdempotencyService idempotencyService) {
        this.seatRepository = seatRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.idempotencyRecordRepository = idempotencyRecordRepository;
        this.idempotencyService = idempotencyService;
        }

    @Transactional
    public Booking bookSeat(Long seatId, Long userId, String idempotencyKey) {

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
                // Someone else grabbed it in the split-second between our check and our reserve attempt
                throw new IllegalArgumentException("Duplicate request already in progress, please retry shortly");
            }
        }

        int updatedRows = seatRepository.claimSeat(seatId);
        if (updatedRows == 0) {
            throw new IllegalArgumentException("Seat is no longer available");
        }

        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new IllegalArgumentException("Seat not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Booking booking = new Booking(user, seat, "CONFIRMED");
        booking = bookingRepository.save(booking);

        if (idempotencyKey != null) {
            idempotencyService.completeWithBooking(idempotencyKey, booking.getId());
        }

        return booking;
    }
}