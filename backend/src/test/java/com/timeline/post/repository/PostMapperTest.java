package com.timeline.post.repository;

import com.timeline.model.Post;
import com.timeline.model.User;
import com.timeline.post.dto.PostResponse;
import com.timeline.user.repository.UserMapper;
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
class PostMapperTest {

    @Autowired
    PostMapper postMapper;

    @Autowired
    UserMapper userMapper;

    private User testUser;
    private Post post1;
    private Post post2;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUsername("alice");
        testUser.setEmail("alice@example.com");
        testUser.setPasswordHash("hashed");
        userMapper.insert(testUser);

        OffsetDateTime now = OffsetDateTime.now();

        post1 = new Post();
        post1.setUserId(testUser.getId());
        post1.setContent("投稿1");
        post1.setCreatedAt(now.minusMinutes(2));
        post1.setUpdatedAt(now.minusMinutes(2));
        postMapper.insert(post1);

        post2 = new Post();
        post2.setUserId(testUser.getId());
        post2.setContent("投稿2");
        post2.setCreatedAt(now.minusMinutes(1));
        post2.setUpdatedAt(now.minusMinutes(1));
        postMapper.insert(post2);
    }

    // ─── insert / findById ────────────────────────────────────────

    @Test
    void insert_投稿_IDが採番される() {
        assertThat(post1.getId()).isNotNull();
        assertThat(post2.getId()).isNotNull();
        assertThat(post1.getId()).isNotEqualTo(post2.getId());
    }

    @Test
    void findById_存在するID_Postが返る() {
        Post result = postMapper.findById(post1.getId());

        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEqualTo("投稿1");
        assertThat(result.getUserId()).isEqualTo(testUser.getId());
    }

    @Test
    void findById_存在しないID_nullが返る() {
        assertThat(postMapper.findById(9999L)).isNull();
    }

    // ─── findPostById ─────────────────────────────────────────────

    @Test
    void findPostById_存在する投稿_likeCountとusernameを含むPostResponseが返る() {
        PostResponse result = postMapper.findPostById(post1.getId(), testUser.getId());

        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEqualTo("投稿1");
        assertThat(result.getUsername()).isEqualTo("alice");
        assertThat(result.getLikeCount()).isEqualTo(0L);
        assertThat(result.isLikedByCurrentUser()).isFalse();
    }

    @Test
    void findPostById_存在しないID_nullが返る() {
        assertThat(postMapper.findPostById(9999L, testUser.getId())).isNull();
    }

    // ─── findTimeline ─────────────────────────────────────────────

    @Test
    void findTimeline_cursorなし_最新から降順で返る() {
        List<PostResponse> results = postMapper.findTimeline(null, 10, testUser.getId());

        assertThat(results).hasSize(2);
        assertThat(results.get(0).getId()).isGreaterThan(results.get(1).getId());
    }

    @Test
    void findTimeline_cursor指定_cursor未満のIDの投稿のみ返る() {
        List<PostResponse> results = postMapper.findTimeline(post2.getId(), 10, testUser.getId());

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getId()).isEqualTo(post1.getId());
    }

    @Test
    void findTimeline_投稿なし_空リストが返る() {
        postMapper.delete(post1.getId());
        postMapper.delete(post2.getId());

        List<PostResponse> results = postMapper.findTimeline(null, 10, testUser.getId());

        assertThat(results).isEmpty();
    }

    // ─── findFollowingTimeline ────────────────────────────────────

    @Test
    void findFollowingTimeline_フォローしていない_空リストが返る() {
        User otherUser = new User();
        otherUser.setUsername("charlie");
        otherUser.setEmail("charlie@example.com");
        otherUser.setPasswordHash("hashed");
        userMapper.insert(otherUser);

        List<PostResponse> results = postMapper.findFollowingTimeline(null, 10, otherUser.getId());

        assertThat(results).isEmpty();
    }

    // ─── findPostsByUserId ────────────────────────────────────────

    @Test
    void findPostsByUserId_ユーザーの投稿一覧_返る() {
        List<PostResponse> results = postMapper.findPostsByUserId(testUser.getId(), null, 10, testUser.getId());

        assertThat(results).hasSize(2);
    }

    @Test
    void findPostsByUserId_cursor指定_cursor未満の投稿のみ返る() {
        List<PostResponse> results = postMapper.findPostsByUserId(testUser.getId(), post2.getId(), 10, testUser.getId());

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getId()).isEqualTo(post1.getId());
    }

    // ─── update / delete ──────────────────────────────────────────

    @Test
    void update_内容を変更_変更が反映される() {
        post1.setContent("更新後の内容");
        post1.setUpdatedAt(OffsetDateTime.now());
        postMapper.update(post1);

        Post updated = postMapper.findById(post1.getId());
        assertThat(updated.getContent()).isEqualTo("更新後の内容");
    }

    @Test
    void delete_投稿を削除_findByIdがnullを返す() {
        postMapper.delete(post1.getId());

        assertThat(postMapper.findById(post1.getId())).isNull();
    }

    // ─── カウンター操作 ──────────────────────────────────────────

    @Test
    void incrementLikeCount_likeCountが1増える() {
        postMapper.incrementLikeCount(post1.getId());

        Post updated = postMapper.findById(post1.getId());
        assertThat(updated.getLikeCount()).isEqualTo(1L);
    }

    @Test
    void decrementLikeCount_0以下にはならない() {
        postMapper.decrementLikeCount(post1.getId());

        Post updated = postMapper.findById(post1.getId());
        assertThat(updated.getLikeCount()).isEqualTo(0L);
    }

    @Test
    void incrementCommentCount_commentCountが1増える() {
        postMapper.incrementCommentCount(post1.getId());

        Post updated = postMapper.findById(post1.getId());
        assertThat(updated.getCommentCount()).isEqualTo(1L);
    }

    @Test
    void decrementCommentCount_0以下にはならない() {
        postMapper.decrementCommentCount(post1.getId());

        Post updated = postMapper.findById(post1.getId());
        assertThat(updated.getCommentCount()).isEqualTo(0L);
    }
}
