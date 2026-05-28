package com.timeline.auth.repository;

import com.timeline.model.RefreshToken;
import com.timeline.model.User;
import com.timeline.user.repository.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class RefreshTokenMapperTest {

    @Autowired
    RefreshTokenMapper refreshTokenMapper;

    @Autowired
    UserMapper userMapper;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUsername("alice");
        testUser.setEmail("alice@example.com");
        testUser.setPasswordHash("hashed");
        userMapper.insert(testUser);
    }

    private RefreshToken insertToken(String hash) {
        RefreshToken token = new RefreshToken();
        token.setUserId(testUser.getId());
        token.setTokenHash(hash);
        token.setExpiresAt(OffsetDateTime.now().plusDays(7));
        refreshTokenMapper.insert(token);
        return token;
    }

    // ─── insert / findByTokenHash ─────────────────────────────────

    @Test
    void insert_トークンを保存_IDが採番される() {
        RefreshToken token = insertToken("hash_abc");

        assertThat(token.getId()).isNotNull();
    }

    @Test
    void findByTokenHash_存在するハッシュ_RefreshTokenが返る() {
        insertToken("hash_abc");

        RefreshToken result = refreshTokenMapper.findByTokenHash("hash_abc");

        assertThat(result).isNotNull();
        assertThat(result.getUserId()).isEqualTo(testUser.getId());
    }

    @Test
    void findByTokenHash_存在しないハッシュ_nullが返る() {
        assertThat(refreshTokenMapper.findByTokenHash("unknown_hash")).isNull();
    }

    // ─── deleteByTokenHash / deleteByUserId ───────────────────────

    @Test
    void deleteByTokenHash_対象トークンのみ削除される() {
        insertToken("hash_abc");
        insertToken("hash_xyz");

        refreshTokenMapper.deleteByTokenHash("hash_abc");

        assertThat(refreshTokenMapper.findByTokenHash("hash_abc")).isNull();
        assertThat(refreshTokenMapper.findByTokenHash("hash_xyz")).isNotNull();
    }

    @Test
    void deleteByUserId_ユーザーのトークンが全て削除される() {
        insertToken("hash_abc");
        insertToken("hash_xyz");

        refreshTokenMapper.deleteByUserId(testUser.getId());

        assertThat(refreshTokenMapper.findByTokenHash("hash_abc")).isNull();
        assertThat(refreshTokenMapper.findByTokenHash("hash_xyz")).isNull();
    }
}
