package com.flashtix.controller.auth;

import com.flashtix.config.SecurityConfig;
import com.flashtix.controller.AuthController;
import com.flashtix.dto.RegisterRequest;
import com.flashtix.entity.User;
import com.flashtix.security.JwtUtil;
import com.flashtix.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** POST /api/v1/auth/register */
@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtUtil.class})
class RegisterEndpointTest {

    private static final String URL = "/api/v1/auth/register";

    @Autowired private MockMvc mockMvc;

    @MockitoBean private AuthService authService;

    @Test
    void registersUserWithoutToken() throws Exception {
        User saved = new User("rishabh@example.com", "Rishabh", "hashed", "ORGANIZER");
        ReflectionTestUtils.setField(saved, "id", 1L);
        when(authService.register(any(RegisterRequest.class))).thenReturn(saved);

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                        {"name":"Rishabh","email":"rishabh@example.com","password":"secret123","role":"ORGANIZER"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Rishabh"))
                .andExpect(jsonPath("$.email").value("rishabh@example.com"))
                .andExpect(jsonPath("$.role").value("ORGANIZER"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void roleIsOptional() throws Exception {
        User saved = new User("user@example.com", "User", "hashed", "USER");
        when(authService.register(any(RegisterRequest.class))).thenReturn(saved);

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                        {"name":"User","email":"user@example.com","password":"secret123"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    void invalidEmailIsRejected() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                        {"name":"Rishabh","email":"not-an-email","password":"secret123"}
                        """))
                .andExpect(status().isBadRequest());

        verify(authService, never()).register(any());
    }

    @Test
    void blankFieldsAreRejected() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                        {"name":"","email":"rishabh@example.com","password":""}
                        """))
                .andExpect(status().isBadRequest());

        verify(authService, never()).register(any());
    }

    @Test
    void invalidRoleReturnsErrorMessage() throws Exception {
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new IllegalArgumentException("Invalid role. Allowed: USER, ORGANIZER"));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                        {"name":"Rishabh","email":"rishabh@example.com","password":"secret123","role":"ADMIN"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid role. Allowed: USER, ORGANIZER"));
    }
}
