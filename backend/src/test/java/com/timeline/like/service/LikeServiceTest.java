package com.timeline.like.service;

import com.timeline.like.dto.LikeResponse;
import com.timeline.like.repository.LikeMapper;
import com.timeline.model.Post;
import com.timeline.post.repository.PostMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LikeServiceTest {

    @Mock LikeMapper likeMapper;
    @Mock PostMapper postMapper;
    @InjectMocks LikeService likeService;

    private Post testPost;

    @BeforeEach
    void setUp() {
        testPost = new Post();
        testPost.setId(10L);
        testPost.setUserId(1L);
        testPost.setContent("テスト投稿");
    }

    // ─── addLike ─────────────────────────────────────────────────

    @Test
    void addLike_初回いいね_likeCountが増加してtrueを返す() {
        when(postMapper.findById(10L)).thenReturn(testPost);
        when(likeMapper.insert(10L, 1L)).thenReturn(1);
        doNothing().when(postMapper).incrementLikeCount(10L);
        when(likeMapper.countByPostId(10L)).thenReturn(1L);
        when(likeMapper.existsByPostIdAndUserId(10L, 1L)).thenReturn(true);

        LikeResponse result = likeService.addLike(10L, 1L);

        assertThat(result.likeCount()).isEqualTo(1L);
        assertThat(result.likedByCurrentUser()).isTrue();
        verify(postMapper).incrementLikeCount(10L);
    }

    @Test
    void addLike_重複いいね_incrementLikeCountは呼ばれない() {
        when(postMapper.findById(10L)).thenReturn(testPost);
        when(likeMapper.insert(10L, 1L)).thenReturn(0); // 挿入されなかった（重複）
        when(likeMapper.countByPostId(10L)).thenReturn(1L);
        when(likeMapper.existsByPostIdAndUserId(10L, 1L)).thenReturn(true);

        likeService.addLike(10L, 1L);

        verify(postMapper, never()).incrementLikeCount(anyLong());
    }

    @Test
    void addLike_存在しない投稿_404例外() {
        when(postMapper.findById(99L)).thenReturn(null);

        assertThatThrownBy(() -> likeService.addLike(99L, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("投稿が見つかりません");

        verify(likeMapper, never()).insert(anyLong(), anyLong());
    }

    // ─── removeLike ──────────────────────────────────────────────

    @Test
    void removeLike_いいね解除_likeCountが減少してfalseを返す() {
        when(postMapper.findById(10L)).thenReturn(testPost);
        when(likeMapper.delete(10L, 1L)).thenReturn(1);
        doNothing().when(postMapper).decrementLikeCount(10L);
        when(likeMapper.countByPostId(10L)).thenReturn(0L);
        when(likeMapper.existsByPostIdAndUserId(10L, 1L)).thenReturn(false);

        LikeResponse result = likeService.removeLike(10L, 1L);

        assertThat(result.likeCount()).isEqualTo(0L);
        assertThat(result.likedByCurrentUser()).isFalse();
        verify(postMapper).decrementLikeCount(10L);
    }

    @Test
    void removeLike_いいねしていない投稿_decrementLikeCountは呼ばれない() {
        when(postMapper.findById(10L)).thenReturn(testPost);
        when(likeMapper.delete(10L, 1L)).thenReturn(0); // 削除対象なし
        when(likeMapper.countByPostId(10L)).thenReturn(0L);
        when(likeMapper.existsByPostIdAndUserId(10L, 1L)).thenReturn(false);

        likeService.removeLike(10L, 1L);

        verify(postMapper, never()).decrementLikeCount(anyLong());
    }

    @Test
    void removeLike_存在しない投稿_404例外() {
        when(postMapper.findById(99L)).thenReturn(null);

        assertThatThrownBy(() -> likeService.removeLike(99L, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("投稿が見つかりません");

        verify(likeMapper, never()).delete(anyLong(), anyLong());
    }
}
