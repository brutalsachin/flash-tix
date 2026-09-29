package com.flashtix.controller.booking;

import com.flashtix.config.SecurityConfig;
import com.flashtix.controller.BookingController;
import com.flashtix.entity.Booking;
import com.flashtix.entity.Seat;
import com.flashtix.entity.User;
import com.flashtix.security.JwtUtil;
import com.flashtix.service.BookingService;
import com.flashtix.service.PaymentSlipService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** POST /api/v1/bookings/hold/{seatId} */
@WebMvcTest(BookingController.class)
@Import({SecurityConfig.class, JwtUtil.class})
class HoldSeatEndpointTest {

    private static final String URL = "/api/v1/bookings/hold/{seatId}";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtUtil jwtUtil;

    @MockitoBean private BookingService bookingService;
    @MockitoBean private PaymentSlipService paymentSlipService;

    private String bearer(Long userId) {
        return "Bearer " + jwtUtil.generateToken(userId, "USER");
    }

    private static Booking pendingBooking() {
        Seat seat = new Seat(null, "A1", "GENERAL", "HELD");
        Booking booking = new Booking(new User("buyer@example.com", "Buyer", "pw", "USER"), seat, "PENDING_PAYMENT");
        ReflectionTestUtils.setField(booking, "id", 10L);
        return booking;
    }

    @Test
    void holdsSeatForLoggedInUser() throws Exception {
        when(bookingService.holdSeat(eq(4L), eq(8L), isNull())).thenReturn(pendingBooking());

        mockMvc.perform(post(URL, 4L).header("Authorization", bearer(8L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.seatNumber").value("A1"))
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"));
    }

    @Test
    void passesIdempotencyKeyToService() throws Exception {
        when(bookingService.holdSeat(4L, 8L, "key-123")).thenReturn(pendingBooking());

        mockMvc.perform(post(URL, 4L).header("Authorization", bearer(8L))
                        .header("Idempotency-Key", "key-123"))
                .andExpect(status().isOk());

        verify(bookingService).holdSeat(4L, 8L, "key-123");
    }

    @Test
    void missingTokenIsForbidden() throws Exception {
        mockMvc.perform(post(URL, 4L))
                .andExpect(status().isForbidden());

        verify(bookingService, never()).holdSeat(anyLong(), anyLong(), any());
    }

    @Test
    void seatAlreadyTakenReturnsErrorMessage() throws Exception {
        when(bookingService.holdSeat(eq(4L), eq(8L), any()))
                .thenThrow(new IllegalArgumentException("Seat is not available"));

        mockMvc.perform(post(URL, 4L).header("Authorization", bearer(8L)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Seat is not available"));
    }
}
