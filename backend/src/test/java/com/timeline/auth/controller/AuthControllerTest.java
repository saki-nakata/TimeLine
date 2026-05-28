package com.timeline.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.timeline.auth.dto.LoginRequest;
import com.timeline.auth.dto.RegisterRequest;
import com.timeline.auth.service.AuthService;
import com.timeline.config.SecurityConfig;
import com.timeline.filter.JwtAuthFilter;
import com.timeline.model.User;
import com.timeline.util.JwtUtil;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
class AuthControllerTest {

    @Autowired MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    @MockitoBean AuthService authService;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean JwtAuthFilter jwtAuthFilter;

    private static final Long USER_ID = 1L;
    private User testUser;

    private static org.springframework.test.web.servlet.request.RequestPostProcessor authenticated() {
        return authentication(new UsernamePasswordAuthenticationToken(USER_ID, null, List.of()));
    }

    @BeforeEach
    void setUp() throws Exception {
        doAnswer(inv -> {
            ((FilterChain) inv.getArgument(2)).doFilter(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(jwtAuthFilter).doFilter(any(), any(), any());

        testUser = new User();
        testUser.setId(USER_ID);
        testUser.setUsername("alice");
        testUser.setEmail("alice@example.com");
        testUser.setFollowerCount(0L);
        testUser.setFollowingCount(0L);

        when(authService.generateToken(anyLong())).thenReturn("access-token");
        when(authService.generateAndSaveRefreshToken(anyLong())).thenReturn("refresh-token");
    }

    // ─── POST /api/auth/register ──────────────────────────────────

    @Test
    void register_正常登録_201とUserResponseが返る() throws Exception {
        when(authService.register(any())).thenReturn(testUser);

        RegisterRequest req = new RegisterRequest();
        req.setUsername("alice");
        req.setEmail("alice@example.com");
        req.setPassword("password123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("alice"));
    }

    @Test
    void register_ユーザー名重複_409() throws Exception {
        when(authService.register(any()))
                .thenThrow(new ResponseStatusException(CONFLICT, "ユーザー名はすでに使用されています"));

        RegisterRequest req = new RegisterRequest();
        req.setUsername("alice");
        req.setEmail("alice@example.com");
        req.setPassword("password123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }

    @Test
    void register_バリデーションエラー_400() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("");
        req.setEmail("not-an-email");
        req.setPassword("short");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // ─── POST /api/auth/login ─────────────────────────────────────

    @Test
    void login_正常ログイン_200とUserResponseが返る() throws Exception {
        when(authService.login(any())).thenReturn(testUser);

        LoginRequest req = new LoginRequest();
        req.setEmail("alice@example.com");
        req.setPassword("password123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"));
    }

    @Test
    void login_認証失敗_401() throws Exception {
        when(authService.login(any()))
                .thenThrow(new ResponseStatusException(UNAUTHORIZED, "メールアドレスまたはパスワードが正しくありません"));

        LoginRequest req = new LoginRequest();
        req.setEmail("alice@example.com");
        req.setPassword("wrongpassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ─── POST /api/auth/logout ────────────────────────────────────

    @Test
    void logout_204() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isNoContent());
    }

    // ─── POST /api/auth/refresh ───────────────────────────────────

    @Test
    void refresh_リフレッシュトークンなし_401() throws Exception {
        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refresh_有効なCookie_200とUserResponseが返る() throws Exception {
        when(authService.refreshTokens("valid-token")).thenReturn(testUser);

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", "valid-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"));
    }

    // ─── GET /api/auth/me ─────────────────────────────────────────

    @Test
    void me_認証済み_200とUserResponseが返る() throws Exception {
        when(authService.findById(USER_ID)).thenReturn(testUser);

        mockMvc.perform(get("/api/auth/me").with(authenticated()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"));
    }

    @Test
    void me_未認証_401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }
}
