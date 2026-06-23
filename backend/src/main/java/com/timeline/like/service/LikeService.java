package com.timeline.like.service;

import com.timeline.like.dto.LikeResponse;
import com.timeline.like.repository.LikeMapper;
import com.timeline.post.repository.PostMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LikeService {

    private final LikeMapper likeMapper;
    private final PostMapper postMapper;

    public LikeService(LikeMapper likeMapper, PostMapper postMapper) {
        this.likeMapper = likeMapper;
        this.postMapper = postMapper;
    }

    public LikeResponse addLike(Long postId, Long userId) {
        if (postMapper.findById(postId) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "投稿が見つかりません");
        }
        try {
            int inserted = likeMapper.insert(postId, userId);
            if (inserted > 0) {
                postMapper.incrementLikeCount(postId);
            }
        } catch (DataIntegrityViolationException e) {
            // 重複いいねは ON CONFLICT DO NOTHING で防がれるが、念のため 409 で返す
            throw new ResponseStatusException(HttpStatus.CONFLICT, "すでにいいね済みです");
        }
        long count = likeMapper.countByPostId(postId);
        boolean liked = likeMapper.existsByPostIdAndUserId(postId, userId);
        return new LikeResponse(postId, count, liked);
    }

    public LikeResponse removeLike(Long postId, Long userId) {
        if (postMapper.findById(postId) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "投稿が見つかりません");
        }
        int deleted = likeMapper.delete(postId, userId);
        if (deleted > 0) {
            postMapper.decrementLikeCount(postId);
        }
        long count = likeMapper.countByPostId(postId);
        boolean liked = likeMapper.existsByPostIdAndUserId(postId, userId);
        return new LikeResponse(postId, count, liked);
    }
}
