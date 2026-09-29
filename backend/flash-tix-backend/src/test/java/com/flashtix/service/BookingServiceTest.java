package com.flashtix.service;

import com.flashtix.entity.*;
import com.flashtix.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@SpringBootTest
class BookingServiceTest {

    @Autowired private BookingService bookingService;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private SeatRepository seatRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private UserRepository userRepository;

    @MockitoBean private PaymentService paymentService;

    private User buyer;
    private User otherBuyer;
    private Seat seat;

    @BeforeEach
    void setUp() {
        String s = UUID.randomUUID().toString();
        User organizer = userRepository.save(new User("org_" + s + "@t.com", "Org", "pw", "ORGANIZER"));
        buyer = userRepository.save(new User("buyer_" + s + "@t.com", "Buyer", "pw", "USER"));
        otherBuyer = userRepository.save(new User("other_" + s + "@t.com", "Other", "pw", "USER"));

        Event event = new Event("desc", "Concert", LocalDateTime.now().plusDays(10),
                LocalDateTime.now().plusDays(9), 100, "UPCOMING", "TEST");
        event.setVenueName("Test Arena");
        event.setAddress("Addr");
        event.setCity("City");
        event.setOrganizer(organizer);
        event = eventRepository.save(event);

        seat = seatRepository.save(new Seat(event, "1", "GENERAL", "AVAILABLE"));
    }

    @Test
    void holdingAvailableSeatCreatesPendingBooking() {
        Booking b = bookingService.holdSeat(seat.getId(), buyer.getId(), null);

        assertThat(b.getStatus()).isEqualTo("PENDING_PAYMENT");
        assertThat(seatRepository.findById(seat.getId()).orElseThrow().getStatus()).isEqualTo("HELD");
    }

    @Test
    void secondUserCannotHoldAlreadyHeldSeat() {
        bookingService.holdSeat(seat.getId(), buyer.getId(), null);

        assertThatThrownBy(() -> bookingService.holdSeat(seat.getId(), otherBuyer.getId(), null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no longer available");
    }

    @Test
    void nonExistentSeatIsRejected() {
        assertThatThrownBy(() -> bookingService.holdSeat(-1L, buyer.getId(), null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void successfulPaymentConfirmsBookingAndBooksSeat() {
        when(paymentService.charge(anyLong(), anyDouble()))
                .thenReturn(new PaymentService.PaymentResult(true, "ref-1", "SUCCESS"));
        Booking b = bookingService.holdSeat(seat.getId(), buyer.getId(), null);

        bookingService.confirmPayment(b.getId(), buyer.getId(), 500);

        assertThat(bookingRepository.findById(b.getId()).orElseThrow().getStatus()).isEqualTo("CONFIRMED");
        assertThat(seatRepository.findById(seat.getId()).orElseThrow().getStatus()).isEqualTo("BOOKED");
    }

    @Test
    void failedPaymentReleasesSeat() {
        when(paymentService.charge(anyLong(), anyDouble()))
                .thenReturn(new PaymentService.PaymentResult(false, null, "FAILED"));
        Booking b = bookingService.holdSeat(seat.getId(), buyer.getId(), null);

        bookingService.confirmPayment(b.getId(), buyer.getId(), 500);

        assertThat(bookingRepository.findById(b.getId()).orElseThrow().getStatus()).isEqualTo("PAYMENT_FAILED");
        assertThat(seatRepository.findById(seat.getId()).orElseThrow().getStatus()).isEqualTo("AVAILABLE");
    }

    @Test
    void cannotPayForSomeoneElsesBooking() {
        Booking b = bookingService.holdSeat(seat.getId(), buyer.getId(), null);

        assertThatThrownBy(() -> bookingService.confirmPayment(b.getId(), otherBuyer.getId(), 500))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not authorized");
    }

    @Test
    void cannotPayTwiceForSameBooking() {
        when(paymentService.charge(anyLong(), anyDouble()))
                .thenReturn(new PaymentService.PaymentResult(true, "ref-1", "SUCCESS"));
        Booking b = bookingService.holdSeat(seat.getId(), buyer.getId(), null);
        bookingService.confirmPayment(b.getId(), buyer.getId(), 500);

        assertThatThrownBy(() -> bookingService.confirmPayment(b.getId(), buyer.getId(), 500))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not awaiting payment");
    }
}