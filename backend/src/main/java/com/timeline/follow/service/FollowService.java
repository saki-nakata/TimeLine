package com.timeline.follow.service;

import com.timeline.follow.dto.FollowResponse;
import com.timeline.user.dto.UserProfileResponse;
import com.timeline.follow.repository.FollowMapper;
import com.timeline.user.repository.UserMapper;
import com.timeline.model.User;
import net.logstash.logback.argument.StructuredArguments;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class FollowService {

    private static final Logger LOG = LoggerFactory.getLogger(FollowService.class);

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
            LOG.info("Follow",
                    StructuredArguments.kv("event", "follow"),
                    StructuredArguments.kv("followerId", followerId),
                    StructuredArguments.kv("targetId", targetId));
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
            LOG.info("Unfollow",
                    StructuredArguments.kv("event", "unfollow"),
                    StructuredArguments.kv("followerId", followerId),
                    StructuredArguments.kv("targetId", targetId));
        }
        User updatedTarget = userMapper.findById(targetId);
        User updatedFollower = userMapper.findById(followerId);
        return new FollowResponse(updatedTarget.getFollowerCount(), updatedFollower.getFollowingCount(), false);
    }

    public List<UserProfileResponse> getFollowing(Long userId, Long currentUserId) {
        return followMapper.findFollowing(userId, currentUserId);
    }
}
