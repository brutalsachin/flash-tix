package com.flashtix.service;

import org.springframework.stereotype.Service;
import java.util.Random;

@Service
public class PaymentService {

    private final Random random = new Random();

    public PaymentResult charge(Long bookingId, double amount) {
        // Simulate different real-world outcomes, per the project's own spec:
        // success, failure, timeout, service unavailable
        double outcome = random.nextDouble();

        if (outcome < 0.7) {
            return new PaymentResult(true, "mock-ref-" + bookingId, "SUCCESS");
        } else if (outcome < 0.85) {
            return new PaymentResult(false, null, "FAILED");
        } else {
            throw new RuntimeException("Payment service temporarily unavailable");
        }
    }

    public record PaymentResult(boolean success, String providerReference, String status) {}
}