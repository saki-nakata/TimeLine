package com.timeline.auth.service;

import com.timeline.auth.dto.LoginRequest;
import com.timeline.auth.dto.RegisterRequest;
import com.timeline.auth.repository.RefreshTokenMapper;
import com.timeline.user.repository.UserMapper;
import com.timeline.model.RefreshToken;
import com.timeline.model.User;
import com.timeline.util.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;

@Service
public class AuthService {

    private final UserMapper userMapper;
    private final RefreshTokenMapper refreshTokenMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final long refreshExpirationSeconds;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public AuthService(
            UserMapper userMapper,
            RefreshTokenMapper refreshTokenMapper,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            @Value("${jwt.refresh-expiration-seconds}") long refreshExpirationSeconds) {
        this.userMapper = userMapper;
        this.refreshTokenMapper = refreshTokenMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.refreshExpirationSeconds = refreshExpirationSeconds;
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

    public String generateAndSaveRefreshToken(Long userId) {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUserId(userId);
        refreshToken.setTokenHash(sha256(rawToken));
        refreshToken.setExpiresAt(OffsetDateTime.now().plusSeconds(refreshExpirationSeconds));
        refreshTokenMapper.insert(refreshToken);

        return rawToken;
    }

    public User refreshTokens(String rawToken) {
        String hash = sha256(rawToken);
        RefreshToken stored = refreshTokenMapper.findByTokenHash(hash);

        if (stored == null || stored.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "リフレッシュトークンが無効です");
        }

        refreshTokenMapper.deleteByTokenHash(hash);

        return findById(stored.getUserId());
    }

    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            refreshTokenMapper.deleteByTokenHash(sha256(rawRefreshToken));
        }
    }

    public User findById(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ユーザーが見つかりません");
        }
        return user;
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
