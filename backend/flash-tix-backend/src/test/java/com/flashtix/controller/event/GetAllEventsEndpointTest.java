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
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /api/v1/events */
@WebMvcTest(EventController.class)
@Import({SecurityConfig.class, JwtUtil.class})
class GetAllEventsEndpointTest {

    private static final String URL = "/api/v1/events";

    @Autowired private MockMvc mockMvc;

    @MockitoBean private EventService eventService;

    private static Event event(String name) {
        Event event = new Event("desc", name, LocalDateTime.of(2099, 1, 1, 22, 0),
                LocalDateTime.of(2099, 1, 1, 18, 0), 100, "UPCOMING", "MUSIC");
        event.setOrganizer(new User("org@example.com", "Rishabh", "pw", "ORGANIZER"));
        event.setVenue(new Venue("NSCI Dome", "Worli", "Mumbai", 5000));
        return event;
    }

    @Test
    void listsEventsWithoutToken() throws Exception {
        when(eventService.getAllEvents()).thenReturn(List.of(event("Rock Night"), event("Jazz Evening")));

        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Rock Night"))
                .andExpect(jsonPath("$[1].name").value("Jazz Evening"))
                .andExpect(jsonPath("$[0].venueName").value("NSCI Dome"));
    }

    @Test
    void returnsEmptyListWhenNoEvents() throws Exception {
        when(eventService.getAllEvents()).thenReturn(List.of());

        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
