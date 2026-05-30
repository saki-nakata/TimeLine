package com.timeline.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import net.logstash.logback.argument.StructuredArguments;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class MdcLoggingFilter extends OncePerRequestFilter {

    private static final Logger LOG = LoggerFactory.getLogger(MdcLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String traceId = UUID.randomUUID().toString().replace("-", "");
        MDC.put("traceId", traceId);
        response.setHeader("X-Trace-Id", traceId);

        long start = System.currentTimeMillis();
        try {
            chain.doFilter(request, response);
        } finally {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String userId = (auth != null && auth.isAuthenticated()
                    && auth.getPrincipal() instanceof Long id)
                    ? id.toString() : "anonymous";
            MDC.put("userId", userId);

            long durationMs = System.currentTimeMillis() - start;
            LOG.info("HTTP access",
                    StructuredArguments.kv("method", request.getMethod()),
                    StructuredArguments.kv("path", request.getRequestURI()),
                    StructuredArguments.kv("statusCode", response.getStatus()),
                    StructuredArguments.kv("durationMs", durationMs),
                    StructuredArguments.kv("userId", userId));

            MDC.remove("traceId");
            MDC.remove("userId");
        }
    }
}
