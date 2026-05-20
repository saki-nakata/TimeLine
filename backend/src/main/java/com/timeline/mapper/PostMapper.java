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
    List<PostResponse> findTimeline(@Param("cursor") Long cursor, @Param("limit") int limit);
    void update(Post post);
    void delete(Long id);
}
