package com.timeline.follow.dto;

public record FollowResponse(long followerCount, long followingCount, boolean following) {
}
