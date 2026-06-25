package com.timeline.post.service;

import com.timeline.post.dto.PostResponse;
import com.timeline.post.dto.TimelineResponse;
import com.timeline.post.repository.HashtagMapper;
import com.timeline.post.repository.PostMapper;
import com.timeline.user.repository.UserMapper;
import com.timeline.common.storage.S3StorageService;
import com.timeline.model.Post;
import com.timeline.model.User;
import net.logstash.logback.argument.StructuredArguments;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PostService {

    private static final Logger LOG = LoggerFactory.getLogger(PostService.class);
    private static final Pattern HASHTAG_PATTERN = Pattern.compile("#([\\w\\u3040-\\u9fff]+)");

    private final PostMapper postMapper;
    private final HashtagMapper hashtagMapper;
    private final UserMapper userMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final S3StorageService s3StorageService;

    public PostService(PostMapper postMapper, HashtagMapper hashtagMapper, UserMapper userMapper,
                       SimpMessagingTemplate messagingTemplate, S3StorageService s3StorageService) {
        this.postMapper = postMapper;
        this.hashtagMapper = hashtagMapper;
        this.userMapper = userMapper;
        this.messagingTemplate = messagingTemplate;
        this.s3StorageService = s3StorageService;
    }

    public PostResponse getPost(Long id, Long currentUserId) {
        PostResponse post = postMapper.findPostById(id, currentUserId);
        if (post == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "投稿が見つかりません");
        }
        return post;
    }

    public TimelineResponse getTimeline(Long cursor, int limit, Long currentUserId) {
        int safeLimit = Math.min(limit, 50);
        List<PostResponse> posts = postMapper.findTimeline(cursor, safeLimit + 1, currentUserId);
        boolean hasMore = posts.size() > safeLimit;
        if (hasMore) {
            posts = posts.subList(0, safeLimit);
        }
        Long nextCursor = hasMore ? posts.get(posts.size() - 1).getId() : null;
        return new TimelineResponse(posts, nextCursor, hasMore);
    }

    @Transactional
    public PostResponse createPost(Long userId, String content, MultipartFile image) {
        boolean hasContent = content != null && !content.isBlank();
        boolean hasImage = image != null && !image.isEmpty();
        if (!hasContent && !hasImage) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "テキストまたは画像が必要です");
        }
        if (hasContent && content.length() > 280) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "投稿は280文字以内で入力してください");
        }
        OffsetDateTime now = OffsetDateTime.now();
        Post post = new Post();
        post.setUserId(userId);
        post.setContent(hasContent ? content : null);
        if (hasImage) {
            post.setImageUrl(s3StorageService.storePostImage(image));
        }
        post.setCreatedAt(now);
        post.setUpdatedAt(now);
        postMapper.insert(post);
        if (hasContent) {
            saveHashtags(post.getId(), content);
        }
        User author = userMapper.findById(userId);
        PostResponse response = PostResponse.from(post, author);
        messagingTemplate.convertAndSend("/topic/posts", response);
        LOG.info("Post created",
                StructuredArguments.kv("event", "post_created"),
                StructuredArguments.kv("postId", post.getId()),
                StructuredArguments.kv("hasImage", hasImage));
        return response;
    }

    @Transactional
    public PostResponse updatePost(Long postId, Long requesterId, String content, MultipartFile image, boolean removeImage) {
        Post post = postMapper.findById(postId);
        if (post == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "投稿が見つかりません");
        }
        if (!post.getUserId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "この投稿を編集する権限がありません");
        }
        boolean hasContent = content != null && !content.isBlank();
        boolean hasNewImage = image != null && !image.isEmpty();
        String currentImageUrl = post.getImageUrl();
        boolean willHaveImage = hasNewImage || (!removeImage && currentImageUrl != null);
        if (!hasContent && !willHaveImage) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "テキストまたは画像が必要です");
        }
        if (hasContent && content.length() > 280) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "投稿は280文字以内で入力してください");
        }
        if (hasNewImage) {
            if (currentImageUrl != null) {
                s3StorageService.deleteFile(currentImageUrl);
            }
            post.setImageUrl(s3StorageService.storePostImage(image));
        } else if (removeImage && currentImageUrl != null) {
            s3StorageService.deleteFile(currentImageUrl);
            post.setImageUrl(null);
        }
        post.setContent(hasContent ? content : null);
        post.setUpdatedAt(OffsetDateTime.now());
        postMapper.update(post);
        updateHashtags(post.getId(), hasContent ? content : null);
        LOG.info("Post updated",
                StructuredArguments.kv("event", "post_updated"),
                StructuredArguments.kv("postId", postId));
        User author = userMapper.findById(requesterId);
        return PostResponse.from(post, author);
    }

    public TimelineResponse getFollowingTimeline(Long cursor, int limit, Long currentUserId) {
        int safeLimit = Math.min(limit, 50);
        List<PostResponse> posts = postMapper.findFollowingTimeline(cursor, safeLimit + 1, currentUserId);
        boolean hasMore = posts.size() > safeLimit;
        if (hasMore) {
            posts = posts.subList(0, safeLimit);
        }
        Long nextCursor = hasMore ? posts.get(posts.size() - 1).getId() : null;
        return new TimelineResponse(posts, nextCursor, hasMore);
    }

    public TimelineResponse getUserPosts(Long userId, Long cursor, int limit, Long currentUserId) {
        int safeLimit = Math.min(limit, 50);
        List<PostResponse> posts = postMapper.findPostsByUserId(userId, cursor, safeLimit + 1, currentUserId);
        boolean hasMore = posts.size() > safeLimit;
        if (hasMore) {
            posts = posts.subList(0, safeLimit);
        }
        Long nextCursor = hasMore ? posts.get(posts.size() - 1).getId() : null;
        return new TimelineResponse(posts, nextCursor, hasMore);
    }

    public TimelineResponse searchPosts(String query, Long cursor, int limit, Long currentUserId) {
        if (query == null || query.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "検索キーワードを入力してください");
        }
        int safeLimit = Math.min(limit, 50);
        List<PostResponse> posts = postMapper.searchPosts(query.trim(), cursor, safeLimit + 1, currentUserId);
        boolean hasMore = posts.size() > safeLimit;
        if (hasMore) posts = posts.subList(0, safeLimit);
        Long nextCursor = hasMore ? posts.get(posts.size() - 1).getId() : null;
        return new TimelineResponse(posts, nextCursor, hasMore);
    }

    public TimelineResponse searchPostsByHashtag(String tag, Long cursor, int limit, Long currentUserId) {
        if (tag == null || tag.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ハッシュタグを入力してください");
        }
        int safeLimit = Math.min(limit, 50);
        List<PostResponse> posts = postMapper.findPostsByHashtag(tag.trim().toLowerCase(), cursor, safeLimit + 1, currentUserId);
        boolean hasMore = posts.size() > safeLimit;
        if (hasMore) posts = posts.subList(0, safeLimit);
        Long nextCursor = hasMore ? posts.get(posts.size() - 1).getId() : null;
        return new TimelineResponse(posts, nextCursor, hasMore);
    }

    @Transactional
    public void deletePost(Long postId, Long requesterId) {
        Post post = postMapper.findById(postId);
        if (post == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "投稿が見つかりません");
        }
        if (!post.getUserId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "この投稿を削除する権限がありません");
        }
        if (post.getImageUrl() != null) {
            s3StorageService.deleteFile(post.getImageUrl());
        }
        List<Long> hashtagIds = hashtagMapper.findHashtagIdsByPostId(postId);
        for (Long hashtagId : hashtagIds) {
            hashtagMapper.decrementPostCount(hashtagId);
        }
        hashtagMapper.deletePostHashtags(postId);
        postMapper.delete(postId);
        LOG.info("Post deleted",
                StructuredArguments.kv("event", "post_deleted"),
                StructuredArguments.kv("postId", postId));
    }

    private void saveHashtags(Long postId, String content) {
        Set<String> tags = extractHashtags(content);
        for (String tag : tags) {
            hashtagMapper.insertHashtag(tag);
            Long hashtagId = hashtagMapper.findIdByTag(tag);
            if (hashtagId != null) {
                hashtagMapper.incrementPostCount(hashtagId);
                hashtagMapper.insertPostHashtag(postId, hashtagId);
            }
        }
    }

    private void updateHashtags(Long postId, String newContent) {
        // 既存タグの post_count をデクリメントしてから削除
        List<Long> existingHashtagIds = hashtagMapper.findHashtagIdsByPostId(postId);
        for (Long hashtagId : existingHashtagIds) {
            hashtagMapper.decrementPostCount(hashtagId);
        }
        hashtagMapper.deletePostHashtags(postId);
        if (newContent != null && !newContent.isBlank()) {
            saveHashtags(postId, newContent);
        }
    }

    private Set<String> extractHashtags(String content) {
        Set<String> tags = new java.util.LinkedHashSet<>();
        if (content == null) return tags;
        Matcher m = HASHTAG_PATTERN.matcher(content);
        while (m.find()) {
            tags.add(m.group(1).toLowerCase());
        }
        return tags;
    }
}
