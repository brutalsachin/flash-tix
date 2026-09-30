package com.flashtix.controller.seat;

import com.flashtix.config.SecurityConfig;
import com.flashtix.controller.SeatController;
import com.flashtix.dto.SeatGenerationRequest;
import com.flashtix.entity.Seat;
import com.flashtix.security.JwtUtil;
import com.flashtix.service.SeatService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** POST /api/v1/events/{eventId}/seats/generate */
@WebMvcTest(SeatController.class)
@Import({SecurityConfig.class, JwtUtil.class})
class GenerateSeatsEndpointTest {

    private static final String URL = "/api/v1/events/{eventId}/seats/generate";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtUtil jwtUtil;

    @MockitoBean private SeatService seatService;

    private String bearer(Long userId, String role) {
        return "Bearer " + jwtUtil.generateToken(userId, role);
    }

    private static Seat seat(long id, String number) {
        Seat seat = new Seat(null, number, "GENERAL", "AVAILABLE");
        ReflectionTestUtils.setField(seat, "id", id);
        return seat;
    }

    @Test
    void organizerCanGenerateSeats() throws Exception {
        when(seatService.generateSeats(eq(3L), any(SeatGenerationRequest.class), eq(5L)))
                .thenReturn(List.of(seat(1L, "1"), seat(2L, "2")));

        mockMvc.perform(post(URL, 3L).header("Authorization", bearer(5L, "ORGANIZER"))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"numberOfSeats":2}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].seatNumber").value("1"))
                .andExpect(jsonPath("$[0].status").value("AVAILABLE"));
    }

    @Test
    void regularUserIsForbidden() throws Exception {
        mockMvc.perform(post(URL, 3L).header("Authorization", bearer(5L, "USER"))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"numberOfSeats":2}
                                """))
                .andExpect(status().isForbidden());

        verify(seatService, never()).generateSeats(anyLong(), any(), anyLong());
    }

    @Test
    void zeroSeatsIsRejected() throws Exception {
        mockMvc.perform(post(URL, 3L).header("Authorization", bearer(5L, "ORGANIZER"))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"numberOfSeats":0}
                                """))
                .andExpect(status().isBadRequest());

        verify(seatService, never()).generateSeats(anyLong(), any(), anyLong());
    }

    @Test
    void missingNumberOfSeatsIsRejected() throws Exception {
        mockMvc.perform(post(URL, 3L).header("Authorization", bearer(5L, "ORGANIZER"))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void serviceErrorReturnsErrorMessage() throws Exception {
        when(seatService.generateSeats(eq(99L), any(SeatGenerationRequest.class), eq(5L)))
                .thenThrow(new IllegalArgumentException("Event not found"));

        mockMvc.perform(post(URL, 99L).header("Authorization", bearer(5L, "ORGANIZER"))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"numberOfSeats":2}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Event not found"));
    }
}
