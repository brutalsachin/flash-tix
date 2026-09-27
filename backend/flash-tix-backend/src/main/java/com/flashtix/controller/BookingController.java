package com.flashtix.controller;

import com.flashtix.dto.BookingResponse;
import com.flashtix.dto.PaymentSlipResponse;
import com.flashtix.entity.Booking;
import com.flashtix.entity.Payment;
import com.flashtix.service.BookingService;
import com.flashtix.service.PaymentSlipService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/bookings")
public class BookingController {

    private final BookingService bookingService;
    private final PaymentSlipService paymentSlipService;

    public BookingController(BookingService bookingService, PaymentSlipService paymentSlipService) {
        this.bookingService = bookingService;
        this.paymentSlipService = paymentSlipService;
    }

    @PostMapping("/hold/{seatId}")
    public ResponseEntity<BookingResponse> holdSeat(
            @PathVariable Long seatId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Booking booking = bookingService.holdSeat(seatId, userId, idempotencyKey);

        BookingResponse response = new BookingResponse(
                booking.getId(), booking.getSeat().getSeatNumber(), booking.getStatus()
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{bookingId}/pay")
    public ResponseEntity<String> payForBooking(
            @PathVariable Long bookingId,
            @RequestParam double amount) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Payment payment = bookingService.confirmPayment(bookingId, userId, amount);
        return ResponseEntity.ok("Payment " + payment.getStatus() + " (ref: " + payment.getProviderReference() + ")");
    }

    @GetMapping("/{bookingId}/slip")
    public ResponseEntity<PaymentSlipResponse> getPaymentSlip(@PathVariable Long bookingId) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        PaymentSlipResponse slip = paymentSlipService.generateSlip(bookingId, userId);
        return ResponseEntity.ok(slip);
    }
}