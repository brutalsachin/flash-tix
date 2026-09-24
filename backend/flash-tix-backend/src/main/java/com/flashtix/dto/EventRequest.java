package com.flashtix.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public class EventRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String description;

    @NotNull
    @Future
    private LocalDateTime startDate;

    @NotNull
    @Future
    private LocalDateTime endDate;

    @NotNull
    @Min(1)
    private Integer capacity;

    @NotBlank
    private String category;

    @NotNull
    private Long venueId;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }

    public LocalDateTime getEndDate() { return endDate; }
    public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Long getVenueId() { return venueId; }
    public void setVenueId(Long venueId) { this.venueId = venueId; }
}