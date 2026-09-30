package com.flashtix.controller.event;

import com.flashtix.config.SecurityConfig;
import com.flashtix.controller.EventController;
import com.flashtix.dto.EventRequest;
import com.flashtix.entity.Event;
import com.flashtix.entity.User;
import com.flashtix.entity.Venue;
import com.flashtix.security.JwtUtil;
import com.flashtix.service.EventService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** POST /api/v1/events */
@WebMvcTest(EventController.class)
@Import({SecurityConfig.class, JwtUtil.class})
class CreateEventEndpointTest {

    private static final String URL = "/api/v1/events";
    private static final String BODY = """
            {"name":"Rock Night","description":"Live rock concert",
             "startDate":"2099-12-01T18:00:00","endDate":"2099-12-01T23:00:00",
             "capacity":500,"category":"MUSIC","venueId":1}
            """;

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtUtil jwtUtil;

    @MockitoBean private EventService eventService;

    private String bearer(Long userId, String role) {
        return "Bearer " + jwtUtil.generateToken(userId, role);
    }

    private static Event sampleEvent() {
        User organizer = new User("org@example.com", "Rishabh", "pw", "ORGANIZER");
        Event event = new Event("Live rock concert", "Rock Night",
                LocalDateTime.of(2099, 12, 1, 23, 0), LocalDateTime.of(2099, 12, 1, 18, 0),
                500, "UPCOMING", "MUSIC");
        event.setOrganizer(organizer);
        event.setVenue(new Venue("NSCI Dome", "Worli", "Mumbai", 5000));
        ReflectionTestUtils.setField(event, "id", 3L);
        return event;
    }

    @Test
    void organizerCanCreateEvent() throws Exception {
        when(eventService.createEvent(any(EventRequest.class), eq(5L))).thenReturn(sampleEvent());

        mockMvc.perform(post(URL).header("Authorization", bearer(5L, "ORGANIZER"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.name").value("Rock Night"))
                .andExpect(jsonPath("$.startDate").value("2099-12-01T18:00:00"))
                .andExpect(jsonPath("$.status").value("UPCOMING"))
                .andExpect(jsonPath("$.organizerName").value("Rishabh"))
                .andExpect(jsonPath("$.venueName").value("NSCI Dome"));
    }

    @Test
    void regularUserIsForbidden() throws Exception {
        mockMvc.perform(post(URL).header("Authorization", bearer(5L, "USER"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden());

        verify(eventService, never()).createEvent(any(), anyLong());
    }

    @Test
    void pastStartDateIsRejected() throws Exception {
        mockMvc.perform(post(URL).header("Authorization", bearer(5L, "ORGANIZER"))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"name":"Rock Night","description":"Live rock concert",
                                 "startDate":"2000-01-01T18:00:00","endDate":"2099-12-01T23:00:00",
                                 "capacity":500,"category":"MUSIC","venueId":1}
                                """))
                .andExpect(status().isBadRequest());

        verify(eventService, never()).createEvent(any(), anyLong());
    }

    @Test
    void missingVenueIdIsRejected() throws Exception {
        mockMvc.perform(post(URL).header("Authorization", bearer(5L, "ORGANIZER"))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"name":"Rock Night","description":"Live rock concert",
                                 "startDate":"2099-12-01T18:00:00","endDate":"2099-12-01T23:00:00",
                                 "capacity":500,"category":"MUSIC"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unknownVenueReturnsErrorMessage() throws Exception {
        when(eventService.createEvent(any(EventRequest.class), anyLong()))
                .thenThrow(new IllegalArgumentException("Venue not found"));

        mockMvc.perform(post(URL).header("Authorization", bearer(5L, "ORGANIZER"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Venue not found"));
    }
}
