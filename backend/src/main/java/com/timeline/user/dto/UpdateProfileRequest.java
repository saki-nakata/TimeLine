package com.timeline.user.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class UpdateProfileRequest {

    @Pattern(regexp = "^[a-zA-Z0-9_]{1,50}$",
             message = "ユーザー名は半角英数字・アンダースコアのみ、50文字以内で入力してください")
    private String username;

    @Size(max = 100, message = "表示名は100文字以内で入力してください")
    private String displayName;

    @Size(max = 160, message = "自己紹介は160文字以内で入力してください")
    private String bio;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
}
