package com.flashtix.controller;


import com.flashtix.dto.LoginRequest;
import com.flashtix.dto.RegisterRequest;
import com.flashtix.dto.UserResponse;
import com.flashtix.entity.User;
import com.flashtix.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {

        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        User savedUser = authService.register(request);
        UserResponse response = new UserResponse(
                savedUser.getId(),
                savedUser.getName(),
                savedUser.getEmail(),
                savedUser.getRole()
        );
        return ResponseEntity.ok(response);

    }
    @PostMapping("/login")
    public ResponseEntity<String> login(@Valid @RequestBody LoginRequest request) {
        String token = authService.login(request);
        return ResponseEntity.ok(token);
    }
//    @GetMapping("/me")
//    public ResponseEntity<String> me() {
//        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
//        assert auth != null;
//        return ResponseEntity.ok("Authenticated as user ID: " + auth.getPrincipal());
//    }
}