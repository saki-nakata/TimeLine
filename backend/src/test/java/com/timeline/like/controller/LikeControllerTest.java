package com.timeline.like.controller;

import com.timeline.config.SecurityConfig;
import com.timeline.filter.JwtAuthFilter;
import com.timeline.like.dto.LikeResponse;
import com.timeline.like.service.LikeService;
import com.timeline.util.JwtUtil;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(LikeController.class)
@Import(SecurityConfig.class)
class LikeControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean LikeService likeService;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean JwtAuthFilter jwtAuthFilter;

    private static final Long USER_ID = 1L;

    private static org.springframework.test.web.servlet.request.RequestPostProcessor authenticated() {
        return authentication(new UsernamePasswordAuthenticationToken(USER_ID, null, List.of()));
    }

    @BeforeEach
    void setUp() throws Exception {
        doAnswer(inv -> {
            ((FilterChain) inv.getArgument(2)).doFilter(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(jwtAuthFilter).doFilter(any(), any(), any());
    }

    // ─── POST /api/posts/{postId}/likes ───────────────────────────

    @Test
    void addLike_認証済み_200とLikeResponseが返る() throws Exception {
        when(likeService.addLike(10L, USER_ID)).thenReturn(new LikeResponse(10L, 1L, true));

        mockMvc.perform(post("/api/posts/10/likes").with(authenticated()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(1))
                .andExpect(jsonPath("$.likedByCurrentUser").value(true));
    }

    @Test
    void addLike_重複いいね_200が返る() throws Exception {
        when(likeService.addLike(10L, USER_ID)).thenReturn(new LikeResponse(10L, 1L, true));

        mockMvc.perform(post("/api/posts/10/likes").with(authenticated()))
                .andExpect(status().isOk());
    }

    // ─── DELETE /api/posts/{postId}/likes ─────────────────────────

    @Test
    void removeLike_認証済み_200とLikeResponseが返る() throws Exception {
        when(likeService.removeLike(10L, USER_ID)).thenReturn(new LikeResponse(10L, 0L, false));

        mockMvc.perform(delete("/api/posts/10/likes").with(authenticated()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(0))
                .andExpect(jsonPath("$.likedByCurrentUser").value(false));
    }

    @Test
    void removeLike_未いいね_200が返る() throws Exception {
        when(likeService.removeLike(10L, USER_ID)).thenReturn(new LikeResponse(10L, 0L, false));

        mockMvc.perform(delete("/api/posts/10/likes").with(authenticated()))
                .andExpect(status().isOk());
    }
}
