package com.timeline.like.repository;

import com.timeline.model.Post;
import com.timeline.model.User;
import com.timeline.post.repository.PostMapper;
import com.timeline.user.repository.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class LikeMapperTest {

    @Autowired
    LikeMapper likeMapper;

    @Autowired
    PostMapper postMapper;

    @Autowired
    UserMapper userMapper;

    private User testUser;
    private Post testPost;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUsername("alice");
        testUser.setEmail("alice@example.com");
        testUser.setPasswordHash("hashed");
        userMapper.insert(testUser);

        OffsetDateTime now = OffsetDateTime.now();
        testPost = new Post();
        testPost.setUserId(testUser.getId());
        testPost.setContent("テスト投稿");
        testPost.setCreatedAt(now);
        testPost.setUpdatedAt(now);
        postMapper.insert(testPost);
    }

    // ─── insert ───────────────────────────────────────────────────

    @Test
    void insert_初回いいね_1が返る() {
        int result = likeMapper.insert(testPost.getId(), testUser.getId());

        assertThat(result).isEqualTo(1);
    }

    @Test
    void insert_重複いいね_0が返る() {
        likeMapper.insert(testPost.getId(), testUser.getId());

        int result = likeMapper.insert(testPost.getId(), testUser.getId());

        assertThat(result).isEqualTo(0);
    }

    // ─── delete ───────────────────────────────────────────────────

    @Test
    void delete_いいね済み_1が返る() {
        likeMapper.insert(testPost.getId(), testUser.getId());

        int result = likeMapper.delete(testPost.getId(), testUser.getId());

        assertThat(result).isEqualTo(1);
    }

    @Test
    void delete_いいねしていない_0が返る() {
        int result = likeMapper.delete(testPost.getId(), testUser.getId());

        assertThat(result).isEqualTo(0);
    }

    // ─── countByPostId ────────────────────────────────────────────

    @Test
    void countByPostId_いいね0件_0が返る() {
        assertThat(likeMapper.countByPostId(testPost.getId())).isEqualTo(0L);
    }

    @Test
    void countByPostId_いいね1件_1が返る() {
        likeMapper.insert(testPost.getId(), testUser.getId());

        assertThat(likeMapper.countByPostId(testPost.getId())).isEqualTo(1L);
    }

    // ─── existsByPostIdAndUserId ──────────────────────────────────

    @Test
    void existsByPostIdAndUserId_いいねあり_trueが返る() {
        likeMapper.insert(testPost.getId(), testUser.getId());

        assertThat(likeMapper.existsByPostIdAndUserId(testPost.getId(), testUser.getId())).isTrue();
    }

    @Test
    void existsByPostIdAndUserId_いいねなし_falseが返る() {
        assertThat(likeMapper.existsByPostIdAndUserId(testPost.getId(), testUser.getId())).isFalse();
    }
}
