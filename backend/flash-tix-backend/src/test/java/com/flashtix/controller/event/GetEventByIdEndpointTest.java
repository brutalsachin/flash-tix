package com.flashtix.controller.event;

import com.flashtix.config.SecurityConfig;
import com.flashtix.controller.EventController;
import com.flashtix.entity.Event;
import com.flashtix.entity.User;
import com.flashtix.entity.Venue;
import com.flashtix.security.JwtUtil;
import com.flashtix.service.EventService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /api/v1/events/{id} */
@WebMvcTest(EventController.class)
@Import({SecurityConfig.class, JwtUtil.class})
class GetEventByIdEndpointTest {

    private static final String URL = "/api/v1/events/{id}";

    @Autowired private MockMvc mockMvc;

    @MockitoBean private EventService eventService;

    @Test
    void returnsEventWithoutToken() throws Exception {
        Event event = new Event("Live rock concert", "Rock Night", LocalDateTime.of(2099, 12, 1, 23, 0),
                LocalDateTime.of(2099, 12, 1, 18, 0), 500, "UPCOMING", "MUSIC");
        event.setOrganizer(new User("org@example.com", "Rishabh", "pw", "ORGANIZER"));
        event.setVenue(new Venue("NSCI Dome", "Worli", "Mumbai", 5000));
        ReflectionTestUtils.setField(event, "id", 3L);
        when(eventService.getEventById(3L)).thenReturn(event);

        mockMvc.perform(get(URL, 3L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.name").value("Rock Night"))
                .andExpect(jsonPath("$.description").value("Live rock concert"))
                .andExpect(jsonPath("$.endDate").value("2099-12-01T23:00:00"))
                .andExpect(jsonPath("$.category").value("MUSIC"))
                .andExpect(jsonPath("$.organizerName").value("Rishabh"))
                .andExpect(jsonPath("$.venueName").value("NSCI Dome"));
    }

    @Test
    void unknownIdReturnsErrorMessage() throws Exception {
        when(eventService.getEventById(99L)).thenThrow(new IllegalArgumentException("Event not found"));

        mockMvc.perform(get(URL, 99L))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Event not found"));
    }
}
