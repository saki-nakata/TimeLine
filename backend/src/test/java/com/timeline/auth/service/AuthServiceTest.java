package com.timeline.auth.service;

import com.timeline.auth.dto.LoginRequest;
import com.timeline.auth.dto.RegisterRequest;
import com.timeline.auth.repository.RefreshTokenMapper;
import com.timeline.model.RefreshToken;
import com.timeline.model.User;
import com.timeline.user.repository.UserMapper;
import com.timeline.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserMapper userMapper;
    @Mock RefreshTokenMapper refreshTokenMapper;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtUtil jwtUtil;

    // コンストラクタで @Value フィールドを直接設定する
    AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userMapper, refreshTokenMapper, passwordEncoder, jwtUtil, 604800L);

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash("$2a$10$hashedPassword");
    }

    // ─── register ────────────────────────────────────────────────

    @Test
    void register_新規ユーザー_Userが返る() {
        when(userMapper.findByEmail("new@example.com")).thenReturn(null);
        when(userMapper.findByUsername("newuser")).thenReturn(null);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        doNothing().when(userMapper).insert(any(User.class));

        RegisterRequest req = new RegisterRequest();
        req.setEmail("new@example.com");
        req.setUsername("newuser");
        req.setPassword("password123");

        User result = authService.register(req);

        assertThat(result.getUsername()).isEqualTo("newuser");
        assertThat(result.getEmail()).isEqualTo("new@example.com");
        assertThat(result.getPasswordHash()).isEqualTo("hashed");
        verify(userMapper).insert(any(User.class));
    }

    @Test
    void register_メールアドレス重複_409例外() {
        when(userMapper.findByEmail("test@example.com")).thenReturn(testUser);

        RegisterRequest req = new RegisterRequest();
        req.setEmail("test@example.com");
        req.setUsername("newuser");
        req.setPassword("password123");

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("メールアドレスはすでに使用されています");

        verify(userMapper, never()).insert(any());
    }

    @Test
    void register_ユーザー名重複_409例外() {
        when(userMapper.findByEmail("new@example.com")).thenReturn(null);
        when(userMapper.findByUsername("testuser")).thenReturn(testUser);

        RegisterRequest req = new RegisterRequest();
        req.setEmail("new@example.com");
        req.setUsername("testuser");
        req.setPassword("password123");

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("ユーザー名はすでに使用されています");

        verify(userMapper, never()).insert(any());
    }

    // ─── login ───────────────────────────────────────────────────

    @Test
    void login_正しい認証情報_Userが返る() {
        when(userMapper.findByEmail("test@example.com")).thenReturn(testUser);
        when(passwordEncoder.matches("password123", testUser.getPasswordHash())).thenReturn(true);

        LoginRequest req = new LoginRequest();
        req.setEmail("test@example.com");
        req.setPassword("password123");

        User result = authService.login(req);

        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    void login_存在しないメール_401例外() {
        when(userMapper.findByEmail("notfound@example.com")).thenReturn(null);

        LoginRequest req = new LoginRequest();
        req.setEmail("notfound@example.com");
        req.setPassword("password123");

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("メールアドレスまたはパスワードが正しくありません");
    }

    @Test
    void login_パスワード不一致_401例外() {
        when(userMapper.findByEmail("test@example.com")).thenReturn(testUser);
        when(passwordEncoder.matches("wrongpassword", testUser.getPasswordHash())).thenReturn(false);

        LoginRequest req = new LoginRequest();
        req.setEmail("test@example.com");
        req.setPassword("wrongpassword");

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("メールアドレスまたはパスワードが正しくありません");
    }

    // ─── generateAndSaveRefreshToken ─────────────────────────────

    @Test
    void generateAndSaveRefreshToken_リフレッシュトークンが保存される() {
        doNothing().when(refreshTokenMapper).insert(any(RefreshToken.class));

        String rawToken = authService.generateAndSaveRefreshToken(1L);

        assertThat(rawToken).isNotBlank();
        verify(refreshTokenMapper).insert(any(RefreshToken.class));
    }

    // ─── refreshTokens ───────────────────────────────────────────

    @Test
    void refreshTokens_有効なトークン_Userが返る() {
        RefreshToken stored = new RefreshToken();
        stored.setUserId(1L);
        stored.setExpiresAt(OffsetDateTime.now().plusHours(1));

        when(refreshTokenMapper.findByTokenHash(anyString())).thenReturn(stored);
        doNothing().when(refreshTokenMapper).deleteByTokenHash(anyString());
        when(userMapper.findById(1L)).thenReturn(testUser);

        User result = authService.refreshTokens("valid-raw-token");

        assertThat(result.getId()).isEqualTo(1L);
        verify(refreshTokenMapper).deleteByTokenHash(anyString());
    }

    @Test
    void refreshTokens_期限切れトークン_401例外() {
        RefreshToken expired = new RefreshToken();
        expired.setUserId(1L);
        expired.setExpiresAt(OffsetDateTime.now().minusHours(1));

        when(refreshTokenMapper.findByTokenHash(anyString())).thenReturn(expired);

        assertThatThrownBy(() -> authService.refreshTokens("expired-token"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("リフレッシュトークンが無効です");
    }

    @Test
    void refreshTokens_存在しないトークン_401例外() {
        when(refreshTokenMapper.findByTokenHash(anyString())).thenReturn(null);

        assertThatThrownBy(() -> authService.refreshTokens("unknown-token"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("リフレッシュトークンが無効です");
    }

    // ─── logout ──────────────────────────────────────────────────

    @Test
    void logout_リフレッシュトークンあり_deleteByTokenHashが呼ばれる() {
        doNothing().when(refreshTokenMapper).deleteByTokenHash(anyString());

        authService.logout("some-raw-token");

        verify(refreshTokenMapper).deleteByTokenHash(anyString());
    }

    @Test
    void logout_リフレッシュトークンがnull_deleteByTokenHashは呼ばれない() {
        authService.logout(null);

        verify(refreshTokenMapper, never()).deleteByTokenHash(anyString());
    }

    // ─── findById ────────────────────────────────────────────────

    @Test
    void findById_存在するID_Userが返る() {
        when(userMapper.findById(1L)).thenReturn(testUser);

        User result = authService.findById(1L);

        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    void findById_存在しないID_404例外() {
        when(userMapper.findById(99L)).thenReturn(null);

        assertThatThrownBy(() -> authService.findById(99L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("ユーザーが見つかりません");
    }
}
