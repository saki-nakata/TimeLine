package com.timeline.service;

import com.timeline.dto.CommentResponse;
import com.timeline.dto.CreateCommentRequest;
import com.timeline.mapper.CommentMapper;
import com.timeline.mapper.PostMapper;
import com.timeline.mapper.UserMapper;
import com.timeline.model.Comment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class CommentService {

    private final CommentMapper commentMapper;
    private final PostMapper postMapper;
    private final UserMapper userMapper;

    public CommentService(CommentMapper commentMapper, PostMapper postMapper, UserMapper userMapper) {
        this.commentMapper = commentMapper;
        this.postMapper = postMapper;
        this.userMapper = userMapper;
    }

    public List<CommentResponse> getComments(Long postId) {
        if (postMapper.findById(postId) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "投稿が見つかりません");
        }
        return commentMapper.findByPostId(postId);
    }

    public CommentResponse createComment(Long postId, Long userId, CreateCommentRequest req) {
        if (postMapper.findById(postId) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "投稿が見つかりません");
        }
        OffsetDateTime now = OffsetDateTime.now();
        Comment comment = new Comment();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setContent(req.getContent());
        comment.setCreatedAt(now);
        comment.setUpdatedAt(now);
        commentMapper.insert(comment);
        postMapper.incrementCommentCount(postId);

        Comment saved = commentMapper.findById(comment.getId());
        CommentResponse res = new CommentResponse();
        res.setId(saved.getId());
        res.setPostId(saved.getPostId());
        res.setUserId(saved.getUserId());
        res.setContent(saved.getContent());
        res.setCreatedAt(saved.getCreatedAt());

        var author = userMapper.findById(userId);
        res.setUsername(author.getUsername());
        res.setDisplayName(author.getDisplayName());
        res.setAvatarUrl(author.getAvatarUrl());

        return res;
    }

    public void deleteComment(Long postId, Long commentId, Long requesterId) {
        if (postMapper.findById(postId) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "投稿が見つかりません");
        }
        Comment comment = commentMapper.findById(commentId);
        if (comment == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "コメントが見つかりません");
        }
        if (!comment.getUserId().equals(requesterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "このコメントを削除する権限がありません");
        }
        commentMapper.delete(commentId);
        postMapper.decrementCommentCount(postId);
    }
}
