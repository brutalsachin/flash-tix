package com.flashtix.service;

import com.flashtix.dto.EventRequest;
import com.flashtix.entity.Event;
import com.flashtix.entity.User;
import com.flashtix.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class EventServiceTest {

    @Autowired private EventService eventService;
    @Autowired private UserRepository userRepository;

    private Long organizerId;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString();
        User organizer = userRepository.save(
                new User("organizer_" + suffix + "@test.com", "Organizer", "pw", "ORGANIZER")
        );
        organizerId = organizer.getId();
    }

    private EventRequest requestFor(String venueName, String address, String city,
                                    LocalDateTime start, LocalDateTime end) {
        EventRequest request = new EventRequest();
        request.setName("Test Event");
        request.setDescription("desc");
        request.setStartDate(start);
        request.setEndDate(end);
        request.setCapacity(100);
        request.setCategory("MUSIC");
        request.setVenueName(venueName);
        request.setAddress(address);
        request.setCity(city);
        return request;
    }

    @Test
    void createEvent_savesVenueFieldsDirectlyOnEvent() {
        EventRequest request = requestFor("City Hall", "1 Main St", "Kanpur",
                LocalDateTime.now().plusDays(10), LocalDateTime.now().plusDays(10).plusHours(3));

        Event event = eventService.createEvent(request, organizerId);

        assertThat(event.getId()).isNotNull();
        assertThat(event.getVenueName()).isEqualTo("City Hall");
        assertThat(event.getAddress()).isEqualTo("1 Main St");
        assertThat(event.getCity()).isEqualTo("Kanpur");
    }

    @Test
    void createEvent_rejectsOverlappingTimeAtSameVenue() {
        LocalDateTime start = LocalDateTime.now().plusDays(10);
        LocalDateTime end = start.plusHours(3);

        eventService.createEvent(requestFor("City Hall", "1 Main St", "Kanpur", start, end), organizerId);

        EventRequest overlapping = requestFor("City Hall", "1 Main St", "Kanpur",
                start.plusHours(1), end.plusHours(1));

        assertThatThrownBy(() -> eventService.createEvent(overlapping, organizerId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already booked");
    }

    @Test
    void createEvent_allowsNonOverlappingTimeAtSameVenue() {
        LocalDateTime start = LocalDateTime.now().plusDays(10);
        LocalDateTime end = start.plusHours(3);

        eventService.createEvent(requestFor("City Hall", "1 Main St", "Kanpur", start, end), organizerId);

        EventRequest laterSameDay = requestFor("City Hall", "1 Main St", "Kanpur",
                end.plusHours(1), end.plusHours(4));

        Event second = eventService.createEvent(laterSameDay, organizerId);

        assertThat(second.getId()).isNotNull();
    }

    @Test
    void createEvent_allowsSameTimeAtDifferentVenue() {
        LocalDateTime start = LocalDateTime.now().plusDays(10);
        LocalDateTime end = start.plusHours(3);

        eventService.createEvent(requestFor("City Hall", "1 Main St", "Kanpur", start, end), organizerId);

        EventRequest sameTimeOtherVenue = requestFor("Grand Arena", "2 Other St", "Delhi", start, end);

        Event second = eventService.createEvent(sameTimeOtherVenue, organizerId);

        assertThat(second.getId()).isNotNull();
    }

    @Test
    void updateEvent_excludesItselfFromOverlapCheck() {
        LocalDateTime start = LocalDateTime.now().plusDays(10);
        LocalDateTime end = start.plusHours(3);

        Event event = eventService.createEvent(
                requestFor("City Hall", "1 Main St", "Kanpur", start, end), organizerId);

        // updating with the exact same venue/time should not conflict with itself
        Event updated = eventService.updateEvent(event.getId(),
                requestFor("City Hall", "1 Main St", "Kanpur", start, end), organizerId);

        assertThat(updated.getId()).isEqualTo(event.getId());
    }
}