package com.flashtix.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedConstruction;
import org.mockito.Mockito;

import java.util.Random;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

class PaymentServiceTest {

    private PaymentService paymentService;
    private MockedConstruction<Random> mockedRandomConstruction;
    private Random mockRandom;

    @BeforeEach
    void setUp() {
        mockedRandomConstruction = Mockito.mockConstruction(Random.class, (mock, context) -> {
            mockRandom = mock;
        });
        paymentService = new PaymentService();
    }

    @AfterEach
    void tearDown() {
        mockedRandomConstruction.close();
    }

    @Test
    @DisplayName("Should return SUCCESS result when outcome is less than 0.7")
    void charge_ShouldReturnSuccess_WhenOutcomeLessThanPointSeven() {
        Long bookingId = 12345L;
        double amount = 99.99;
        when(mockRandom.nextDouble()).thenReturn(0.5);

        PaymentService.PaymentResult result = paymentService.charge(bookingId, amount);

        assertTrue(result.success(), "Payment should be successful");
        assertEquals("mock-ref-12345", result.providerReference(), "Provider reference format mismatch");
        assertEquals("SUCCESS", result.status(), "Status should be SUCCESS");
    }

    @Test
    @DisplayName("Should return FAILED result when outcome is between 0.7 and 0.85")
    void charge_ShouldReturnFailed_WhenOutcomeBetweenPointSevenAndPointEightFive() {
        Long bookingId = 54321L;
        double amount = 50.00;
        when(mockRandom.nextDouble()).thenReturn(0.8);

        PaymentService.PaymentResult result = paymentService.charge(bookingId, amount);

        assertFalse(result.success(), "Payment should fail");
        assertNull(result.providerReference(), "Provider reference should be null on failure");
        assertEquals("FAILED", result.status(), "Status should be FAILED");
    }

    @Test
    @DisplayName("Should throw RuntimeException when outcome is 0.85 or higher")
    void charge_ShouldThrowException_WhenOutcomeIsPointEightFiveOrHigher() {
        Long bookingId = 99999L;
        double amount = 150.00;
        when(mockRandom.nextDouble()).thenReturn(0.9);

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            paymentService.charge(bookingId, amount);
        });

        assertEquals("Payment service temporarily unavailable", exception.getMessage());
    }
}