package com.flashtix.controller.auth;

import com.flashtix.config.SecurityConfig;
import com.flashtix.controller.TestController;
import com.flashtix.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /api/v1/me */
@WebMvcTest(TestController.class)
@Import({SecurityConfig.class, JwtUtil.class})
class MeEndpointTest {

    private static final String URL = "/api/v1/me";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtUtil jwtUtil;

    @Test
    void returnsUserIdFromToken() throws Exception {
        mockMvc.perform(get(URL).header("Authorization", "Bearer " + jwtUtil.generateToken(42L, "USER")))
                .andExpect(status().isOk())
                .andExpect(content().string("Authenticated as user ID: 42"));
    }

    @Test
    void rejectsRequestWithoutToken() throws Exception {
        mockMvc.perform(get(URL))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsInvalidToken() throws Exception {
        mockMvc.perform(get(URL).header("Authorization", "Bearer not.a.real.token"))
                .andExpect(status().isForbidden());
    }
}
