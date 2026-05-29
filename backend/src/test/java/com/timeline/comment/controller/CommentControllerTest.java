package com.timeline.comment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.timeline.comment.dto.CommentResponse;
import com.timeline.comment.dto.CreateCommentRequest;
import com.timeline.comment.service.CommentService;
import com.timeline.config.SecurityConfig;
import com.timeline.filter.JwtAuthFilter;
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

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CommentController.class)
@Import(SecurityConfig.class)
class CommentControllerTest {

    @Autowired MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    @MockitoBean CommentService commentService;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean JwtAuthFilter jwtAuthFilter;

    private static final Long USER_ID = 1L;
    private CommentResponse sampleComment;

    private static org.springframework.test.web.servlet.request.RequestPostProcessor authenticated() {
        return authentication(new UsernamePasswordAuthenticationToken(USER_ID, null, List.of()));
    }

    @BeforeEach
    void setUp() throws Exception {
        doAnswer(inv -> {
            ((FilterChain) inv.getArgument(2)).doFilter(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(jwtAuthFilter).doFilter(any(), any(), any());

        sampleComment = new CommentResponse();
        sampleComment.setId(100L);
        sampleComment.setPostId(10L);
        sampleComment.setUserId(USER_ID);
        sampleComment.setUsername("alice");
        sampleComment.setContent("テストコメント");
        sampleComment.setCreatedAt(OffsetDateTime.now());
    }

    // ─── GET /api/posts/{postId}/comments ────────────────────────

    @Test
    void getComments_認証済み_200とコメントリストが返る() throws Exception {
        when(commentService.getComments(10L)).thenReturn(List.of(sampleComment));

        mockMvc.perform(get("/api/posts/10/comments").with(authenticated()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("テストコメント"));
    }

    @Test
    void getComments_未認証_401() throws Exception {
        mockMvc.perform(get("/api/posts/10/comments"))
                .andExpect(status().isUnauthorized());
    }

    // ─── POST /api/posts/{postId}/comments ───────────────────────

    @Test
    void createComment_認証済み_201とCommentResponseが返る() throws Exception {
        when(commentService.createComment(eq(10L), eq(USER_ID), any())).thenReturn(sampleComment);

        CreateCommentRequest req = new CreateCommentRequest();
        req.setContent("テストコメント");

        mockMvc.perform(post("/api/posts/10/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .with(authenticated()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("テストコメント"));
    }

    @Test
    void createComment_空コンテンツ_400() throws Exception {
        CreateCommentRequest req = new CreateCommentRequest();
        req.setContent("");

        mockMvc.perform(post("/api/posts/10/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .with(authenticated()))
                .andExpect(status().isBadRequest());
    }

    // ─── DELETE /api/posts/{postId}/comments/{commentId} ─────────

    @Test
    void deleteComment_認証済みオーナー_204() throws Exception {
        mockMvc.perform(delete("/api/posts/10/comments/100").with(authenticated()))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteComment_他人のコメント_403() throws Exception {
        doThrow(new ResponseStatusException(FORBIDDEN, "このコメントを削除する権限がありません"))
                .when(commentService).deleteComment(10L, 100L, USER_ID);

        mockMvc.perform(delete("/api/posts/10/comments/100").with(authenticated()))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteComment_存在しないコメント_404() throws Exception {
        doThrow(new ResponseStatusException(NOT_FOUND, "コメントが見つかりません"))
                .when(commentService).deleteComment(10L, 999L, USER_ID);

        mockMvc.perform(delete("/api/posts/10/comments/999").with(authenticated()))
                .andExpect(status().isNotFound());
    }
}
