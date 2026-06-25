package com.timeline.post.repository;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface HashtagMapper {
    Long findIdByTag(@Param("tag") String tag);
    void insertHashtag(@Param("tag") String tag);
    Long findIdByTagForUpdate(@Param("tag") String tag);
    void incrementPostCount(@Param("id") Long id);
    void decrementPostCount(@Param("id") Long id);
    void insertPostHashtag(@Param("postId") Long postId, @Param("hashtagId") Long hashtagId);
    void deletePostHashtags(@Param("postId") Long postId);
    List<Long> findHashtagIdsByPostId(@Param("postId") Long postId);
}
