package com.timeline.service;

import com.timeline.dto.CreatePostRequest;
import com.timeline.dto.PostResponse;
import com.timeline.dto.TimelineResponse;
import com.timeline.dto.UpdatePostRequest;
import com.timeline.mapper.PostMapper;
import com.timeline.mapper.UserMapper;
import com.timeline.model.Post;
import com.timeline.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class PostService {

    private final PostMapper postMapper;
    private final UserMapper userMapper;
    private final SimpMessagingTemplate messagingTemplate;

    public PostService(PostMapper postMapper, UserMapper userMapper, SimpMessagingTemplate messagingTemplate) {
        this.postMapper = postMapper;
        this.userMapper = userMapper;
        this.messagingTemplate = messagingTemplate;
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

    public PostResponse createPost(Long userId, CreatePostRequest req) {
        OffsetDateTime now = OffsetDateTime.now();
        Post post = new Post();
        post.setUserId(userId);
        post.setContent(req.getContent());
        post.setCreatedAt(now);
        post.setUpdatedAt(now);
        postMapper.insert(post);
        User author = userMapper.findById(userId);
        PostResponse response = PostResponse.from(post, author);
        messagingTemplate.convertAndSend("/topic/posts", response);
        return response;
    }

    public PostResponse updatePost(Long postId, Long requesterId, UpdatePostRequest req) {
        Post post = postMapper.findById(postId);
        if (post == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "投稿が見つかりません");
        }
        if (!post.getUserId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "この投稿を編集する権限がありません");
        }
        post.setContent(req.getContent());
        post.setUpdatedAt(OffsetDateTime.now());
        postMapper.update(post);
        User author = userMapper.findById(requesterId);
        return PostResponse.from(post, author);
    }

    public void deletePost(Long postId, Long requesterId) {
        Post post = postMapper.findById(postId);
        if (post == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "投稿が見つかりません");
        }
        if (!post.getUserId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "この投稿を削除する権限がありません");
        }
        postMapper.delete(postId);
    }
}
