package com.timeline.post.service;

import com.timeline.common.storage.S3StorageService;
import com.timeline.model.Post;
import com.timeline.model.User;
import com.timeline.post.dto.PostResponse;
import com.timeline.post.dto.TimelineResponse;
import com.timeline.post.repository.PostMapper;
import com.timeline.user.repository.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock PostMapper postMapper;
    @Mock UserMapper userMapper;
    @Mock SimpMessagingTemplate messagingTemplate;
    @Mock S3StorageService s3StorageService;
    @InjectMocks PostService postService;

    private User testUser;
    private Post testPost;
    private PostResponse testPostResponse;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setDisplayName("Test User");

        testPost = new Post();
        testPost.setId(10L);
        testPost.setUserId(1L);
        testPost.setContent("テスト投稿");
        testPost.setCreatedAt(OffsetDateTime.now());
        testPost.setUpdatedAt(OffsetDateTime.now());

        testPostResponse = new PostResponse();
        testPostResponse.setId(10L);
        testPostResponse.setUserId(1L);
        testPostResponse.setContent("テスト投稿");
        testPostResponse.setUsername("testuser");
    }

    // ─── getPost ────────────────────────────────────────────────

    @Test
    void getPost_存在する投稿ID_PostResponseを返す() {
        when(postMapper.findPostById(10L, 1L)).thenReturn(testPostResponse);

        PostResponse result = postService.getPost(10L, 1L);

        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.getContent()).isEqualTo("テスト投稿");
    }

    @Test
    void getPost_存在しない投稿ID_404例外() {
        when(postMapper.findPostById(99L, 1L)).thenReturn(null);

        assertThatThrownBy(() -> postService.getPost(99L, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("投稿が見つかりません");
    }

    // ─── createPost ─────────────────────────────────────────────

    @Test
    void createPost_テキストのみ_PostResponseが返る() {
        when(userMapper.findById(1L)).thenReturn(testUser);
        doNothing().when(postMapper).insert(any(Post.class));

        PostResponse result = postService.createPost(1L, "Hello World", null);

        assertThat(result.getContent()).isEqualTo("Hello World");
        assertThat(result.getUsername()).isEqualTo("testuser");
        verify(postMapper).insert(any(Post.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/posts"), any(PostResponse.class));
    }

    @Test
    void createPost_画像のみ_imageUrl付きPostResponseが返る() {
        MultipartFile image = mock(MultipartFile.class);
        when(image.isEmpty()).thenReturn(false);
        when(s3StorageService.storePostImage(image)).thenReturn("https://s3.example.com/img.jpg");
        when(userMapper.findById(1L)).thenReturn(testUser);
        doNothing().when(postMapper).insert(any(Post.class));

        PostResponse result = postService.createPost(1L, null, image);

        assertThat(result.getImageUrl()).isEqualTo("https://s3.example.com/img.jpg");
        assertThat(result.getContent()).isNull();
    }

    @Test
    void createPost_テキストも画像もnull_400例外() {
        assertThatThrownBy(() -> postService.createPost(1L, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("テキストまたは画像が必要です");

        verify(postMapper, never()).insert(any());
    }

    @Test
    void createPost_空白のみのテキスト_400例外() {
        assertThatThrownBy(() -> postService.createPost(1L, "   ", null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("テキストまたは画像が必要です");
    }

    @Test
    void createPost_281文字のテキスト_400例外() {
        String longContent = "a".repeat(281);

        assertThatThrownBy(() -> postService.createPost(1L, longContent, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("280文字以内");
    }

    @Test
    void createPost_ちょうど280文字_正常に作成される() {
        String maxContent = "a".repeat(280);
        when(userMapper.findById(1L)).thenReturn(testUser);
        doNothing().when(postMapper).insert(any(Post.class));

        PostResponse result = postService.createPost(1L, maxContent, null);

        assertThat(result.getContent()).isEqualTo(maxContent);
    }

    // ─── updatePost ─────────────────────────────────────────────

    @Test
    void updatePost_オーナーがテキスト更新_正常に更新される() {
        when(postMapper.findById(10L)).thenReturn(testPost);
        when(userMapper.findById(1L)).thenReturn(testUser);
        doNothing().when(postMapper).update(any(Post.class));

        PostResponse result = postService.updatePost(10L, 1L, "更新後テキスト", null, false);

        assertThat(result.getContent()).isEqualTo("更新後テキスト");
        verify(postMapper).update(any(Post.class));
    }

    @Test
    void updatePost_他ユーザーが更新_403例外() {
        when(postMapper.findById(10L)).thenReturn(testPost);

        assertThatThrownBy(() -> postService.updatePost(10L, 2L, "更新内容", null, false))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("権限がありません");

        verify(postMapper, never()).update(any());
    }

    @Test
    void updatePost_存在しない投稿_404例外() {
        when(postMapper.findById(99L)).thenReturn(null);

        assertThatThrownBy(() -> postService.updatePost(99L, 1L, "内容", null, false))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("投稿が見つかりません");
    }

    @Test
    void updatePost_画像削除フラグあり_S3のdeleteが呼ばれる() {
        testPost.setImageUrl("https://s3.example.com/old.jpg");
        when(postMapper.findById(10L)).thenReturn(testPost);
        when(userMapper.findById(1L)).thenReturn(testUser);
        doNothing().when(postMapper).update(any(Post.class));

        postService.updatePost(10L, 1L, "テキスト", null, true);

        verify(s3StorageService).deleteFile("https://s3.example.com/old.jpg");
    }

    // ─── deletePost ─────────────────────────────────────────────

    @Test
    void deletePost_オーナーが削除_postMapper_deleteが呼ばれる() {
        when(postMapper.findById(10L)).thenReturn(testPost);
        doNothing().when(postMapper).delete(10L);

        postService.deletePost(10L, 1L);

        verify(postMapper).delete(10L);
    }

    @Test
    void deletePost_他ユーザーが削除_403例外() {
        when(postMapper.findById(10L)).thenReturn(testPost);

        assertThatThrownBy(() -> postService.deletePost(10L, 2L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("権限がありません");

        verify(postMapper, never()).delete(anyLong());
    }

    @Test
    void deletePost_存在しない投稿_404例外() {
        when(postMapper.findById(99L)).thenReturn(null);

        assertThatThrownBy(() -> postService.deletePost(99L, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("投稿が見つかりません");
    }

    @Test
    void deletePost_imageUrlあり_S3のdeleteが呼ばれる() {
        testPost.setImageUrl("https://s3.example.com/img.jpg");
        when(postMapper.findById(10L)).thenReturn(testPost);
        doNothing().when(postMapper).delete(10L);

        postService.deletePost(10L, 1L);

        verify(s3StorageService).deleteFile("https://s3.example.com/img.jpg");
    }

    @Test
    void deletePost_imageUrlなし_S3のdeleteは呼ばれない() {
        testPost.setImageUrl(null);
        when(postMapper.findById(10L)).thenReturn(testPost);
        doNothing().when(postMapper).delete(10L);

        postService.deletePost(10L, 1L);

        verify(s3StorageService, never()).deleteFile(any());
    }

    // ─── getTimeline ─────────────────────────────────────────────

    @Test
    void getTimeline_limitが50超え_51件でクエリされる() {
        when(postMapper.findTimeline(null, 51, 1L)).thenReturn(List.of());

        postService.getTimeline(null, 100, 1L);

        verify(postMapper).findTimeline(null, 51, 1L);
    }

    @Test
    void getTimeline_hasMoreがtrue_nextCursorと切り詰めたリストを返す() {
        List<PostResponse> posts = List.of(
                makePostResponse(3L), makePostResponse(2L), makePostResponse(1L)
        );
        when(postMapper.findTimeline(null, 3, 1L)).thenReturn(posts);

        TimelineResponse result = postService.getTimeline(null, 2, 1L);

        assertThat(result.hasMore()).isTrue();
        assertThat(result.nextCursor()).isEqualTo(2L);
        assertThat(result.posts()).hasSize(2);
    }

    @Test
    void getTimeline_hasMoreがfalse_nextCursorはNull() {
        List<PostResponse> posts = List.of(makePostResponse(1L));
        when(postMapper.findTimeline(null, 3, 1L)).thenReturn(posts);

        TimelineResponse result = postService.getTimeline(null, 2, 1L);

        assertThat(result.hasMore()).isFalse();
        assertThat(result.nextCursor()).isNull();
        assertThat(result.posts()).hasSize(1);
    }

    // ─── getFollowingTimeline ─────────────────────────────────────

    @Test
    void getFollowingTimeline_正常_TimelineResponseが返る() {
        List<PostResponse> posts = List.of(makePostResponse(2L), makePostResponse(1L));
        when(postMapper.findFollowingTimeline(null, 3, 1L)).thenReturn(posts);

        TimelineResponse result = postService.getFollowingTimeline(null, 2, 1L);

        assertThat(result.posts()).hasSize(2);
        assertThat(result.hasMore()).isFalse();
    }

    @Test
    void getFollowingTimeline_フォローなし_空リストが返る() {
        when(postMapper.findFollowingTimeline(null, 3, 1L)).thenReturn(List.of());

        TimelineResponse result = postService.getFollowingTimeline(null, 2, 1L);

        assertThat(result.posts()).isEmpty();
        assertThat(result.hasMore()).isFalse();
    }

    // ─── getUserPosts ─────────────────────────────────────────────

    @Test
    void getUserPosts_cursor指定あり_cursorを渡してクエリされる() {
        when(postMapper.findPostsByUserId(2L, 5L, 3, 1L)).thenReturn(List.of());

        postService.getUserPosts(2L, 5L, 2, 1L);

        verify(postMapper).findPostsByUserId(2L, 5L, 3, 1L);
    }

    @Test
    void getUserPosts_hasMoreがtrue_nextCursorと切り詰めたリストを返す() {
        List<PostResponse> posts = List.of(
                makePostResponse(3L), makePostResponse(2L), makePostResponse(1L)
        );
        when(postMapper.findPostsByUserId(1L, null, 3, 1L)).thenReturn(posts);

        TimelineResponse result = postService.getUserPosts(1L, null, 2, 1L);

        assertThat(result.hasMore()).isTrue();
        assertThat(result.posts()).hasSize(2);
    }

    // ─── ヘルパー ────────────────────────────────────────────────

    private PostResponse makePostResponse(Long id) {
        PostResponse p = new PostResponse();
        p.setId(id);
        p.setContent("post " + id);
        return p;
    }
}
