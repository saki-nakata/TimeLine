package com.timeline.dto;

import java.util.List;

public class TimelineResponse {
    private List<PostResponse> posts;
    private Long nextCursor;
    private boolean hasMore;

    public TimelineResponse(List<PostResponse> posts, Long nextCursor, boolean hasMore) {
        this.posts = posts;
        this.nextCursor = nextCursor;
        this.hasMore = hasMore;
    }

    public List<PostResponse> getPosts() { return posts; }
    public Long getNextCursor() { return nextCursor; }
    public boolean isHasMore() { return hasMore; }
}
