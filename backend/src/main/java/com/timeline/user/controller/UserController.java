package com.timeline.user.controller;

import com.timeline.follow.dto.FollowResponse;
import com.timeline.post.dto.TimelineResponse;
import com.timeline.user.dto.UpdateProfileRequest;
import com.timeline.user.dto.UserProfileResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;
import com.timeline.follow.service.FollowService;
import com.timeline.post.service.PostService;
import com.timeline.common.storage.S3StorageService;
import com.timeline.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Tag(name = "ユーザー", description = "プロフィール・アバター・フォロー・検索")
@SecurityRequirement(name = "cookieAuth")
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

    @Operation(summary = "ユーザー検索")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "検索成功"),
        @ApiResponse(responseCode = "401", description = "未認証")
    })
    @GetMapping("/search")
    public ResponseEntity<List<UserProfileResponse>> searchUsers(
            @RequestParam String q,
            @AuthenticationPrincipal Long currentUserId) {
        return ResponseEntity.ok(userService.searchUsers(q, currentUserId));
    }

    @Operation(summary = "ユーザープロフィール取得")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "取得成功"),
        @ApiResponse(responseCode = "401", description = "未認証"),
        @ApiResponse(responseCode = "404", description = "ユーザーが存在しない")
    })
    @GetMapping("/{userId}")
    public ResponseEntity<UserProfileResponse> getProfile(
            @PathVariable Long userId,
            @AuthenticationPrincipal Long currentUserId) {
        return ResponseEntity.ok(userService.getProfile(userId, currentUserId));
    }

    @Operation(summary = "プロフィール更新")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "更新成功"),
        @ApiResponse(responseCode = "400", description = "バリデーションエラー"),
        @ApiResponse(responseCode = "401", description = "未認証"),
        @ApiResponse(responseCode = "403", description = "他ユーザーのプロフィールは更新不可")
    })
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

    @Operation(summary = "アバター画像アップロード")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "アップロード成功"),
        @ApiResponse(responseCode = "400", description = "ファイルが無効"),
        @ApiResponse(responseCode = "401", description = "未認証"),
        @ApiResponse(responseCode = "403", description = "他ユーザーのアバターは変更不可")
    })
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

    @Operation(summary = "フォロー")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "フォロー成功"),
        @ApiResponse(responseCode = "401", description = "未認証")
    })
    @PostMapping("/{userId}/follows")
    public ResponseEntity<FollowResponse> follow(
            @PathVariable Long userId,
            @AuthenticationPrincipal Long currentUserId) {
        return ResponseEntity.ok(followService.follow(currentUserId, userId));
    }

    @Operation(summary = "フォロー解除")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "フォロー解除成功"),
        @ApiResponse(responseCode = "401", description = "未認証")
    })
    @DeleteMapping("/{userId}/follows")
    public ResponseEntity<FollowResponse> unfollow(
            @PathVariable Long userId,
            @AuthenticationPrincipal Long currentUserId) {
        return ResponseEntity.ok(followService.unfollow(currentUserId, userId));
    }

    @Operation(summary = "フォロー中ユーザー一覧")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "取得成功"),
        @ApiResponse(responseCode = "401", description = "未認証")
    })
    @GetMapping("/{userId}/following")
    public ResponseEntity<List<UserProfileResponse>> getFollowing(
            @PathVariable Long userId,
            @AuthenticationPrincipal Long currentUserId) {
        return ResponseEntity.ok(followService.getFollowing(userId, currentUserId));
    }

    @Operation(summary = "ユーザーの投稿一覧")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "取得成功"),
        @ApiResponse(responseCode = "401", description = "未認証")
    })
    @GetMapping("/{userId}/posts")
    public ResponseEntity<TimelineResponse> getUserPosts(
            @PathVariable Long userId,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "20") int limit,
            @AuthenticationPrincipal Long currentUserId) {
        return ResponseEntity.ok(postService.getUserPosts(userId, cursor, limit, currentUserId));
    }
}
