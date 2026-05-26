package com.timeline.user.dto;

import java.time.OffsetDateTime;

public class UserProfileResponse {
    private Long id;
    private String username;
    private String displayName;
    private String avatarUrl;
    private String bio;
    private Long followerCount;
    private Long followingCount;
    private OffsetDateTime createdAt;
    private boolean followedByCurrentUser;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public Long getFollowerCount() { return followerCount; }
    public void setFollowerCount(Long followerCount) { this.followerCount = followerCount; }

    public Long getFollowingCount() { return followingCount; }
    public void setFollowingCount(Long followingCount) { this.followingCount = followingCount; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isFollowedByCurrentUser() { return followedByCurrentUser; }
    public void setFollowedByCurrentUser(boolean followedByCurrentUser) { this.followedByCurrentUser = followedByCurrentUser; }
}
