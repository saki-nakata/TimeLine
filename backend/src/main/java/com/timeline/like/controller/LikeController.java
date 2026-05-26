package com.timeline.like.controller;

import com.timeline.like.dto.LikeResponse;
import com.timeline.like.service.LikeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "いいね", description = "投稿へのいいね操作")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/posts/{postId}/likes")
public class LikeController {

    private final LikeService likeService;

    public LikeController(LikeService likeService) {
        this.likeService = likeService;
    }

    @Operation(summary = "いいねを追加")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "追加成功"),
        @ApiResponse(responseCode = "401", description = "未認証")
    })
    @PostMapping
    public ResponseEntity<LikeResponse> addLike(
            @PathVariable Long postId,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(likeService.addLike(postId, userId));
    }

    @Operation(summary = "いいねを取り消し")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "取り消し成功"),
        @ApiResponse(responseCode = "401", description = "未認証")
    })
    @DeleteMapping
    public ResponseEntity<LikeResponse> removeLike(
            @PathVariable Long postId,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(likeService.removeLike(postId, userId));
    }
}
