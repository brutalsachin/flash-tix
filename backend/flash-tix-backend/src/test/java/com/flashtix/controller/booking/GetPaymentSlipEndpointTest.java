package com.flashtix.controller.booking;

import com.flashtix.config.SecurityConfig;
import com.flashtix.controller.BookingController;
import com.flashtix.dto.PaymentSlipResponse;
import com.flashtix.security.JwtUtil;
import com.flashtix.service.BookingService;
import com.flashtix.service.PaymentSlipService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /api/v1/bookings/{bookingId}/slip */
@WebMvcTest(BookingController.class)
@Import({SecurityConfig.class, JwtUtil.class})
class GetPaymentSlipEndpointTest {

    private static final String URL = "/api/v1/bookings/{bookingId}/slip";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtUtil jwtUtil;

    @MockitoBean private BookingService bookingService;
    @MockitoBean private PaymentSlipService paymentSlipService;

    private String bearer(Long userId) {
        return "Bearer " + jwtUtil.generateToken(userId, "USER");
    }

    @Test
    void returnsSlipForOwner() throws Exception {
        when(paymentSlipService.generateSlip(10L, 8L)).thenReturn(new PaymentSlipResponse(
                "RCPT-0001", 10L, "A1", "Rock Night", LocalDateTime.of(2026, 9, 29, 12, 0), "CONFIRMED"));

        mockMvc.perform(get(URL, 10L).header("Authorization", bearer(8L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.receiptNumber").value("RCPT-0001"))
                .andExpect(jsonPath("$.bookingId").value(10))
                .andExpect(jsonPath("$.seatNumber").value("A1"))
                .andExpect(jsonPath("$.eventName").value("Rock Night"))
                .andExpect(jsonPath("$.issuedAt").value("2026-09-29T12:00:00"))
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }

    @Test
    void missingTokenIsForbidden() throws Exception {
        mockMvc.perform(get(URL, 10L))
                .andExpect(status().isForbidden());

        verify(paymentSlipService, never()).generateSlip(anyLong(), anyLong());
    }

    @Test
    void otherUsersBookingReturnsErrorMessage() throws Exception {
        when(paymentSlipService.generateSlip(10L, 9L))
                .thenThrow(new IllegalArgumentException("Booking does not belong to this user"));

        mockMvc.perform(get(URL, 10L).header("Authorization", bearer(9L)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Booking does not belong to this user"));
    }
}
