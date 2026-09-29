package com.flashtix.repository;

import com.flashtix.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByStatusAndCreatedAtBefore(String status, LocalDateTime cutoff);
}