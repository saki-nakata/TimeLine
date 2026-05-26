package com.timeline.post.service;

import com.timeline.post.dto.PostResponse;
import com.timeline.post.dto.TimelineResponse;
import com.timeline.post.repository.PostMapper;
import com.timeline.user.repository.UserMapper;
import com.timeline.common.storage.S3StorageService;
import com.timeline.model.Post;
import com.timeline.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class PostService {

    private final PostMapper postMapper;
    private final UserMapper userMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final S3StorageService s3StorageService;

    public PostService(PostMapper postMapper, UserMapper userMapper,
                       SimpMessagingTemplate messagingTemplate, S3StorageService s3StorageService) {
        this.postMapper = postMapper;
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
        User author = userMapper.findById(userId);
        PostResponse response = PostResponse.from(post, author);
        messagingTemplate.convertAndSend("/topic/posts", response);
        return response;
    }

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
        postMapper.delete(postId);
    }
}
