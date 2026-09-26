package com.flashtix.controller;

import com.flashtix.dto.SeatGenerationRequest;
import com.flashtix.dto.SeatResponse;
import com.flashtix.entity.Seat;
import com.flashtix.service.SeatService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/events/{eventId}/seats")
public class SeatController {

    private final SeatService seatService;

    public SeatController(SeatService seatService) {
        this.seatService = seatService;
    }

    @PostMapping("/generate")
    public ResponseEntity<List<SeatResponse>> generateSeats(
            @PathVariable Long eventId,
            @Valid @RequestBody SeatGenerationRequest request) {
        Long organizerId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        List<Seat> seats = seatService.generateSeats(eventId, request, organizerId);

        List<SeatResponse> response = seats.stream()
                .map(seat -> new SeatResponse(seat.getId(), seat.getSeatNumber(), seat.getStatus()))
                .toList();

        return ResponseEntity.ok(response);
    }
}