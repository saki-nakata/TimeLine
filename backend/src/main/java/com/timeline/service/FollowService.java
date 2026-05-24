package com.timeline.service;

import com.timeline.dto.FollowResponse;
import com.timeline.dto.UserProfileResponse;
import com.timeline.mapper.FollowMapper;
import com.timeline.mapper.UserMapper;
import com.timeline.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class FollowService {

    private final FollowMapper followMapper;
    private final UserMapper userMapper;

    public FollowService(FollowMapper followMapper, UserMapper userMapper) {
        this.followMapper = followMapper;
        this.userMapper = userMapper;
    }

    public FollowResponse follow(Long followerId, Long targetId) {
        if (followerId.equals(targetId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "自分自身はフォローできません");
        }
        User target = userMapper.findById(targetId);
        if (target == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ユーザーが見つかりません");
        }
        if (!followMapper.exists(followerId, targetId)) {
            followMapper.insert(followerId, targetId);
            userMapper.incrementFollowingCount(followerId);
            userMapper.incrementFollowerCount(targetId);
        }
        User updatedTarget = userMapper.findById(targetId);
        User updatedFollower = userMapper.findById(followerId);
        return new FollowResponse(updatedTarget.getFollowerCount(), updatedFollower.getFollowingCount(), true);
    }

    public FollowResponse unfollow(Long followerId, Long targetId) {
        User target = userMapper.findById(targetId);
        if (target == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ユーザーが見つかりません");
        }
        if (followMapper.exists(followerId, targetId)) {
            followMapper.delete(followerId, targetId);
            userMapper.decrementFollowingCount(followerId);
            userMapper.decrementFollowerCount(targetId);
        }
        User updatedTarget = userMapper.findById(targetId);
        User updatedFollower = userMapper.findById(followerId);
        return new FollowResponse(updatedTarget.getFollowerCount(), updatedFollower.getFollowingCount(), false);
    }

    public List<UserProfileResponse> getFollowing(Long userId, Long currentUserId) {
        return followMapper.findFollowing(userId, currentUserId);
    }
}
