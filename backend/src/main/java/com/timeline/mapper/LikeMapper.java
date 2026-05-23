package com.timeline.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface LikeMapper {

    void insert(@Param("postId") Long postId, @Param("userId") Long userId);

    void delete(@Param("postId") Long postId, @Param("userId") Long userId);

    long countByPostId(Long postId);

    boolean existsByPostIdAndUserId(@Param("postId") Long postId, @Param("userId") Long userId);
}
