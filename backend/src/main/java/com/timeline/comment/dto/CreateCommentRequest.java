package com.timeline.comment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateCommentRequest {

    @NotBlank(message = "コメント内容は必須です")
    @Size(min = 1, max = 280, message = "コメントは1〜280文字で入力してください")
    private String content;

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
