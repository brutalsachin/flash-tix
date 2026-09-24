package com.flashtix.service;

import com.flashtix.dto.EventRequest;
import com.flashtix.entity.Event;
import com.flashtix.entity.User;
import com.flashtix.entity.Venue;
import com.flashtix.repository.EventRepository;
import com.flashtix.repository.UserRepository;
import com.flashtix.repository.VenueRepository;
import org.springframework.stereotype.Service;

import java.util.List;

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

        List<Event> existingEvents = eventRepository.findByVenueId(request.getVenueId());

        for (Event existing : existingEvents) {
            boolean overlaps = request.getStartDate().isBefore(existing.getEndDate())
                    && request.getEndDate().isAfter(existing.getStartDate());
            if (overlaps) {
                throw new IllegalArgumentException(
                        "Venue is already booked for another event during this time: " + existing.getName()
                );
            }
        }

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
    public Event updateEvent(Long eventId, EventRequest request, Long organizerId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new IllegalArgumentException("You are not authorized to update this event");
        }

        Venue venue = venueRepository.findById(request.getVenueId())
                .orElseThrow(() -> new IllegalArgumentException("Venue not found"));

        List<Event> existingEvents = eventRepository.findByVenueId(request.getVenueId());

        for (Event existing : existingEvents) {
            if (existing.getId().equals(eventId)) {
                continue;
            }
            boolean overlaps = request.getStartDate().isBefore(existing.getEndDate())
                    && request.getEndDate().isAfter(existing.getStartDate());
            if (overlaps) {
                throw new IllegalArgumentException(
                        "Venue is already booked for another event during this time: " + existing.getName()
                );
            }
        }

        if (request.getCapacity() > venue.getCapacity()) {
            throw new IllegalArgumentException(
                    "Event capacity (" + request.getCapacity() +
                            ") cannot exceed venue capacity (" + venue.getCapacity() + ")"
            );
        }

        event.setName(request.getName());
        event.setDescription(request.getDescription());
        event.setStartDate(request.getStartDate());
        event.setEndDate(request.getEndDate());
        event.setCapacity(request.getCapacity());
        event.setCategory(request.getCategory());
        event.setVenue(venue);

        return eventRepository.save(event);
    }
    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    public Event getEventById(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
    }
}