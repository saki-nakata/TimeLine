package com.timeline.dto;

import com.timeline.model.User;
import java.time.OffsetDateTime;

public class UserResponse {
    private Long id;
    private String username;
    private String displayName;
    private String email;
    private String avatarUrl;
    private String bio;
    private Long followerCount;
    private Long followingCount;
    private OffsetDateTime createdAt;

    public static UserResponse from(User user) {
        UserResponse res = new UserResponse();
        res.id = user.getId();
        res.username = user.getUsername();
        res.displayName = user.getDisplayName();
        res.email = user.getEmail();
        res.avatarUrl = user.getAvatarUrl();
        res.bio = user.getBio();
        res.followerCount = user.getFollowerCount();
        res.followingCount = user.getFollowingCount();
        res.createdAt = user.getCreatedAt();
        return res;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getDisplayName() { return displayName; }
    public String getEmail() { return email; }
    public String getAvatarUrl() { return avatarUrl; }
    public String getBio() { return bio; }
    public Long getFollowerCount() { return followerCount; }
    public Long getFollowingCount() { return followingCount; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
