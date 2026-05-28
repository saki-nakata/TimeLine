package com.timeline.comment.repository;

import com.timeline.comment.dto.CommentResponse;
import com.timeline.model.Comment;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class CommentMapperTest {

    @Autowired
    CommentMapper commentMapper;

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
        testUser.setDisplayName("Alice");
        userMapper.insert(testUser);

        OffsetDateTime now = OffsetDateTime.now();
        testPost = new Post();
        testPost.setUserId(testUser.getId());
        testPost.setContent("テスト投稿");
        testPost.setCreatedAt(now);
        testPost.setUpdatedAt(now);
        postMapper.insert(testPost);
    }

    private Comment insertComment(String content) {
        OffsetDateTime now = OffsetDateTime.now();
        Comment comment = new Comment();
        comment.setPostId(testPost.getId());
        comment.setUserId(testUser.getId());
        comment.setContent(content);
        comment.setCreatedAt(now);
        comment.setUpdatedAt(now);
        commentMapper.insert(comment);
        return comment;
    }

    // ─── insert / findById ────────────────────────────────────────

    @Test
    void insert_コメント_IDが採番される() {
        Comment comment = insertComment("テストコメント");

        assertThat(comment.getId()).isNotNull();
    }

    @Test
    void findById_存在するID_Commentが返る() {
        Comment comment = insertComment("テストコメント");

        Comment result = commentMapper.findById(comment.getId());

        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEqualTo("テストコメント");
        assertThat(result.getPostId()).isEqualTo(testPost.getId());
    }

    @Test
    void findById_存在しないID_nullが返る() {
        assertThat(commentMapper.findById(9999L)).isNull();
    }

    // ─── findByPostId ─────────────────────────────────────────────

    @Test
    void findByPostId_コメントなし_空リストが返る() {
        List<CommentResponse> results = commentMapper.findByPostId(testPost.getId());

        assertThat(results).isEmpty();
    }

    @Test
    void findByPostId_複数コメント_投稿IDに一致するものが昇順で返る() {
        insertComment("コメント1");
        insertComment("コメント2");

        List<CommentResponse> results = commentMapper.findByPostId(testPost.getId());

        assertThat(results).hasSize(2);
        assertThat(results.get(0).getContent()).isEqualTo("コメント1");
        assertThat(results.get(0).getUsername()).isEqualTo("alice");
    }

    // ─── delete ───────────────────────────────────────────────────

    @Test
    void delete_コメントを削除_findByIdがnullを返す() {
        Comment comment = insertComment("削除対象");

        commentMapper.delete(comment.getId());

        assertThat(commentMapper.findById(comment.getId())).isNull();
    }
}
