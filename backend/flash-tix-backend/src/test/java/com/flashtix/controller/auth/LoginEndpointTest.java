package com.flashtix.controller.auth;

import com.flashtix.config.SecurityConfig;
import com.flashtix.controller.AuthController;
import com.flashtix.dto.LoginRequest;
import com.flashtix.security.JwtUtil;
import com.flashtix.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** POST /api/v1/auth/login */
@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtUtil.class})
class LoginEndpointTest {

    private static final String URL = "/api/v1/auth/login";

    @Autowired private MockMvc mockMvc;

    @MockitoBean private AuthService authService;

    @Test
    void returnsTokenAsPlainText() throws Exception {
        when(authService.login(any(LoginRequest.class))).thenReturn("jwt-token-value");

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                        {"email":"rishabh@example.com","password":"secret123"}
                        """))
                .andExpect(status().isOk())
                .andExpect(content().string("jwt-token-value"));
    }

    @Test
    void missingPasswordIsRejected() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                        {"email":"rishabh@example.com"}
                        """))
                .andExpect(status().isBadRequest());

        verify(authService, never()).login(any());
    }

    @Test
    void invalidEmailIsRejected() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                        {"email":"bad","password":"secret123"}
                        """))
                .andExpect(status().isBadRequest());

        verify(authService, never()).login(any());
    }

    @Test
    void wrongCredentialsReturnErrorMessage() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new IllegalArgumentException("Invalid email or password"));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                        {"email":"rishabh@example.com","password":"wrong"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid email or password"));
    }
}
