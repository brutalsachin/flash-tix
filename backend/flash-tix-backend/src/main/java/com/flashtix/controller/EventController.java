package com.flashtix.controller;

import com.flashtix.dto.EventRequest;
import com.flashtix.dto.EventResponse;
import com.flashtix.entity.Event;
import com.flashtix.service.EventService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public ResponseEntity<EventResponse> createEvent(@Valid @RequestBody EventRequest request) {
        Long organizerId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Event event = eventService.createEvent(request, organizerId);
        return ResponseEntity.ok(toResponse(event));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventResponse> updateEvent(@PathVariable Long id, @Valid @RequestBody EventRequest request) {
        Long organizerId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Event event = eventService.updateEvent(id, request, organizerId);
        return ResponseEntity.ok(toResponse(event));
    }

    @GetMapping
    public ResponseEntity<List<EventResponse>> getAllEvents() {
        List<EventResponse> response = eventService.getAllEvents().stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getEventById(@PathVariable Long id) {
        Event event = eventService.getEventById(id);
        return ResponseEntity.ok(toResponse(event));
    }

    private EventResponse toResponse(Event event) {
        return new EventResponse(
                event.getId(),
                event.getName(),
                event.getDescription(),
                event.getStartDate(),
                event.getEndDate(),
                event.getCapacity(),
                event.getStatus(),
                event.getCategory(),
                event.getOrganizer().getName(),
                event.getVenueName(),
                event.getAddress(),
                event.getCity()
        );
    }
}