package com.flashtix.controller;

import com.flashtix.dto.EventRequest;
import com.flashtix.entity.Event;
import com.flashtix.service.EventService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public ResponseEntity<Event> createEvent(@Valid @RequestBody EventRequest request) {
        Long organizerId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Event event = eventService.createEvent(request, organizerId);
        return ResponseEntity.ok(event);
    }
}