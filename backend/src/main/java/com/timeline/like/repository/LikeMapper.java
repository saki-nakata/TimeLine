package com.timeline.like.repository;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface LikeMapper {

    int insert(@Param("postId") Long postId, @Param("userId") Long userId);

    int delete(@Param("postId") Long postId, @Param("userId") Long userId);

    long countByPostId(Long postId);

    boolean existsByPostIdAndUserId(@Param("postId") Long postId, @Param("userId") Long userId);
}
