package com.timeline.common.exception;

import net.logstash.logback.argument.StructuredArguments;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException ex) {
        int status = ex.getStatusCode().value();
        if (status >= 500) {
            LOG.error("Server error response",
                    StructuredArguments.kv("statusCode", status),
                    StructuredArguments.kv("reason", ex.getReason()),
                    ex);
        } else {
            LOG.warn("Client error response",
                    StructuredArguments.kv("statusCode", status),
                    StructuredArguments.kv("reason", ex.getReason()));
        }
        return ResponseEntity.status(ex.getStatusCode())
                .body(Map.of("message", ex.getReason() != null ? ex.getReason() : ""));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        LOG.warn("Validation failed", StructuredArguments.kv("fields", message));
        return ResponseEntity.badRequest()
                .body(Map.of("message", message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUnexpected(Exception ex) {
        LOG.error("Unexpected error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "予期しないエラーが発生しました"));
    }
}
