package com.timeline.user.service;

import com.timeline.model.User;
import com.timeline.user.dto.UpdateProfileRequest;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserMapper userMapper;
    @InjectMocks UserService userService;

    private User testUser;
    private UserProfileResponse testProfile;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("alice");
        testUser.setEmail("alice@example.com");
        testUser.setDisplayName("Alice");

        testProfile = new UserProfileResponse();
        testProfile.setId(1L);
        testProfile.setUsername("alice");
        testProfile.setDisplayName("Alice");
        testProfile.setFollowerCount(0L);
        testProfile.setFollowingCount(0L);
    }

    // ─── getProfile ───────────────────────────────────────────────

    @Test
    void getProfile_存在するユーザー_UserProfileResponseが返る() {
        when(userMapper.findProfileById(1L, 2L)).thenReturn(testProfile);

        UserProfileResponse result = userService.getProfile(1L, 2L);

        assertThat(result.getUsername()).isEqualTo("alice");
    }

    @Test
    void getProfile_自分自身を参照_followedByCurrentUserがfalse() {
        testProfile.setFollowedByCurrentUser(false);
        when(userMapper.findProfileById(1L, 1L)).thenReturn(testProfile);

        UserProfileResponse result = userService.getProfile(1L, 1L);

        assertThat(result.isFollowedByCurrentUser()).isFalse();
    }

    @Test
    void getProfile_存在しないユーザー_404例外() {
        when(userMapper.findProfileById(99L, 1L)).thenReturn(null);

        assertThatThrownBy(() -> userService.getProfile(99L, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("ユーザーが見つかりません");
    }

    // ─── updateProfile ────────────────────────────────────────────

    @Test
    void updateProfile_正常更新_UserProfileResponseが返る() {
        when(userMapper.findById(1L)).thenReturn(testUser);
        when(userMapper.findByUsernameExcludingId("newname", 1L)).thenReturn(null);
        when(userMapper.findProfileById(1L, 1L)).thenReturn(testProfile);

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setUsername("newname");
        req.setDisplayName("New Name");

        UserProfileResponse result = userService.updateProfile(1L, req);

        assertThat(result).isNotNull();
        verify(userMapper).update(any(User.class));
    }

    @Test
    void updateProfile_username重複_409例外() {
        User other = new User();
        other.setId(2L);
        other.setUsername("taken");

        when(userMapper.findById(1L)).thenReturn(testUser);
        when(userMapper.findByUsernameExcludingId("taken", 1L)).thenReturn(other);

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setUsername("taken");

        assertThatThrownBy(() -> userService.updateProfile(1L, req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("このユーザー名は既に使用されています");

        verify(userMapper, never()).update(any());
    }

    @Test
    void updateProfile_自分のusernameはそのまま通る() {
        when(userMapper.findById(1L)).thenReturn(testUser);
        when(userMapper.findByUsernameExcludingId("alice", 1L)).thenReturn(null);
        when(userMapper.findProfileById(1L, 1L)).thenReturn(testProfile);

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setUsername("alice");

        userService.updateProfile(1L, req);

        verify(userMapper).update(any(User.class));
    }

    @Test
    void updateProfile_存在しないユーザー_404例外() {
        when(userMapper.findById(99L)).thenReturn(null);

        assertThatThrownBy(() -> userService.updateProfile(99L, new UpdateProfileRequest()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("ユーザーが見つかりません");
    }

    // ─── searchUsers ──────────────────────────────────────────────

    @Test
    void searchUsers_ヒットあり_リストが返る() {
        when(userMapper.searchUsers(eq("ali"), eq(2L), eq(20))).thenReturn(List.of(testProfile));

        List<UserProfileResponse> results = userService.searchUsers("ali", 2L);

        assertThat(results).hasSize(1);
    }

    @Test
    void searchUsers_ヒットなし_空リストが返る() {
        when(userMapper.searchUsers(eq("xyz"), eq(1L), eq(20))).thenReturn(List.of());

        List<UserProfileResponse> results = userService.searchUsers("xyz", 1L);

        assertThat(results).isEmpty();
    }

    @Test
    void searchUsers_空クエリ_400例外() {
        assertThatThrownBy(() -> userService.searchUsers("  ", 1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("検索キーワードを入力してください");

        verify(userMapper, never()).searchUsers(any(), any(), anyInt());
    }

    // ─── updateAvatar ─────────────────────────────────────────────

    @Test
    void updateAvatar_正常更新_UserProfileResponseが返る() {
        when(userMapper.findById(1L)).thenReturn(testUser);
        when(userMapper.findProfileById(1L, 1L)).thenReturn(testProfile);

        UserProfileResponse result = userService.updateAvatar(1L, "https://s3.example.com/avatar.jpg");

        assertThat(result).isNotNull();
        verify(userMapper).update(any(User.class));
    }

    @Test
    void updateAvatar_存在しないユーザー_404例外() {
        when(userMapper.findById(99L)).thenReturn(null);

        assertThatThrownBy(() -> userService.updateAvatar(99L, "https://s3.example.com/avatar.jpg"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("ユーザーが見つかりません");
    }
}
