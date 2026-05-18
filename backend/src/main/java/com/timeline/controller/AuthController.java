package com.timeline.controller;

import com.timeline.dto.LoginRequest;
import com.timeline.dto.RegisterRequest;
import com.timeline.dto.UserResponse;
import com.timeline.model.User;
import com.timeline.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    static final String COOKIE_NAME = "access_token";
    static final int COOKIE_MAX_AGE = 86400;

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(
            @Valid @RequestBody RegisterRequest req,
            HttpServletResponse response) {
        User user = authService.register(req);
        String token = authService.generateToken(user.getId());
        setTokenCookie(response, token, COOKIE_MAX_AGE);
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(user));
    }

    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(
            @Valid @RequestBody LoginRequest req,
            HttpServletResponse response) {
        User user = authService.login(req);
        String token = authService.generateToken(user.getId());
        setTokenCookie(response, token, COOKIE_MAX_AGE);
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        setTokenCookie(response, "", 0);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal Long userId) {
        User user = authService.findById(userId);
        return ResponseEntity.ok(UserResponse.from(user));
    }

    private void setTokenCookie(HttpServletResponse response, String value, int maxAge) {
        Cookie cookie = new Cookie(COOKIE_NAME, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }
}
