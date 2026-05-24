package com.timeline.service;

import com.timeline.dto.UpdateProfileRequest;
import com.timeline.dto.UserProfileResponse;
import com.timeline.mapper.UserMapper;
import com.timeline.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class UserService {

    private final UserMapper userMapper;

    public UserService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    public UserProfileResponse getProfile(Long targetId, Long currentUserId) {
        UserProfileResponse profile = userMapper.findProfileById(targetId, currentUserId);
        if (profile == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ユーザーが見つかりません");
        }
        return profile;
    }

    public UserProfileResponse updateProfile(Long userId, UpdateProfileRequest req) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ユーザーが見つかりません");
        }
        if (req.getUsername() != null) {
            if (userMapper.findByUsernameExcludingId(req.getUsername(), userId) != null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "このユーザー名は既に使用されています");
            }
            user.setUsername(req.getUsername());
        }
        if (req.getDisplayName() != null) {
            user.setDisplayName(req.getDisplayName());
        }
        if (req.getBio() != null) {
            user.setBio(req.getBio());
        }
        user.setUpdatedAt(OffsetDateTime.now());
        userMapper.update(user);
        return userMapper.findProfileById(userId, userId);
    }

    public List<UserProfileResponse> searchUsers(String query, Long currentUserId) {
        if (query == null || query.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "検索キーワードを入力してください");
        }
        return userMapper.searchUsers(query.strip(), currentUserId, 20);
    }

    public UserProfileResponse updateAvatar(Long userId, String avatarUrl) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ユーザーが見つかりません");
        }
        user.setAvatarUrl(avatarUrl);
        user.setUpdatedAt(OffsetDateTime.now());
        userMapper.update(user);
        return userMapper.findProfileById(userId, userId);
    }
}
