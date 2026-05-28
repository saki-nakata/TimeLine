package com.timeline.follow.service;

import com.timeline.follow.dto.FollowResponse;
import com.timeline.follow.repository.FollowMapper;
import com.timeline.model.User;
import com.timeline.user.dto.UserProfileResponse;
import com.timeline.user.repository.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FollowServiceTest {

    @Mock FollowMapper followMapper;
    @Mock UserMapper userMapper;
    @InjectMocks FollowService followService;

    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        alice = new User();
        alice.setId(1L);
        alice.setUsername("alice");
        alice.setFollowerCount(0L);
        alice.setFollowingCount(0L);

        bob = new User();
        bob.setId(2L);
        bob.setUsername("bob");
        bob.setFollowerCount(0L);
        bob.setFollowingCount(0L);
    }

    // ─── follow ───────────────────────────────────────────────────

    @Test
    void follow_正常フォロー_FollowResponseが返る() {
        when(userMapper.findById(2L)).thenReturn(bob).thenReturn(bob);
        when(userMapper.findById(1L)).thenReturn(alice);
        when(followMapper.exists(1L, 2L)).thenReturn(false);

        FollowResponse result = followService.follow(1L, 2L);

        assertThat(result.following()).isTrue();
        verify(followMapper).insert(1L, 2L);
        verify(userMapper).incrementFollowingCount(1L);
        verify(userMapper).incrementFollowerCount(2L);
    }

    @Test
    void follow_すでにフォロー済み_insertは呼ばれない() {
        when(userMapper.findById(2L)).thenReturn(bob).thenReturn(bob);
        when(userMapper.findById(1L)).thenReturn(alice);
        when(followMapper.exists(1L, 2L)).thenReturn(true);

        followService.follow(1L, 2L);

        verify(followMapper, never()).insert(anyLong(), anyLong());
        verify(userMapper, never()).incrementFollowingCount(anyLong());
    }

    @Test
    void follow_selfFollow_400例外() {
        assertThatThrownBy(() -> followService.follow(1L, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("自分自身はフォローできません");

        verify(followMapper, never()).insert(anyLong(), anyLong());
    }

    @Test
    void follow_対象ユーザーが存在しない_404例外() {
        when(userMapper.findById(99L)).thenReturn(null);

        assertThatThrownBy(() -> followService.follow(1L, 99L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("ユーザーが見つかりません");
    }

    // ─── unfollow ─────────────────────────────────────────────────

    @Test
    void unfollow_正常解除_followingがfalse() {
        when(userMapper.findById(2L)).thenReturn(bob).thenReturn(bob);
        when(userMapper.findById(1L)).thenReturn(alice);
        when(followMapper.exists(1L, 2L)).thenReturn(true);

        FollowResponse result = followService.unfollow(1L, 2L);

        assertThat(result.following()).isFalse();
        verify(followMapper).delete(1L, 2L);
        verify(userMapper).decrementFollowingCount(1L);
        verify(userMapper).decrementFollowerCount(2L);
    }

    @Test
    void unfollow_フォローしていない_deleteは呼ばれない() {
        when(userMapper.findById(2L)).thenReturn(bob).thenReturn(bob);
        when(userMapper.findById(1L)).thenReturn(alice);
        when(followMapper.exists(1L, 2L)).thenReturn(false);

        followService.unfollow(1L, 2L);

        verify(followMapper, never()).delete(anyLong(), anyLong());
    }

    @Test
    void unfollow_対象ユーザーが存在しない_404例外() {
        when(userMapper.findById(99L)).thenReturn(null);

        assertThatThrownBy(() -> followService.unfollow(1L, 99L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("ユーザーが見つかりません");
    }

    // ─── getFollowing ─────────────────────────────────────────────

    @Test
    void getFollowing_フォロー中ユーザーあり_リストが返る() {
        UserProfileResponse profile = new UserProfileResponse();
        profile.setUsername("bob");
        when(followMapper.findFollowing(1L, 1L)).thenReturn(List.of(profile));

        List<UserProfileResponse> results = followService.getFollowing(1L, 1L);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getUsername()).isEqualTo("bob");
    }

    @Test
    void getFollowing_フォローなし_空リストが返る() {
        when(followMapper.findFollowing(1L, 1L)).thenReturn(List.of());

        List<UserProfileResponse> results = followService.getFollowing(1L, 1L);

        assertThat(results).isEmpty();
    }
}
