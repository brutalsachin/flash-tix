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
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
public class BookingConcurrencyTest {

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
    void only_one_user_should_successfully_book_the_same_seat_under_concurrency() throws InterruptedException {

        Venue venue = venueRepository.save(new Venue("Concurrency Test Venue", "Addr", "City", 500));

        User organizer = userRepository.save(
                new User("concurrency_organizer@example.com", "Organizer", passwordEncoder.encode("pass"), "ORGANIZER")
        );

        Event event = new Event(
                "desc", "Concurrency Test Event",
                LocalDateTime.now().plusDays(10),
                LocalDateTime.now().plusDays(9),
                100, "UPCOMING", "TEST"
        );
        event.setVenue(venue);
        event.setOrganizer(organizer);
        event = eventRepository.save(event);

        Seat seat = seatRepository.save(new Seat(event, "1", "GENERAL", "AVAILABLE"));
        Long seatId = seat.getId();

        // 2. Create 200 competing users
        int userCount = 200;
        List<Long> userIds = new java.util.ArrayList<>();
        for (int i = 0; i < userCount; i++) {
            User u = userRepository.save(
                    new User("concurrent_user_" + i + "@example.com", "User " + i,
                            passwordEncoder.encode("pass"), "USER")
            );
            userIds.add(u.getId());
        }

        // 3. Fire all 200 at the same seat, simultaneously
        ExecutorService executor = Executors.newFixedThreadPool(50);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(userCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (Long userId : userIds) {
            executor.submit(() -> {
                try {
                    startGate.await(); // wait here until released
                    bookingService.bookSeat(seatId, userId);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startGate.countDown(); // release all threads at once
        doneLatch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        // 4. Assertions: exactly one success, rest failed
        assertEquals(1, successCount.get(), "Exactly one booking should succeed");
        assertEquals(userCount - 1, failureCount.get(), "All others should be rejected");

        Seat finalSeat = seatRepository.findById(seatId).orElseThrow();
        assertEquals("BOOKED", finalSeat.getStatus());
    }
}