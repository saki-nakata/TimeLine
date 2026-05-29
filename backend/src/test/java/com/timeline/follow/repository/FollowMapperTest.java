package com.timeline.follow.repository;

import com.timeline.model.User;
import com.timeline.user.dto.UserProfileResponse;
import com.timeline.user.repository.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class FollowMapperTest {

    @Autowired
    FollowMapper followMapper;

    @Autowired
    UserMapper userMapper;

    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        alice = new User();
        alice.setUsername("alice");
        alice.setEmail("alice@example.com");
        alice.setPasswordHash("hashed");
        userMapper.insert(alice);

        bob = new User();
        bob.setUsername("bob");
        bob.setEmail("bob@example.com");
        bob.setPasswordHash("hashed");
        userMapper.insert(bob);
    }

    // ─── insert / exists ──────────────────────────────────────────

    @Test
    void insert_フォロー_existsがtrueを返す() {
        followMapper.insert(alice.getId(), bob.getId());

        assertThat(followMapper.exists(alice.getId(), bob.getId())).isTrue();
    }

    @Test
    void exists_フォローしていない_falseが返る() {
        assertThat(followMapper.exists(alice.getId(), bob.getId())).isFalse();
    }

    // ─── delete ───────────────────────────────────────────────────

    @Test
    void delete_フォロー解除_existsがfalseを返す() {
        followMapper.insert(alice.getId(), bob.getId());

        followMapper.delete(alice.getId(), bob.getId());

        assertThat(followMapper.exists(alice.getId(), bob.getId())).isFalse();
    }

    // ─── findFollowing ────────────────────────────────────────────

    @Test
    void findFollowing_フォローなし_空リストが返る() {
        List<UserProfileResponse> results = followMapper.findFollowing(alice.getId(), alice.getId());

        assertThat(results).isEmpty();
    }

    @Test
    void findFollowing_フォローあり_フォロー中ユーザーが返る() {
        followMapper.insert(alice.getId(), bob.getId());

        List<UserProfileResponse> results = followMapper.findFollowing(alice.getId(), alice.getId());

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getUsername()).isEqualTo("bob");
    }

    @Test
    void findFollowing_currentUserId指定_followedByCurrentUserが正しく返る() {
        followMapper.insert(alice.getId(), bob.getId());

        List<UserProfileResponse> resultsAsAlice = followMapper.findFollowing(alice.getId(), alice.getId());
        List<UserProfileResponse> resultsAsCharlie = followMapper.findFollowing(alice.getId(), bob.getId());

        assertThat(resultsAsAlice.get(0).isFollowedByCurrentUser()).isTrue();
        assertThat(resultsAsCharlie.get(0).isFollowedByCurrentUser()).isFalse();
    }
}
