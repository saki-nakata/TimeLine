package com.timeline.service;

import com.timeline.dto.LikeResponse;
import com.timeline.mapper.LikeMapper;
import com.timeline.mapper.PostMapper;
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
        likeMapper.insert(postId, userId);
        postMapper.incrementLikeCount(postId);
        long count = likeMapper.countByPostId(postId);
        boolean liked = likeMapper.existsByPostIdAndUserId(postId, userId);
        return new LikeResponse(postId, count, liked);
    }

    public LikeResponse removeLike(Long postId, Long userId) {
        if (postMapper.findById(postId) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "投稿が見つかりません");
        }
        likeMapper.delete(postId, userId);
        postMapper.decrementLikeCount(postId);
        long count = likeMapper.countByPostId(postId);
        boolean liked = likeMapper.existsByPostIdAndUserId(postId, userId);
        return new LikeResponse(postId, count, liked);
    }
}
