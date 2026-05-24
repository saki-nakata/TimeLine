package com.timeline.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

@Service
public class S3StorageService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp"
    );
    private static final long MAX_SIZE = 5 * 1024 * 1024;

    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.s3.region}")
    private String region;

    public S3StorageService(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    public String storeAvatar(MultipartFile file) {
        return store(file, "avatars");
    }

    public String storePostImage(MultipartFile file) {
        return store(file, "posts");
    }

    private String store(MultipartFile file, String folder) {
        validate(file);
        String ext = getExtension(file.getOriginalFilename());
        String key = folder + "/" + UUID.randomUUID() + ext;
        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .build();
            s3Client.putObject(request, RequestBody.fromBytes(file.getBytes()));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "画像のアップロードに失敗しました");
        }
        return "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + key;
    }

    public void deleteFile(String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        String prefix = "amazonaws.com/";
        int idx = url.indexOf(prefix);
        if (idx < 0) {
            return;
        }
        String key = url.substring(idx + prefix.length());
        try {
            s3Client.deleteObject(b -> b.bucket(bucketName).key(key));
        } catch (Exception e) {
            // S3削除失敗はログのみ、DB削除は続行
        }
    }

    private void validate(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ファイルが空です");
        }
        if (!ALLOWED_TYPES.contains(file.getContentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "JPEG / PNG / GIF / WebP のみアップロードできます");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ファイルサイズは5MB以下にしてください");
        }
    }

    private String getExtension(String filename) {
        if (filename == null) {
            return ".jpg";
        }
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot).toLowerCase() : ".jpg";
    }
}
