package com.flashtix.service;

import com.flashtix.entity.Event;
import com.flashtix.entity.Seat;
import com.flashtix.entity.User;
import com.flashtix.repository.EventRepository;
import com.flashtix.repository.SeatRepository;
import com.flashtix.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
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
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void exactly_100_of_1000_users_should_successfully_book_when_only_100_seats_exist() throws InterruptedException {

        String uniqueSuffix = UUID.randomUUID().toString();

        User organizer = userRepository.save(
                new User("many_seats_organizer_" + uniqueSuffix + "@example.com", "Organizer",
                        passwordEncoder.encode("pass"), "ORGANIZER")
        );

        Event event = new Event(
                "desc", "Many Seats Test Event",
                LocalDateTime.now().plusDays(10),
                LocalDateTime.now().plusDays(9),
                100, "UPCOMING", "TEST"
        );
        event.setVenueName("Many Seats Test Venue");
        event.setAddress("Addr");
        event.setCity("City");
        event.setOrganizer(organizer);
        event = eventRepository.save(event);
        Event savedEvent = event;

        int seatCount = 100;
        List<Long> seatIds = new ArrayList<>();
        for (int i = 1; i <= seatCount; i++) {
            Seat seat = seatRepository.save(new Seat(savedEvent, String.valueOf(i), "GENERAL", "AVAILABLE"));
            seatIds.add(seat.getId());
        }

        int userCount = 1000;
        List<Long> userIds = new ArrayList<>();
        for (int i = 0; i < userCount; i++) {
            User u = userRepository.save(
                    new User("many_seats_user_" + uniqueSuffix + "_" + i + "@example.com", "User " + i,
                            passwordEncoder.encode("pass"), "USER")
            );
            userIds.add(u.getId());
        }

        ExecutorService executor = Executors.newFixedThreadPool(100);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(userCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < userCount; i++) {
            Long userId = userIds.get(i);
            Long targetSeatId = seatIds.get(i % seatCount);

            executor.submit(() -> {
                try {
                    startGate.await();
                    bookingService.holdSeat(targetSeatId, userId, null);
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

        assertEquals(seatCount, successCount.get(), "Exactly 100 bookings should succeed (one per seat)");
        assertEquals(userCount - seatCount, failureCount.get(), "The remaining 900 should be rejected");

        long heldSeats = seatRepository.findAll().stream()
                .filter(s -> s.getEvent().getId().equals(savedEvent.getId()))
                .filter(s -> "HELD".equals(s.getStatus()))
                .count();
        assertEquals(seatCount, heldSeats, "All 100 seats should end up HELD, none double-booked");
    }
}