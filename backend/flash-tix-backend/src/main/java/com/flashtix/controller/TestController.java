package com.flashtix.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    @GetMapping("/api/v1/me")
    public ResponseEntity<String> me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        assert auth != null;
        return ResponseEntity.ok("Authenticated as user ID: " + auth.getPrincipal());
    }
}