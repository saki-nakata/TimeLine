package com.timeline.comment.service;

import com.timeline.comment.dto.CommentResponse;
import com.timeline.comment.dto.CreateCommentRequest;
import com.timeline.comment.repository.CommentMapper;
import com.timeline.model.Comment;
import com.timeline.model.Post;
import com.timeline.model.User;
import com.timeline.post.repository.PostMapper;
import com.timeline.user.repository.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock CommentMapper commentMapper;
    @Mock PostMapper postMapper;
    @Mock UserMapper userMapper;
    @InjectMocks CommentService commentService;

    private Post testPost;
    private User testUser;
    private Comment testComment;

    @BeforeEach
    void setUp() {
        testPost = new Post();
        testPost.setId(10L);
        testPost.setUserId(1L);
        testPost.setContent("テスト投稿");

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("alice");
        testUser.setDisplayName("Alice");

        testComment = new Comment();
        testComment.setId(100L);
        testComment.setPostId(10L);
        testComment.setUserId(1L);
        testComment.setContent("テストコメント");
        testComment.setCreatedAt(OffsetDateTime.now());
    }

    // ─── getComments ──────────────────────────────────────────────

    @Test
    void getComments_投稿あり_コメントリストが返る() {
        CommentResponse commentResponse = new CommentResponse();
        commentResponse.setId(100L);
        commentResponse.setContent("テストコメント");

        when(postMapper.findById(10L)).thenReturn(testPost);
        when(commentMapper.findByPostId(10L)).thenReturn(List.of(commentResponse));

        List<CommentResponse> results = commentService.getComments(10L);

        assertThat(results).hasSize(1);
    }

    @Test
    void getComments_投稿が存在しない_404例外() {
        when(postMapper.findById(99L)).thenReturn(null);

        assertThatThrownBy(() -> commentService.getComments(99L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("投稿が見つかりません");

        verify(commentMapper, never()).findByPostId(anyLong());
    }

    // ─── createComment ────────────────────────────────────────────

    @Test
    void createComment_正常作成_CommentResponseが返る() {
        when(postMapper.findById(10L)).thenReturn(testPost);
        doNothing().when(commentMapper).insert(any(Comment.class));
        doNothing().when(postMapper).incrementCommentCount(10L);
        when(commentMapper.findById(any())).thenReturn(testComment);
        when(userMapper.findById(1L)).thenReturn(testUser);

        CreateCommentRequest req = new CreateCommentRequest();
        req.setContent("テストコメント");

        CommentResponse result = commentService.createComment(10L, 1L, req);

        assertThat(result.getContent()).isEqualTo("テストコメント");
        assertThat(result.getUsername()).isEqualTo("alice");
        verify(postMapper).incrementCommentCount(10L);
    }

    @Test
    void createComment_投稿が存在しない_404例外() {
        when(postMapper.findById(99L)).thenReturn(null);

        CreateCommentRequest req = new CreateCommentRequest();
        req.setContent("コメント");

        assertThatThrownBy(() -> commentService.createComment(99L, 1L, req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("投稿が見つかりません");

        verify(commentMapper, never()).insert(any());
    }

    // ─── deleteComment ────────────────────────────────────────────

    @Test
    void deleteComment_オーナーが削除_decrementCommentCountが呼ばれる() {
        when(postMapper.findById(10L)).thenReturn(testPost);
        when(commentMapper.findById(100L)).thenReturn(testComment);
        doNothing().when(commentMapper).delete(100L);
        doNothing().when(postMapper).decrementCommentCount(10L);

        commentService.deleteComment(10L, 100L, 1L);

        verify(commentMapper).delete(100L);
        verify(postMapper).decrementCommentCount(10L);
    }

    @Test
    void deleteComment_他ユーザーが削除_403例外() {
        when(postMapper.findById(10L)).thenReturn(testPost);
        when(commentMapper.findById(100L)).thenReturn(testComment);

        assertThatThrownBy(() -> commentService.deleteComment(10L, 100L, 2L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("このコメントを削除する権限がありません");

        verify(commentMapper, never()).delete(anyLong());
    }

    @Test
    void deleteComment_コメントが存在しない_404例外() {
        when(postMapper.findById(10L)).thenReturn(testPost);
        when(commentMapper.findById(999L)).thenReturn(null);

        assertThatThrownBy(() -> commentService.deleteComment(10L, 999L, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("コメントが見つかりません");

        verify(commentMapper, never()).delete(anyLong());
    }

    @Test
    void deleteComment_投稿が存在しない_404例外() {
        when(postMapper.findById(99L)).thenReturn(null);

        assertThatThrownBy(() -> commentService.deleteComment(99L, 100L, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("投稿が見つかりません");
    }
}
