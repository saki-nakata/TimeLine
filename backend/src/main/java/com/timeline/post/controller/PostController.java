package com.timeline.post.controller;

import com.timeline.post.dto.PostResponse;
import com.timeline.post.dto.TimelineResponse;
import com.timeline.post.service.PostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "投稿", description = "タイムライン取得・投稿 CRUD")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @Operation(summary = "投稿詳細取得")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "取得成功"),
        @ApiResponse(responseCode = "401", description = "未認証"),
        @ApiResponse(responseCode = "404", description = "投稿が存在しない")
    })
    @GetMapping("/{id}")
    public ResponseEntity<PostResponse> getPost(
            @PathVariable Long id,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(postService.getPost(id, userId));
    }

    @Operation(summary = "タイムライン取得（全体 / フォロー中）")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "取得成功"),
        @ApiResponse(responseCode = "401", description = "未認証")
    })
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

    @Operation(summary = "投稿検索（キーワード）")
    @GetMapping("/search")
    public ResponseEntity<TimelineResponse> searchPosts(
            @RequestParam String q,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "20") int limit,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(postService.searchPosts(q, cursor, limit, userId));
    }

    @Operation(summary = "ハッシュタグ検索")
    @GetMapping("/hashtag/{tag}")
    public ResponseEntity<TimelineResponse> searchByHashtag(
            @PathVariable String tag,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "20") int limit,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(postService.searchPostsByHashtag(tag, cursor, limit, userId));
    }

    @Operation(summary = "投稿作成（画像添付可）")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "作成成功"),
        @ApiResponse(responseCode = "400", description = "バリデーションエラー"),
        @ApiResponse(responseCode = "401", description = "未認証")
    })
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PostResponse> createPost(
            @RequestParam(required = false) String content,
            @RequestParam(required = false) MultipartFile image,
            @AuthenticationPrincipal Long userId) {
        PostResponse post = postService.createPost(userId, content, image);
        return ResponseEntity.status(HttpStatus.CREATED).body(post);
    }

    @Operation(summary = "投稿更新（画像変更・削除可）")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "更新成功"),
        @ApiResponse(responseCode = "400", description = "バリデーションエラー"),
        @ApiResponse(responseCode = "401", description = "未認証"),
        @ApiResponse(responseCode = "403", description = "他ユーザーの投稿は更新不可"),
        @ApiResponse(responseCode = "404", description = "投稿が存在しない")
    })
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PostResponse> updatePost(
            @PathVariable Long id,
            @RequestParam(required = false) String content,
            @RequestParam(required = false) MultipartFile image,
            @RequestParam(defaultValue = "false") boolean removeImage,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(postService.updatePost(id, userId, content, image, removeImage));
    }

    @Operation(summary = "投稿削除")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "削除成功"),
        @ApiResponse(responseCode = "401", description = "未認証"),
        @ApiResponse(responseCode = "403", description = "他ユーザーの投稿は削除不可"),
        @ApiResponse(responseCode = "404", description = "投稿が存在しない")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @PathVariable Long id,
            @AuthenticationPrincipal Long userId) {
        postService.deletePost(id, userId);
        return ResponseEntity.noContent().build();
    }
}
