package com.flashtix.service;

import com.flashtix.entity.IdempotencyRecord;
import com.flashtix.repository.IdempotencyRecordRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdempotencyService {

    private final IdempotencyRecordRepository idempotencyRepository;

    public IdempotencyService(IdempotencyRecordRepository idempotencyRepository) {
        this.idempotencyRepository = idempotencyRepository;
    }

    // REQUIRES_NEW: this commits immediately in its own transaction,
    // regardless of what happens in the caller's transaction afterward.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean tryReserve(String idempotencyKey) {
        try {
            idempotencyRepository.save(new IdempotencyRecord(idempotencyKey));
            return true; // we won the race — this is the first request with this key
        } catch (DataIntegrityViolationException e) {
            return false; // someone already reserved this key
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void completeWithBooking(String idempotencyKey, Long bookingId) {
        idempotencyRepository.findByIdempotencyKey(idempotencyKey)
                .ifPresent(record -> {
                    record.setBookingId(bookingId);
                    idempotencyRepository.save(record);
                });
    }
}