package com.timeline.controller;

import com.timeline.dto.LikeResponse;
import com.timeline.service.LikeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts/{postId}/likes")
public class LikeController {

    private final LikeService likeService;

    public LikeController(LikeService likeService) {
        this.likeService = likeService;
    }

    @PostMapping
    public ResponseEntity<LikeResponse> addLike(
            @PathVariable Long postId,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(likeService.addLike(postId, userId));
    }

    @DeleteMapping
    public ResponseEntity<LikeResponse> removeLike(
            @PathVariable Long postId,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(likeService.removeLike(postId, userId));
    }
}
