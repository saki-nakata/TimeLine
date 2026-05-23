package com.timeline.dto;

public record LikeResponse(Long postId, long likeCount, boolean likedByCurrentUser) {
}
