package com.timeline.post.dto;

import com.timeline.model.Post;
import com.timeline.model.User;

import java.time.OffsetDateTime;

public class PostResponse {
    private Long id;
    private Long userId;
    private String username;
    private String displayName;
    private String avatarUrl;
    private String content;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private long likeCount;
    private boolean likedByCurrentUser;
    private long commentCount;
    private String imageUrl;

    public static PostResponse from(Post post, User author) {
        PostResponse res = new PostResponse();
        res.id = post.getId();
        res.userId = post.getUserId();
        res.username = author.getUsername();
        res.displayName = author.getDisplayName();
        res.avatarUrl = author.getAvatarUrl();
        res.content = post.getContent();
        res.imageUrl = post.getImageUrl();
        res.createdAt = post.getCreatedAt();
        res.updatedAt = post.getUpdatedAt();
        return res;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public long getLikeCount() { return likeCount; }
    public void setLikeCount(long likeCount) { this.likeCount = likeCount; }

    public boolean isLikedByCurrentUser() { return likedByCurrentUser; }
    public void setLikedByCurrentUser(boolean likedByCurrentUser) { this.likedByCurrentUser = likedByCurrentUser; }

    public long getCommentCount() { return commentCount; }
    public void setCommentCount(long commentCount) { this.commentCount = commentCount; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
}
