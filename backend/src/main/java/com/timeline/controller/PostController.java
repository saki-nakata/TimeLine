package com.timeline.controller;

import com.timeline.dto.PostResponse;
import com.timeline.dto.TimelineResponse;
import com.timeline.service.PostService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<PostResponse> getPost(
            @PathVariable Long id,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(postService.getPost(id, userId));
    }

    @GetMapping
    public ResponseEntity<TimelineResponse> getTimeline(
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "all") String type,
            @AuthenticationPrincipal Long userId) {
        if ("following".equals(type)) {
            return ResponseEntity.ok(postService.getFollowingTimeline(cursor, limit, userId));
        }
        return ResponseEntity.ok(postService.getTimeline(cursor, limit, userId));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PostResponse> createPost(
            @RequestParam(required = false) String content,
            @RequestParam(required = false) MultipartFile image,
            @AuthenticationPrincipal Long userId) {
        PostResponse post = postService.createPost(userId, content, image);
        return ResponseEntity.status(HttpStatus.CREATED).body(post);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PostResponse> updatePost(
            @PathVariable Long id,
            @RequestParam(required = false) String content,
            @RequestParam(required = false) MultipartFile image,
            @RequestParam(defaultValue = "false") boolean removeImage,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(postService.updatePost(id, userId, content, image, removeImage));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @PathVariable Long id,
            @AuthenticationPrincipal Long userId) {
        postService.deletePost(id, userId);
        return ResponseEntity.noContent().build();
    }
}
