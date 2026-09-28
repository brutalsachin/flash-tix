package com.flashtix.service;

import com.flashtix.dto.SeatGenerationRequest;
import com.flashtix.entity.Event;
import com.flashtix.entity.Seat;
import com.flashtix.repository.EventRepository;
import com.flashtix.repository.SeatRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class SeatService {

    private final SeatRepository seatRepository;
    private final EventRepository eventRepository;

    public SeatService(SeatRepository seatRepository, EventRepository eventRepository) {
        this.seatRepository = seatRepository;
        this.eventRepository = eventRepository;
    }

    public List<Seat> generateSeats(Long eventId, SeatGenerationRequest request, Long organizerId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        if (!event.getOrganizer().getId().equals(organizerId)) {
            throw new IllegalArgumentException("You are not authorized to generate seats for this event");
        }

        List<Seat> existing = seatRepository.findByEventId(eventId);
        if (!existing.isEmpty()) {
            throw new IllegalArgumentException("Seats have already been generated for this event");
        }

        if (request.getNumberOfSeats() > event.getCapacity()) {
            throw new IllegalArgumentException(
                    "Cannot generate " + request.getNumberOfSeats() +
                            " seats; event capacity is " + event.getCapacity()
            );
        }

        List<Seat> seats = new ArrayList<>();
        for (int i = 1; i <= request.getNumberOfSeats(); i++) {
            seats.add(new Seat(event, String.valueOf(i), "GENERAL", "AVAILABLE"));
        }

        return seatRepository.saveAll(seats);
    }
}