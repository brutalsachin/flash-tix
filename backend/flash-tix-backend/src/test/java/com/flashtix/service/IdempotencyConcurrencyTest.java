package com.flashtix.service;

import com.flashtix.entity.Booking;
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
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
//@Transactional
public class IdempotencyConcurrencyTest {

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
    void concurrent_requests_with_same_idempotency_key_should_create_only_one_booking() throws InterruptedException {

        String uniqueSuffix = UUID.randomUUID().toString();

        // 1. Setup: one venue, one event, one seat, one user
        Venue venue = venueRepository.save(new Venue("Idempotency Test Venue", "Addr", "City", 500));

        User organizer = userRepository.save(
                new User("idempotency_organizer_" + uniqueSuffix + "@example.com", "Organizer",
                        passwordEncoder.encode("pass"), "ORGANIZER")
        );

        Event event = new Event(
                "desc", "Idempotency Test Event",
                LocalDateTime.now().plusDays(10),
                LocalDateTime.now().plusDays(9),
                100, "UPCOMING", "TEST"
        );
        event.setVenue(venue);
        event.setOrganizer(organizer);
        event = eventRepository.save(event);

        Seat seat = seatRepository.save(new Seat(event, "1", "GENERAL", "AVAILABLE"));
        Long seatId = seat.getId();

        User user = userRepository.save(
                new User("idempotency_user_" + uniqueSuffix + "@example.com", "Test User",
                        passwordEncoder.encode("pass"), "USER")
        );
        Long userId = user.getId();

        String idempotencyKey = "test-idempotency-key-" + uniqueSuffix;


        int requestCount = 100;
        ExecutorService executor = Executors.newFixedThreadPool(20);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(requestCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        ConcurrentLinkedQueue<Long> resultingBookingIds = new ConcurrentLinkedQueue<>();

        for (int i = 0; i < requestCount; i++) {
            executor.submit(() -> {
                try {
                    startGate.await();
                    Booking booking = bookingService.holdSeat(seatId, userId, idempotencyKey);
                    resultingBookingIds.add(booking.getId());
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startGate.countDown();
        doneLatch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        // 3. Assertions
        System.out.println("Successes: " + successCount.get() + ", Failures: " + failureCount.get());

        assertTrue(successCount.get() >= 1, "At least one request should succeed");

        Set<Long> distinctBookingIds = resultingBookingIds.stream().collect(Collectors.toSet());
        assertEquals(1, distinctBookingIds.size(),
                "All successful requests must resolve to exactly the same booking id");
    }
}