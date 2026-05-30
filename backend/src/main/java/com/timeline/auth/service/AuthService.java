package com.timeline.auth.service;

import com.timeline.auth.dto.LoginRequest;
import com.timeline.auth.dto.RegisterRequest;
import com.timeline.auth.repository.RefreshTokenMapper;
import com.timeline.user.repository.UserMapper;
import com.timeline.model.RefreshToken;
import com.timeline.model.User;
import com.timeline.util.JwtUtil;
import net.logstash.logback.argument.StructuredArguments;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger LOG = LoggerFactory.getLogger(AuthService.class);

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
            LOG.info("Registration conflict",
                    StructuredArguments.kv("event", "register_conflict"),
                    StructuredArguments.kv("field", "email"));
            throw new ResponseStatusException(HttpStatus.CONFLICT, "このメールアドレスはすでに使用されています");
        }
        if (userMapper.findByUsername(req.getUsername()) != null) {
            LOG.info("Registration conflict",
                    StructuredArguments.kv("event", "register_conflict"),
                    StructuredArguments.kv("field", "username"));
            throw new ResponseStatusException(HttpStatus.CONFLICT, "このユーザー名はすでに使用されています");
        }

        User user = new User();
        user.setUsername(req.getUsername());
        user.setEmail(req.getEmail());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        userMapper.insert(user);
        LOG.info("User registered",
                StructuredArguments.kv("event", "user_registered"),
                StructuredArguments.kv("userId", user.getId()));
        return user;
    }

    public User login(LoginRequest req) {
        User user = userMapper.findByEmail(req.getEmail());
        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            LOG.warn("Login failed", StructuredArguments.kv("event", "login_failed"));
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "メールアドレスまたはパスワードが正しくありません");
        }
        LOG.info("Login success",
                StructuredArguments.kv("event", "login_success"),
                StructuredArguments.kv("userId", user.getId()));
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
            LOG.warn("Refresh token invalid", StructuredArguments.kv("event", "refresh_token_invalid"));
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "リフレッシュトークンが無効です");
        }

        refreshTokenMapper.deleteByTokenHash(hash);

        User user = findById(stored.getUserId());
        LOG.info("Token refreshed",
                StructuredArguments.kv("event", "token_refreshed"),
                StructuredArguments.kv("userId", user.getId()));
        return user;
    }

    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            refreshTokenMapper.deleteByTokenHash(sha256(rawRefreshToken));
            LOG.info("Logout", StructuredArguments.kv("event", "logout"));
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
