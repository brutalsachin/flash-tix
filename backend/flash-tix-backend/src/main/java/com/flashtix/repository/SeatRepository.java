package com.flashtix.repository;

import com.flashtix.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SeatRepository extends JpaRepository<Seat,Long> {
    List<Seat> findByEventId(Long eventId);
    @Modifying
    @Query("UPDATE Seat s SET s.status = 'BOOKED' WHERE s.id = :seatId AND s.status = 'AVAILABLE'")
    int claimSeat(@Param("seatId") Long seatId);
    @Modifying
    @Query("UPDATE Seat s SET s.status = 'HELD' WHERE s.id = :seatId AND s.status = 'AVAILABLE'")
    int holdSeat(@Param("seatId") Long seatId);

    @Modifying
    @Query("UPDATE Seat s SET s.status = 'BOOKED' WHERE s.id = :seatId AND s.status = 'HELD'")
    int confirmSeat(@Param("seatId") Long seatId);

    @Modifying
    @Query("UPDATE Seat s SET s.status = 'AVAILABLE' WHERE s.id = :seatId AND s.status = 'HELD'")
    int releaseSeat(@Param("seatId") Long seatId);
}
