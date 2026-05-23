package com.timeline.dto;

import java.util.List;

public record TimelineResponse(List<PostResponse> posts, Long nextCursor, boolean hasMore) {
}
