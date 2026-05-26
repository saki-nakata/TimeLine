package com.timeline.follow.repository;

import com.timeline.user.dto.UserProfileResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FollowMapper {

    void insert(@Param("followerId") Long followerId, @Param("followingId") Long followingId);

    void delete(@Param("followerId") Long followerId, @Param("followingId") Long followingId);

    boolean exists(@Param("followerId") Long followerId, @Param("followingId") Long followingId);

    List<UserProfileResponse> findFollowing(@Param("userId") Long userId, @Param("currentUserId") Long currentUserId);
}
