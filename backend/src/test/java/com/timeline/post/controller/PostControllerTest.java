package com.timeline.post.controller;

import com.timeline.config.SecurityConfig;
import com.timeline.filter.JwtAuthFilter;
import com.timeline.post.dto.PostResponse;
import com.timeline.post.dto.TimelineResponse;
import com.timeline.post.service.PostService;
import com.timeline.util.JwtUtil;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.context.annotation.Import;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PostController.class)
@Import(SecurityConfig.class)
class PostControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean PostService postService;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean JwtAuthFilter jwtAuthFilter;

    private static final Long USER_ID = 1L;

    private PostResponse samplePost;

    // 認証済みユーザーを設定する RequestPostProcessor
    private static org.springframework.test.web.servlet.request.RequestPostProcessor authenticated() {
        return authentication(new UsernamePasswordAuthenticationToken(USER_ID, null, List.of()));
    }

    @BeforeEach
    void setUp() throws Exception {
        // JwtAuthFilter mock はリクエストをフィルターチェーンに通す
        doAnswer(inv -> {
            ((FilterChain) inv.getArgument(2)).doFilter(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(jwtAuthFilter).doFilter(any(), any(), any());

        samplePost = new PostResponse();
        samplePost.setId(10L);
        samplePost.setUserId(USER_ID);
        samplePost.setContent("テスト投稿");
        samplePost.setUsername("testuser");
        samplePost.setCreatedAt(OffsetDateTime.now());
        samplePost.setUpdatedAt(OffsetDateTime.now());
    }

    // ─── GET /api/posts/{id} ─────────────────────────────────────

    @Test
    void getPost_未認証_401() throws Exception {
        mockMvc.perform(get("/api/posts/10"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getPost_認証済み_200とPostResponseが返る() throws Exception {
        when(postService.getPost(10L, USER_ID)).thenReturn(samplePost);

        mockMvc.perform(get("/api/posts/10").with(authenticated()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.content").value("テスト投稿"));
    }

    @Test
    void getPost_存在しない投稿_404() throws Exception {
        when(postService.getPost(99L, USER_ID))
                .thenThrow(new ResponseStatusException(NOT_FOUND, "投稿が見つかりません"));

        mockMvc.perform(get("/api/posts/99").with(authenticated()))
                .andExpect(status().isNotFound());
    }

    // ─── GET /api/posts ──────────────────────────────────────────

    @Test
    void getTimeline_未認証_401() throws Exception {
        mockMvc.perform(get("/api/posts"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getTimeline_認証済みtypeAll_200とTimelineResponseが返る() throws Exception {
        TimelineResponse timeline = new TimelineResponse(List.of(samplePost), null, false);
        when(postService.getTimeline(isNull(), eq(20), eq(USER_ID))).thenReturn(timeline);

        mockMvc.perform(get("/api/posts").with(authenticated())
                        .param("type", "all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts[0].id").value(10))
                .andExpect(jsonPath("$.hasMore").value(false));
    }

    @Test
    void getTimeline_認証済みtypeFollowing_200とTimelineResponseが返る() throws Exception {
        TimelineResponse timeline = new TimelineResponse(List.of(), null, false);
        when(postService.getFollowingTimeline(isNull(), eq(20), eq(USER_ID))).thenReturn(timeline);

        mockMvc.perform(get("/api/posts").with(authenticated())
                        .param("type", "following"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasMore").value(false));
    }

    // ─── POST /api/posts ─────────────────────────────────────────

    @Test
    void createPost_未認証_401() throws Exception {
        mockMvc.perform(multipart("/api/posts")
                        .param("content", "テスト"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createPost_認証済みテキストあり_201とPostResponseが返る() throws Exception {
        when(postService.createPost(eq(USER_ID), eq("テスト投稿"), isNull()))
                .thenReturn(samplePost);

        mockMvc.perform(multipart("/api/posts")
                        .param("content", "テスト投稿")
                        .with(authenticated()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    void createPost_テキストも画像もなし_400() throws Exception {
        when(postService.createPost(eq(USER_ID), isNull(), isNull()))
                .thenThrow(new ResponseStatusException(BAD_REQUEST, "テキストまたは画像が必要です"));

        mockMvc.perform(multipart("/api/posts")
                        .with(authenticated()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createPost_認証済み画像あり_201とPostResponseが返る() throws Exception {
        MockMultipartFile image = new MockMultipartFile(
                "image", "test.jpg", MediaType.IMAGE_JPEG_VALUE, "image-bytes".getBytes());
        samplePost.setImageUrl("https://s3.example.com/img.jpg");

        when(postService.createPost(eq(USER_ID), isNull(), any())).thenReturn(samplePost);

        mockMvc.perform(multipart("/api/posts")
                        .file(image)
                        .with(authenticated()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imageUrl").value("https://s3.example.com/img.jpg"));
    }

    // ─── PUT /api/posts/{id} ─────────────────────────────────────

    @Test
    void updatePost_認証済み_200とPostResponseが返る() throws Exception {
        samplePost.setContent("更新後テキスト");
        when(postService.updatePost(eq(10L), eq(USER_ID), eq("更新後テキスト"), isNull(), eq(false)))
                .thenReturn(samplePost);

        mockMvc.perform(multipart("/api/posts/10")
                        .param("content", "更新後テキスト")
                        .with(req -> {
                            req.setMethod("PUT");
                            return req;
                        })
                        .with(authenticated()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("更新後テキスト"));
    }

    @Test
    void updatePost_他人の投稿_403() throws Exception {
        when(postService.updatePost(eq(10L), eq(USER_ID), any(), isNull(), eq(false)))
                .thenThrow(new ResponseStatusException(FORBIDDEN, "権限がありません"));

        mockMvc.perform(multipart("/api/posts/10")
                        .param("content", "更新")
                        .with(req -> {
                            req.setMethod("PUT");
                            return req;
                        })
                        .with(authenticated()))
                .andExpect(status().isForbidden());
    }

    // ─── DELETE /api/posts/{id} ───────────────────────────────────

    @Test
    void deletePost_未認証_401() throws Exception {
        mockMvc.perform(delete("/api/posts/10"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deletePost_認証済み_204() throws Exception {
        mockMvc.perform(delete("/api/posts/10").with(authenticated()))
                .andExpect(status().isNoContent());
    }

    @Test
    void deletePost_他人の投稿_403() throws Exception {
        org.mockito.Mockito.doThrow(new ResponseStatusException(FORBIDDEN, "権限がありません"))
                .when(postService).deletePost(10L, USER_ID);

        mockMvc.perform(delete("/api/posts/10").with(authenticated()))
                .andExpect(status().isForbidden());
    }

    @Test
    void deletePost_存在しない投稿_404() throws Exception {
        org.mockito.Mockito.doThrow(new ResponseStatusException(NOT_FOUND, "投稿が見つかりません"))
                .when(postService).deletePost(99L, USER_ID);

        mockMvc.perform(delete("/api/posts/99").with(authenticated()))
                .andExpect(status().isNotFound());
    }
}
