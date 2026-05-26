package com.timeline.controller;

import com.timeline.dto.CommentResponse;
import com.timeline.dto.CreateCommentRequest;
import com.timeline.service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "コメント", description = "投稿へのコメント操作")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/posts/{postId}/comments")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @Operation(summary = "コメント一覧取得")
    @ApiResponse(responseCode = "200", description = "取得成功")
    @GetMapping
    public ResponseEntity<List<CommentResponse>> getComments(
            @PathVariable Long postId) {
        return ResponseEntity.ok(commentService.getComments(postId));
    }

    @Operation(summary = "コメント作成")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "作成成功"),
        @ApiResponse(responseCode = "400", description = "バリデーションエラー"),
        @ApiResponse(responseCode = "401", description = "未認証")
    })
    @PostMapping
    public ResponseEntity<CommentResponse> createComment(
            @PathVariable Long postId,
            @Valid @RequestBody CreateCommentRequest req,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentService.createComment(postId, userId, req));
    }

    @Operation(summary = "コメント削除")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "削除成功"),
        @ApiResponse(responseCode = "401", description = "未認証"),
        @ApiResponse(responseCode = "403", description = "他ユーザーのコメントは削除不可")
    })
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal Long userId) {
        commentService.deleteComment(postId, commentId, userId);
        return ResponseEntity.noContent().build();
    }
}
