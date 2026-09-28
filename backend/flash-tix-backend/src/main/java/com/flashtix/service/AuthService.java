package com.flashtix.service;

import com.flashtix.dto.LoginRequest;
import com.flashtix.dto.RegisterRequest;
import com.flashtix.entity.User;
import com.flashtix.repository.UserRepository;
import com.flashtix.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public User register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        String requestedRole = request.getRole();
        String finalRole;

        if (requestedRole == null || requestedRole.isBlank()) {
            finalRole = "USER";
        } else if (requestedRole.equals("USER") || requestedRole.equals("ORGANIZER")) {
            finalRole = requestedRole;
        } else {
            throw new IllegalArgumentException("Invalid role. Allowed: USER, ORGANIZER");
        }

        String hashedPassword = passwordEncoder.encode(request.getPassword());

        User user = new User(
                request.getEmail(),
                request.getName(),
                hashedPassword,
                finalRole
        );

        return userRepository.save(user);
    }

    public String login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        return jwtUtil.generateToken(user.getId(), user.getRole());
    }
}