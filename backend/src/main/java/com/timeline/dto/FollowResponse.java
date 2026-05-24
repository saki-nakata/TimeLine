package com.timeline.dto;

public record FollowResponse(long followerCount, long followingCount, boolean following) {
}
