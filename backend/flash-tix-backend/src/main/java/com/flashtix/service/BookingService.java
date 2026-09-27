package com.flashtix.service;

import com.flashtix.entity.Booking;
import com.flashtix.entity.Seat;
import com.flashtix.entity.User;
import com.flashtix.repository.BookingRepository;
import com.flashtix.repository.SeatRepository;
import com.flashtix.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {

    private final SeatRepository seatRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;

    public BookingService(SeatRepository seatRepository, BookingRepository bookingRepository, UserRepository userRepository) {
        this.seatRepository = seatRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Booking bookSeat(Long seatId, Long userId) {
        int updatedRows = seatRepository.claimSeat(seatId);

        if (updatedRows == 0) {
            throw new IllegalArgumentException("Seat is no longer available");
        }

        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new IllegalArgumentException("Seat not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Booking booking = new Booking(user, seat, "CONFIRMED");
        return bookingRepository.save(booking);
    }
}