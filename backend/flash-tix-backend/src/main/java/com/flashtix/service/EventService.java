package com.flashtix.service;

import com.flashtix.dto.EventRequest;
import com.flashtix.entity.Event;
import com.flashtix.entity.User;
import com.flashtix.entity.Venue;
import com.flashtix.repository.EventRepository;
import com.flashtix.repository.UserRepository;
import com.flashtix.repository.VenueRepository;
import org.springframework.stereotype.Service;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final VenueRepository venueRepository;
    private final UserRepository userRepository;

    public EventService(EventRepository eventRepository, VenueRepository venueRepository, UserRepository userRepository) {
        this.eventRepository = eventRepository;
        this.venueRepository = venueRepository;
        this.userRepository = userRepository;
    }

    public Event createEvent(EventRequest request, Long organizerId) {
        Venue venue = venueRepository.findById(request.getVenueId())
                .orElseThrow(() -> new IllegalArgumentException("Venue not found"));

        if (request.getCapacity() > venue.getCapacity()) {
            throw new IllegalArgumentException(
                    "Event capacity (" + request.getCapacity() +
                            ") cannot exceed venue capacity (" + venue.getCapacity() + ")"
            );
        }

        User organizer = userRepository.findById(organizerId)
                .orElseThrow(() -> new IllegalArgumentException("Organizer not found"));

        Event event = new Event(
                request.getDescription(),
                request.getName(),
                request.getEndDate(),
                request.getStartDate(),
                request.getCapacity(),
                "UPCOMING",
                request.getCategory()
        );
        event.setVenue(venue);
        event.setOrganizer(organizer);

        return eventRepository.save(event);
    }
}