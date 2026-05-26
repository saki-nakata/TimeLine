package com.timeline.user.repository;

import com.timeline.user.dto.UserProfileResponse;
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
    java.util.List<UserProfileResponse> searchUsers(
            @Param("query") String query,
            @Param("currentUserId") Long currentUserId,
            @Param("limit") int limit);
    void incrementFollowerCount(Long userId);
    void decrementFollowerCount(Long userId);
    void incrementFollowingCount(Long userId);
    void decrementFollowingCount(Long userId);
}
