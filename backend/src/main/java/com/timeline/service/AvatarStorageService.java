package com.timeline.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Service
public class AvatarStorageService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp"
    );
    private static final long MAX_SIZE = 5 * 1024 * 1024;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public String store(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ファイルが空です");
        }
        if (!ALLOWED_TYPES.contains(file.getContentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "JPEG / PNG / GIF / WebP のみアップロードできます");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ファイルサイズは5MB以下にしてください");
        }

        String originalFilename = file.getOriginalFilename();
        String ext = getExtension(originalFilename);
        String filename = UUID.randomUUID() + ext;

        try {
            Path dir = Paths.get(uploadDir, "avatars");
            Files.createDirectories(dir);
            file.transferTo(dir.resolve(filename).toAbsolutePath().toFile());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "画像の保存に失敗しました");
        }

        return "/uploads/avatars/" + filename;
    }

    private String getExtension(String filename) {
        if (filename == null) {
            return ".jpg";
        }
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot).toLowerCase() : ".jpg";
    }
}
