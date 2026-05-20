package com.timeline.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreatePostRequest {

    @NotBlank(message = "投稿内容は必須です")
    @Size(min = 1, max = 280, message = "投稿は1〜280文字で入力してください")
    private String content;

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
