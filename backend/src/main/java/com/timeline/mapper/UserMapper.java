package com.timeline.mapper;

import com.timeline.dto.UserProfileResponse;
import com.timeline.model.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserMapper {
    User findByEmail(String email);
    User findByUsername(String username);
    User findById(Long id);
    void insert(User user);
    void update(User user);
    User findByUsernameExcludingId(@Param("username") String username, @Param("excludeId") Long excludeId);
    UserProfileResponse findProfileById(
            @Param("targetId") Long targetId,
            @Param("currentUserId") Long currentUserId);
    void incrementFollowerCount(Long userId);
    void decrementFollowerCount(Long userId);
    void incrementFollowingCount(Long userId);
    void decrementFollowingCount(Long userId);
}
