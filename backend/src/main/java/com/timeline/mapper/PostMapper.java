package com.timeline.mapper;

import com.timeline.dto.PostResponse;
import com.timeline.model.Post;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PostMapper {
    void insert(Post post);
    Post findById(Long id);
    PostResponse findPostById(@Param("id") Long id, @Param("currentUserId") Long currentUserId);

    List<PostResponse> findTimeline(
            @Param("cursor") Long cursor,
            @Param("limit") int limit,
            @Param("currentUserId") Long currentUserId);
    void update(Post post);
    void delete(Long id);
    void incrementLikeCount(Long id);
    void decrementLikeCount(Long id);
    void incrementCommentCount(Long id);
    void decrementCommentCount(Long id);
}
