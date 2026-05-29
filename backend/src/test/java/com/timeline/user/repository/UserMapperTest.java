package com.timeline.user.repository;

import com.timeline.model.User;
import com.timeline.user.dto.UserProfileResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class UserMapperTest {

    @Autowired
    UserMapper userMapper;

    private User user1;
    private User user2;

    @BeforeEach
    void setUp() {
        user1 = new User();
        user1.setUsername("alice");
        user1.setEmail("alice@example.com");
        user1.setPasswordHash("hashed1");
        user1.setDisplayName("Alice");
        userMapper.insert(user1);

        user2 = new User();
        user2.setUsername("bob");
        user2.setEmail("bob@example.com");
        user2.setPasswordHash("hashed2");
        user2.setDisplayName("Bob");
        userMapper.insert(user2);
    }

    // ─── findByEmail ─────────────────────────────────────────────

    @Test
    void findByEmail_存在するメール_Userが返る() {
        User result = userMapper.findByEmail("alice@example.com");

        assertThat(result).isNotNull();
        assertThat(result.getUsername()).isEqualTo("alice");
    }

    @Test
    void findByEmail_存在しないメール_nullが返る() {
        User result = userMapper.findByEmail("notfound@example.com");

        assertThat(result).isNull();
    }

    // ─── findByUsername ───────────────────────────────────────────

    @Test
    void findByUsername_存在するユーザー名_Userが返る() {
        User result = userMapper.findByUsername("alice");

        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo("alice@example.com");
    }

    @Test
    void findByUsername_存在しないユーザー名_nullが返る() {
        assertThat(userMapper.findByUsername("unknown")).isNull();
    }

    // ─── findById ────────────────────────────────────────────────

    @Test
    void findById_存在するID_Userが返る() {
        User result = userMapper.findById(user1.getId());

        assertThat(result).isNotNull();
        assertThat(result.getUsername()).isEqualTo("alice");
    }

    @Test
    void findById_存在しないID_nullが返る() {
        assertThat(userMapper.findById(9999L)).isNull();
    }

    // ─── insert / update ─────────────────────────────────────────

    @Test
    void insert_新規ユーザー_IDが採番される() {
        assertThat(user1.getId()).isNotNull();
        assertThat(user2.getId()).isNotNull();
        assertThat(user1.getId()).isNotEqualTo(user2.getId());
    }

    @Test
    void update_ユーザー情報を更新_変更が反映される() {
        user1.setDisplayName("Alice Updated");
        user1.setBio("New bio");
        user1.setUpdatedAt(OffsetDateTime.now());
        userMapper.update(user1);

        User updated = userMapper.findById(user1.getId());
        assertThat(updated.getDisplayName()).isEqualTo("Alice Updated");
        assertThat(updated.getBio()).isEqualTo("New bio");
    }

    // ─── findByUsernameExcludingId ────────────────────────────────

    @Test
    void findByUsernameExcludingId_他ユーザーが同名_Userが返る() {
        User result = userMapper.findByUsernameExcludingId("alice", user2.getId());

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(user1.getId());
    }

    @Test
    void findByUsernameExcludingId_自分のユーザー名を除外_nullが返る() {
        User result = userMapper.findByUsernameExcludingId("alice", user1.getId());

        assertThat(result).isNull();
    }

    // ─── incrementFollowerCount / decrementFollowerCount ─────────

    @Test
    void incrementFollowerCount_カウントが1増える() {
        userMapper.incrementFollowerCount(user1.getId());

        User updated = userMapper.findById(user1.getId());
        assertThat(updated.getFollowerCount()).isEqualTo(1L);
    }

    @Test
    void decrementFollowerCount_0以下にはならない() {
        userMapper.decrementFollowerCount(user1.getId());

        User updated = userMapper.findById(user1.getId());
        assertThat(updated.getFollowerCount()).isEqualTo(0L);
    }

    // ─── searchUsers ─────────────────────────────────────────────

    @Test
    void searchUsers_部分一致_該当ユーザーが返る() {
        List<UserProfileResponse> results = userMapper.searchUsers("ali", user2.getId(), 20);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getUsername()).isEqualTo("alice");
    }

    @Test
    void searchUsers_一致なし_空リストが返る() {
        List<UserProfileResponse> results = userMapper.searchUsers("xyz", user1.getId(), 20);

        assertThat(results).isEmpty();
    }

    @Test
    void searchUsers_limit指定_件数が制限される() {
        for (int i = 0; i < 5; i++) {
            User u = new User();
            u.setUsername("testuser" + i);
            u.setEmail("testuser" + i + "@example.com");
            u.setPasswordHash("hash");
            userMapper.insert(u);
        }

        List<UserProfileResponse> results = userMapper.searchUsers("testuser", user1.getId(), 3);

        assertThat(results).hasSize(3);
    }
}
