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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** PUT /api/v1/events/{id} */
@WebMvcTest(EventController.class)
@Import({SecurityConfig.class, JwtUtil.class})
class UpdateEventEndpointTest {

    private static final String URL = "/api/v1/events/{id}";
    private static final String BODY = """
            {"name":"Rock Night 2","description":"Updated description",
             "startDate":"2099-12-02T18:00:00","endDate":"2099-12-02T23:00:00",
             "capacity":800,"category":"MUSIC","venueId":1}
            """;

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtUtil jwtUtil;

    @MockitoBean private EventService eventService;

    private String bearer(Long userId, String role) {
        return "Bearer " + jwtUtil.generateToken(userId, role);
    }

    private static Event updatedEvent() {
        Event event = new Event("Updated description", "Rock Night 2",
                LocalDateTime.of(2099, 12, 2, 23, 0), LocalDateTime.of(2099, 12, 2, 18, 0),
                800, "UPCOMING", "MUSIC");
        event.setOrganizer(new User("org@example.com", "Rishabh", "pw", "ORGANIZER"));
        event.setVenue(new Venue("NSCI Dome", "Worli", "Mumbai", 5000));
        ReflectionTestUtils.setField(event, "id", 3L);
        return event;
    }

    @Test
    void organizerCanUpdateEvent() throws Exception {
        when(eventService.updateEvent(eq(3L), any(EventRequest.class), eq(5L))).thenReturn(updatedEvent());

        mockMvc.perform(put(URL, 3L).header("Authorization", bearer(5L, "ORGANIZER"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.name").value("Rock Night 2"))
                .andExpect(jsonPath("$.capacity").value(800));
    }

    @Test
    void regularUserIsForbidden() throws Exception {
        mockMvc.perform(put(URL, 3L).header("Authorization", bearer(5L, "USER"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden());

        verify(eventService, never()).updateEvent(anyLong(), any(), anyLong());
    }

    @Test
    void partialBodyIsRejected() throws Exception {
        mockMvc.perform(put(URL, 3L).header("Authorization", bearer(5L, "ORGANIZER"))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"name":"Only the name"}
                                """))
                .andExpect(status().isBadRequest());

        verify(eventService, never()).updateEvent(anyLong(), any(), anyLong());
    }

    @Test
    void otherOrganizersEventReturnsErrorMessage() throws Exception {
        when(eventService.updateEvent(eq(3L), any(EventRequest.class), eq(9L)))
                .thenThrow(new IllegalArgumentException("You can only update your own events"));

        mockMvc.perform(put(URL, 3L).header("Authorization", bearer(9L, "ORGANIZER"))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("You can only update your own events"));
    }
}
