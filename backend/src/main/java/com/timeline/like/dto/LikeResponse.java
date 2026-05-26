package com.timeline.like.dto;

public record LikeResponse(Long postId, long likeCount, boolean likedByCurrentUser) {
}
