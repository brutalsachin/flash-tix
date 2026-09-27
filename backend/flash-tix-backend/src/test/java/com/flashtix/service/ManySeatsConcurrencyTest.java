package com.flashtix.service;

import com.flashtix.entity.Event;
import com.flashtix.entity.Seat;
import com.flashtix.entity.User;
import com.flashtix.entity.Venue;
import com.flashtix.repository.EventRepository;
import com.flashtix.repository.SeatRepository;
import com.flashtix.repository.UserRepository;
import com.flashtix.repository.VenueRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
public class ManySeatsConcurrencyTest {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void exactly_100_of_1000_users_should_successfully_book_when_only_100_seats_exist() throws InterruptedException {

        // 1. Set up venue + event with 100-seat capacity
        Venue venue = venueRepository.save(new Venue("Many Seats Test Venue", "Addr", "City", 500));

        User organizer = userRepository.save(
                new User("many_seats_organizer@example.com", "Organizer", passwordEncoder.encode("pass"), "ORGANIZER")
        );

        Event event = new Event(
                "desc", "Many Seats Test Event",
                LocalDateTime.now().plusDays(10),
                LocalDateTime.now().plusDays(9),
                100, "UPCOMING", "TEST"
        );
        event.setVenue(venue);
        event.setOrganizer(organizer);
        event = eventRepository.save(event);
        event = eventRepository.save(event);
        Event savedEvent = event;


        int seatCount = 100;
        List<Long> seatIds = new ArrayList<>();
        for (int i = 1; i <= seatCount; i++) {
            Seat seat = seatRepository.save(new Seat(event, String.valueOf(i), "GENERAL", "AVAILABLE"));
            seatIds.add(seat.getId());
        }

        // 3. Create 1000 competing users
        int userCount = 1000;
        List<Long> userIds = new ArrayList<>();
        for (int i = 0; i < userCount; i++) {
            User u = userRepository.save(
                    new User("many_seats_user_" + i + "@example.com", "User " + i,
                            passwordEncoder.encode("pass"), "USER")
            );
            userIds.add(u.getId());
        }

        // 4. Each of the 1000 users tries to book a seat, cycling through the 100 seat ids
        //    so every seat gets contested by roughly 10 users simultaneously
        ExecutorService executor = Executors.newFixedThreadPool(100);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(userCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < userCount; i++) {
            Long userId = userIds.get(i);
            Long targetSeatId = seatIds.get(i % seatCount); // spreads 1000 users across 100 seats

            executor.submit(() -> {
                try {
                    startGate.await();
                    bookingService.bookSeat(targetSeatId, userId);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startGate.countDown();
        doneLatch.await(60, TimeUnit.SECONDS);
        executor.shutdown();

        // 5. Assertions: exactly 100 succeed (one per seat), 900 fail
        assertEquals(seatCount, successCount.get(), "Exactly 100 bookings should succeed (one per seat)");
        assertEquals(userCount - seatCount, failureCount.get(), "The remaining 900 should be rejected");

//        long bookedSeats = seatRepository.findAll().stream()
//                .filter(s -> s.getEvent().getId().equals(event.getId()))
//                .filter(s -> "BOOKED".equals(s.getStatus()))
//                .count();
        long bookedSeats = seatRepository.findAll().stream()
                .filter(s -> s.getEvent().getId().equals(savedEvent.getId()))
                .filter(s -> "BOOKED".equals(s.getStatus()))
                .count();
        assertEquals(seatCount, bookedSeats, "All 100 seats should end up BOOKED, none double-booked");
    }
}