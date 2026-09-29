package com.flashtix.controller.venue;

import com.flashtix.config.SecurityConfig;
import com.flashtix.controller.VenueController;
import com.flashtix.dto.VenueRequest;
import com.flashtix.entity.Venue;
import com.flashtix.security.JwtUtil;
import com.flashtix.service.VenueService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** POST /api/v1/venues */
@WebMvcTest(VenueController.class)
@Import({SecurityConfig.class, JwtUtil.class})
class CreateVenueEndpointTest {

    private static final String URL = "/api/v1/venues";
    private static final String BODY = """
            {"name":"NSCI Dome","address":"Worli","city":"Mumbai","capacity":5000}
            """;

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtUtil jwtUtil;

    @MockitoBean private VenueService venueService;

    private String bearer(String role) {
        return "Bearer " + jwtUtil.generateToken(1L, role);
    }

    @Test
    void organizerCanCreateVenue() throws Exception {
        Venue venue = new Venue("NSCI Dome", "Worli", "Mumbai", 5000);
        ReflectionTestUtils.setField(venue, "id", 7L);
        when(venueService.createVenue(any(VenueRequest.class))).thenReturn(venue);

        mockMvc.perform(post(URL).header("Authorization", bearer("ORGANIZER"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.name").value("NSCI Dome"))
                .andExpect(jsonPath("$.address").value("Worli"))
                .andExpect(jsonPath("$.city").value("Mumbai"))
                .andExpect(jsonPath("$.capacity").value(5000));
    }

    @Test
    void regularUserIsForbidden() throws Exception {
        mockMvc.perform(post(URL).header("Authorization", bearer("USER"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden());

        verify(venueService, never()).createVenue(any());
    }

    @Test
    void missingTokenIsForbidden() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden());
    }

    @Test
    void zeroCapacityIsRejected() throws Exception {
        mockMvc.perform(post(URL).header("Authorization", bearer("ORGANIZER"))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"name":"NSCI Dome","address":"Worli","city":"Mumbai","capacity":0}
                                """))
                .andExpect(status().isBadRequest());

        verify(venueService, never()).createVenue(any());
    }

    @Test
    void blankCityIsRejected() throws Exception {
        mockMvc.perform(post(URL).header("Authorization", bearer("ORGANIZER"))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"name":"NSCI Dome","address":"Worli","city":"","capacity":10}
                                """))
                .andExpect(status().isBadRequest());
    }
}
