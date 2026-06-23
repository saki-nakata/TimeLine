package com.timeline.auth.controller;

import com.timeline.auth.dto.LoginRequest;
import com.timeline.auth.dto.RegisterRequest;
import com.timeline.user.dto.UserResponse;
import com.timeline.model.User;
import com.timeline.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@Tag(name = "認証", description = "ユーザー登録・ログイン・セッション管理")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    static final String ACCESS_COOKIE_NAME = "access_token";
    static final String REFRESH_COOKIE_NAME = "refresh_token";
    static final int ACCESS_COOKIE_MAX_AGE = 900;
    static final int REFRESH_COOKIE_MAX_AGE = 604800;

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @Operation(summary = "新規ユーザー登録")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "登録成功"),
        @ApiResponse(responseCode = "400", description = "バリデーションエラー")
    })
    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(
            @Valid @RequestBody RegisterRequest req,
            HttpServletResponse response) {
        User user = authService.register(req);
        issueTokenPair(response, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(user));
    }

    @Operation(summary = "ログイン（Cookie 発行）")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "ログイン成功"),
        @ApiResponse(responseCode = "401", description = "認証失敗")
    })
    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(
            @Valid @RequestBody LoginRequest req,
            HttpServletResponse response) {
        User user = authService.login(req);
        issueTokenPair(response, user.getId());
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @Operation(summary = "ログアウト（Cookie 削除）")
    @ApiResponse(responseCode = "204", description = "ログアウト成功")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        String rawRefreshToken = extractCookie(request, REFRESH_COOKIE_NAME);
        authService.logout(rawRefreshToken);
        clearCookie(response, ACCESS_COOKIE_NAME);
        clearCookie(response, REFRESH_COOKIE_NAME);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "アクセストークン更新")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "更新成功"),
        @ApiResponse(responseCode = "401", description = "リフレッシュトークン無効")
    })
    @PostMapping("/refresh")
    public ResponseEntity<UserResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        String rawRefreshToken = extractCookie(request, REFRESH_COOKIE_NAME);
        if (rawRefreshToken == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "リフレッシュトークンが見つかりません");
        }
        User user = authService.refreshTokens(rawRefreshToken);
        issueTokenPair(response, user.getId());
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @Operation(summary = "現在のログインユーザー取得")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "取得成功"),
        @ApiResponse(responseCode = "401", description = "未認証")
    })
    @SecurityRequirement(name = "cookieAuth")
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal Long userId) {
        User user = authService.findById(userId);
        return ResponseEntity.ok(UserResponse.from(user));
    }

    private void issueTokenPair(HttpServletResponse response, Long userId) {
        String accessToken = authService.generateToken(userId);
        String refreshToken = authService.generateAndSaveRefreshToken(userId);
        setAccessTokenCookie(response, accessToken, ACCESS_COOKIE_MAX_AGE);
        setRefreshTokenCookie(response, refreshToken, REFRESH_COOKIE_MAX_AGE);
    }

    private void setAccessTokenCookie(HttpServletResponse response, String value, int maxAge) {
        Cookie cookie = new Cookie(ACCESS_COOKIE_NAME, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String value, int maxAge) {
        Cookie cookie = new Cookie(REFRESH_COOKIE_NAME, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/api/auth");
        cookie.setMaxAge(maxAge);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }

    private void clearCookie(HttpServletResponse response, String name) {
        Cookie cookie = new Cookie(name, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath(REFRESH_COOKIE_NAME.equals(name) ? "/api/auth" : "/");
        cookie.setMaxAge(0);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }

    private String extractCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
