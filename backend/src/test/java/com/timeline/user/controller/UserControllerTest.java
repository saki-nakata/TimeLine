package com.timeline.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.timeline.common.storage.S3StorageService;
import com.timeline.config.SecurityConfig;
import com.timeline.filter.JwtAuthFilter;
import com.timeline.follow.dto.FollowResponse;
import com.timeline.follow.service.FollowService;
import com.timeline.post.dto.TimelineResponse;
import com.timeline.post.service.PostService;
import com.timeline.user.dto.UpdateProfileRequest;
import com.timeline.user.dto.UserProfileResponse;
import com.timeline.user.service.UserService;
import com.timeline.util.JwtUtil;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@Import(SecurityConfig.class)
class UserControllerTest {

    @Autowired MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    @MockitoBean UserService userService;
    @MockitoBean FollowService followService;
    @MockitoBean S3StorageService s3StorageService;
    @MockitoBean PostService postService;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean JwtAuthFilter jwtAuthFilter;

    private static final Long USER_ID = 1L;
    private UserProfileResponse sampleProfile;

    private static org.springframework.test.web.servlet.request.RequestPostProcessor authenticated() {
        return authentication(new UsernamePasswordAuthenticationToken(USER_ID, null, List.of()));
    }

    @BeforeEach
    void setUp() throws Exception {
        doAnswer(inv -> {
            ((FilterChain) inv.getArgument(2)).doFilter(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(jwtAuthFilter).doFilter(any(), any(), any());

        sampleProfile = new UserProfileResponse();
        sampleProfile.setId(USER_ID);
        sampleProfile.setUsername("alice");
        sampleProfile.setDisplayName("Alice");
        sampleProfile.setFollowerCount(0L);
        sampleProfile.setFollowingCount(0L);
    }

    // ─── GET /api/users/search ────────────────────────────────────

    @Test
    void searchUsers_認証済み_200とリストが返る() throws Exception {
        when(userService.searchUsers(eq("ali"), eq(USER_ID))).thenReturn(List.of(sampleProfile));

        mockMvc.perform(get("/api/users/search")
                        .param("q", "ali")
                        .with(authenticated()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("alice"));
    }

    // ─── GET /api/users/{userId} ──────────────────────────────────

    @Test
    void getProfile_存在するユーザー_200とUserProfileResponseが返る() throws Exception {
        when(userService.getProfile(USER_ID, USER_ID)).thenReturn(sampleProfile);

        mockMvc.perform(get("/api/users/1").with(authenticated()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"));
    }

    @Test
    void getProfile_存在しないユーザー_404() throws Exception {
        when(userService.getProfile(99L, USER_ID))
                .thenThrow(new ResponseStatusException(NOT_FOUND, "ユーザーが見つかりません"));

        mockMvc.perform(get("/api/users/99").with(authenticated()))
                .andExpect(status().isNotFound());
    }

    // ─── PUT /api/users/{userId} ──────────────────────────────────

    @Test
    void updateProfile_自分のプロフィール_200とUserProfileResponseが返る() throws Exception {
        when(userService.updateProfile(eq(USER_ID), any())).thenReturn(sampleProfile);

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setDisplayName("Updated Name");

        mockMvc.perform(put("/api/users/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .with(authenticated()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"));
    }

    @Test
    void updateProfile_他人のプロフィール_403() throws Exception {
        mockMvc.perform(put("/api/users/2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateProfileRequest()))
                        .with(authenticated()))
                .andExpect(status().isForbidden());
    }

    // ─── POST /api/users/{userId}/avatar ─────────────────────────

    @Test
    void uploadAvatar_自分のアバター_200とUserProfileResponseが返る() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "avatar.jpg", MediaType.IMAGE_JPEG_VALUE, "image-bytes".getBytes());
        when(s3StorageService.storeAvatar(any())).thenReturn("https://s3.example.com/avatar.jpg");
        when(userService.updateAvatar(eq(USER_ID), any())).thenReturn(sampleProfile);

        mockMvc.perform(multipart("/api/users/1/avatar")
                        .file(file)
                        .with(authenticated()))
                .andExpect(status().isOk());
    }

    @Test
    void uploadAvatar_他人のアバター_403() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "avatar.jpg", MediaType.IMAGE_JPEG_VALUE, "image-bytes".getBytes());

        mockMvc.perform(multipart("/api/users/2/avatar")
                        .file(file)
                        .with(authenticated()))
                .andExpect(status().isForbidden());
    }

    // ─── POST /api/users/{userId}/follows ─────────────────────────

    @Test
    void follow_認証済み_200とFollowResponseが返る() throws Exception {
        when(followService.follow(USER_ID, 2L)).thenReturn(new FollowResponse(1L, 1L, true));

        mockMvc.perform(post("/api/users/2/follows").with(authenticated()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.following").value(true));
    }

    // ─── DELETE /api/users/{userId}/follows ───────────────────────

    @Test
    void unfollow_認証済み_200とFollowResponseが返る() throws Exception {
        when(followService.unfollow(USER_ID, 2L)).thenReturn(new FollowResponse(0L, 0L, false));

        mockMvc.perform(delete("/api/users/2/follows").with(authenticated()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.following").value(false));
    }

    // ─── GET /api/users/{userId}/following ────────────────────────

    @Test
    void getFollowing_認証済み_200とリストが返る() throws Exception {
        when(followService.getFollowing(USER_ID, USER_ID)).thenReturn(List.of(sampleProfile));

        mockMvc.perform(get("/api/users/1/following").with(authenticated()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("alice"));
    }

    // ─── GET /api/users/{userId}/posts ────────────────────────────

    @Test
    void getUserPosts_認証済み_200とTimelineResponseが返る() throws Exception {
        TimelineResponse timeline = new TimelineResponse(List.of(), null, false);
        when(postService.getUserPosts(eq(USER_ID), isNull(), eq(20), eq(USER_ID))).thenReturn(timeline);

        mockMvc.perform(get("/api/users/1/posts").with(authenticated()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasMore").value(false));
    }
}
