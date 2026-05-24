package com.timeline.controller;

import com.timeline.dto.FollowResponse;
import com.timeline.dto.TimelineResponse;
import com.timeline.dto.UpdateProfileRequest;
import com.timeline.dto.UserProfileResponse;

import java.util.List;
import com.timeline.service.FollowService;
import com.timeline.service.PostService;
import com.timeline.service.S3StorageService;
import com.timeline.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final FollowService followService;
    private final S3StorageService s3StorageService;
    private final PostService postService;

    public UserController(UserService userService, FollowService followService,
                          S3StorageService s3StorageService, PostService postService) {
        this.userService = userService;
        this.followService = followService;
        this.s3StorageService = s3StorageService;
        this.postService = postService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserProfileResponse>> searchUsers(
            @RequestParam String q,
            @AuthenticationPrincipal Long currentUserId) {
        return ResponseEntity.ok(userService.searchUsers(q, currentUserId));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserProfileResponse> getProfile(
            @PathVariable Long userId,
            @AuthenticationPrincipal Long currentUserId) {
        return ResponseEntity.ok(userService.getProfile(userId, currentUserId));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateProfileRequest req,
            @AuthenticationPrincipal Long currentUserId) {
        if (!userId.equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "他のユーザーのプロフィールを編集できません");
        }
        return ResponseEntity.ok(userService.updateProfile(userId, req));
    }

    @PostMapping(value = "/{userId}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserProfileResponse> uploadAvatar(
            @PathVariable Long userId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal Long currentUserId) {
        if (!userId.equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "他のユーザーのアバターを変更できません");
        }
        String avatarUrl = s3StorageService.storeAvatar(file);
        return ResponseEntity.ok(userService.updateAvatar(userId, avatarUrl));
    }

    @PostMapping("/{userId}/follows")
    public ResponseEntity<FollowResponse> follow(
            @PathVariable Long userId,
            @AuthenticationPrincipal Long currentUserId) {
        return ResponseEntity.ok(followService.follow(currentUserId, userId));
    }

    @DeleteMapping("/{userId}/follows")
    public ResponseEntity<FollowResponse> unfollow(
            @PathVariable Long userId,
            @AuthenticationPrincipal Long currentUserId) {
        return ResponseEntity.ok(followService.unfollow(currentUserId, userId));
    }

    @GetMapping("/{userId}/following")
    public ResponseEntity<List<UserProfileResponse>> getFollowing(
            @PathVariable Long userId,
            @AuthenticationPrincipal Long currentUserId) {
        return ResponseEntity.ok(followService.getFollowing(userId, currentUserId));
    }

    @GetMapping("/{userId}/posts")
    public ResponseEntity<TimelineResponse> getUserPosts(
            @PathVariable Long userId,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "20") int limit,
            @AuthenticationPrincipal Long currentUserId) {
        return ResponseEntity.ok(postService.getUserPosts(userId, cursor, limit, currentUserId));
    }
}
