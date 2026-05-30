package com.timeline.filter;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class MdcLoggingFilterTest {

    private MdcLoggingFilter filter;
    private ListAppender<ILoggingEvent> listAppender;

    @BeforeEach
    void setUp() {
        filter = new MdcLoggingFilter();

        Logger filterLogger = (Logger) LoggerFactory.getLogger(MdcLoggingFilter.class);
        listAppender = new ListAppender<>();
        listAppender.start();
        filterLogger.addAppender(listAppender);
    }

    @AfterEach
    void tearDown() {
        Logger filterLogger = (Logger) LoggerFactory.getLogger(MdcLoggingFilter.class);
        filterLogger.detachAppender(listAppender);
    }

    @Test
    void リクエストごとにX_Trace_Idヘッダーが付与される() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/posts");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, new MockFilterChain());

        assertThat(response.getHeader("X-Trace-Id")).isNotNull().hasSize(32);
    }

    @Test
    void リクエストごとにtraceIdが異なる() throws Exception {
        MockHttpServletRequest req1 = new MockHttpServletRequest("GET", "/api/posts");
        MockHttpServletResponse res1 = new MockHttpServletResponse();
        filter.doFilterInternal(req1, res1, new MockFilterChain());

        MockHttpServletRequest req2 = new MockHttpServletRequest("GET", "/api/posts");
        MockHttpServletResponse res2 = new MockHttpServletResponse();
        filter.doFilterInternal(req2, res2, new MockFilterChain());

        assertThat(res1.getHeader("X-Trace-Id")).isNotEqualTo(res2.getHeader("X-Trace-Id"));
    }

    @Test
    void アクセスログにHTTP情報が含まれる() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/posts");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(200);

        filter.doFilterInternal(request, response, new MockFilterChain());

        assertThat(listAppender.list)
                .anyMatch(event -> event.getMessage().equals("HTTP access"));
    }

    @Test
    void アクセスログのMDCにtraceIdが含まれる() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/posts");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, new MockFilterChain());

        assertThat(listAppender.list)
                .anyMatch(event ->
                        event.getMessage().equals("HTTP access")
                        && event.getMDCPropertyMap().containsKey("traceId")
                        && event.getMDCPropertyMap().get("traceId").length() == 32);
    }

    @Test
    void 未認証リクエストのuserIdはanonymous() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/posts");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, new MockFilterChain());

        assertThat(listAppender.list)
                .anyMatch(event ->
                        event.getMessage().equals("HTTP access")
                        && "anonymous".equals(event.getMDCPropertyMap().get("userId")));
    }
}
