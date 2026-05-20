import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type { PostResponse } from '../types/post';

export function usePostBroadcast(onNewPost: (post: PostResponse) => void) {
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('/api/ws'),
      onConnect: () => {
        client.subscribe('/topic/posts', (message) => {
          const post: PostResponse = JSON.parse(message.body);
          onNewPost(post);
        });
      },
      reconnectDelay: 5000,
    });
    client.activate();
    return () => { client.deactivate(); };
  }, [onNewPost]);
}
