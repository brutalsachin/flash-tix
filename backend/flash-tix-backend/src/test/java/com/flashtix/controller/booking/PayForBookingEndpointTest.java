package com.flashtix.controller.booking;

import com.flashtix.config.SecurityConfig;
import com.flashtix.controller.BookingController;
import com.flashtix.entity.Payment;
import com.flashtix.security.JwtUtil;
import com.flashtix.service.BookingService;
import com.flashtix.service.PaymentSlipService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** POST /api/v1/bookings/{bookingId}/pay?amount=... */
@WebMvcTest(BookingController.class)
@Import({SecurityConfig.class, JwtUtil.class})
class PayForBookingEndpointTest {

    private static final String URL = "/api/v1/bookings/{bookingId}/pay";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtUtil jwtUtil;

    @MockitoBean private BookingService bookingService;
    @MockitoBean private PaymentSlipService paymentSlipService;

    private String bearer(Long userId) {
        return "Bearer " + jwtUtil.generateToken(userId, "USER");
    }

    @Test
    void paysAndReturnsPlainTextStatus() throws Exception {
        when(bookingService.confirmPayment(10L, 8L, 499.0))
                .thenReturn(new Payment(null, 499.0, "SUCCESS", "MOCK-REF-1"));

        mockMvc.perform(post(URL, 10L).param("amount", "499.0").header("Authorization", bearer(8L)))
                .andExpect(status().isOk())
                .andExpect(content().string("Payment SUCCESS (ref: MOCK-REF-1)"));
    }

    @Test
    void missingAmountIsRejected() throws Exception {
        mockMvc.perform(post(URL, 10L).header("Authorization", bearer(8L)))
                .andExpect(status().isBadRequest());

        verify(bookingService, never()).confirmPayment(anyLong(), anyLong(), anyDouble());
    }

    @Test
    void missingTokenIsForbidden() throws Exception {
        mockMvc.perform(post(URL, 10L).param("amount", "499.0"))
                .andExpect(status().isForbidden());

        verify(bookingService, never()).confirmPayment(anyLong(), anyLong(), anyDouble());
    }

    @Test
    void serviceErrorReturnsErrorMessage() throws Exception {
        when(bookingService.confirmPayment(10L, 8L, 499.0))
                .thenThrow(new IllegalArgumentException("Booking is not awaiting payment"));

        mockMvc.perform(post(URL, 10L).param("amount", "499.0").header("Authorization", bearer(8L)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Booking is not awaiting payment"));
    }
}
