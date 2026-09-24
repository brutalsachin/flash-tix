package com.flashtix.dto;

import java.time.LocalDateTime;

public class EventResponse {
    private final Long id;
    private final String name;
    private final String description;
    private final LocalDateTime startDate;
    private final LocalDateTime endDate;
    private final Integer capacity;
    private final String status;
    private final String category;
    private final String organizerName;
    private final String venueName;

    public EventResponse(Long id, String name, String description, LocalDateTime startDate,
                         LocalDateTime endDate, Integer capacity, String status, String category,
                         String organizerName, String venueName) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
        this.capacity = capacity;
        this.status = status;
        this.category = category;
        this.organizerName = organizerName;
        this.venueName = venueName;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public LocalDateTime getStartDate() { return startDate; }
    public LocalDateTime getEndDate() { return endDate; }
    public Integer getCapacity() { return capacity; }
    public String getStatus() { return status; }
    public String getCategory() { return category; }
    public String getOrganizerName() { return organizerName; }
    public String getVenueName() { return venueName; }
}