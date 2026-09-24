package com.flashtix.service;

import com.flashtix.dto.VenueRequest;
import com.flashtix.entity.Venue;
import com.flashtix.repository.VenueRepository;
import org.springframework.stereotype.Service;

@Service
public class VenueService {

    private final VenueRepository venueRepository;

    public VenueService(VenueRepository venueRepository) {
        this.venueRepository = venueRepository;
    }

    public Venue createVenue(VenueRequest request) {
        Venue venue = new Venue(
                request.getName(),
                request.getAddress(),
                request.getCity(),
                request.getCapacity()
        );
        return venueRepository.save(venue);
    }
}