package com.flashtix.controller;

import com.flashtix.dto.VenueRequest;
import com.flashtix.entity.Venue;
import com.flashtix.service.VenueService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/venues")
public class VenueController {

    private final VenueService venueService;

    public VenueController(VenueService venueService) {
        this.venueService = venueService;
    }

    @PostMapping
    public ResponseEntity<Venue> createVenue(@Valid @RequestBody VenueRequest request) {
        Venue venue = venueService.createVenue(request);
        return ResponseEntity.ok(venue);
    }
}