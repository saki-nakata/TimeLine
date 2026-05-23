package com.timeline.mapper;

import com.timeline.dto.CommentResponse;
import com.timeline.model.Comment;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface CommentMapper {

    void insert(Comment comment);

    Comment findById(Long id);

    List<CommentResponse> findByPostId(Long postId);

    void delete(Long id);
}
