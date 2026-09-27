package com.flashtix.controller;

import com.flashtix.dto.BookingResponse;
import com.flashtix.entity.Booking;
import com.flashtix.service.BookingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping("/{seatId}")
    public ResponseEntity<BookingResponse> bookSeat(@PathVariable Long seatId) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Booking booking = bookingService.bookSeat(seatId, userId);

        BookingResponse response = new BookingResponse(
                booking.getId(), booking.getSeat().getSeatNumber(), booking.getStatus()
        );
        return ResponseEntity.ok(response);
    }
}