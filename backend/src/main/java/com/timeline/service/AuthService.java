package com.timeline.service;

import com.timeline.dto.LoginRequest;
import com.timeline.dto.RegisterRequest;
import com.timeline.mapper.UserMapper;
import com.timeline.model.User;
import com.timeline.util.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserMapper userMapper, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public User register(RegisterRequest req) {
        if (userMapper.findByEmail(req.getEmail()) != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "このメールアドレスはすでに使用されています");
        }
        if (userMapper.findByUsername(req.getUsername()) != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "このユーザー名はすでに使用されています");
        }

        User user = new User();
        user.setUsername(req.getUsername());
        user.setEmail(req.getEmail());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        userMapper.insert(user);
        return user;
    }

    public User login(LoginRequest req) {
        User user = userMapper.findByEmail(req.getEmail());
        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "メールアドレスまたはパスワードが正しくありません");
        }
        return user;
    }

    public String generateToken(Long userId) {
        return jwtUtil.generateToken(userId);
    }

    public User findById(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ユーザーが見つかりません");
        }
        return user;
    }
}
