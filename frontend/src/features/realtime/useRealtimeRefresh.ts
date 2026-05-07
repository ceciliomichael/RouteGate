"use client";

import { useEffect, useRef } from "react";

export const REALTIME_STREAM_PATH = "/api/events";

export const REALTIME_EVENT_TYPES = {
  routesChanged: "routes.changed",
  usersChanged: "users.changed",
} as const;

export type RealtimeEventType =
  (typeof REALTIME_EVENT_TYPES)[keyof typeof REALTIME_EVENT_TYPES];

interface UseRealtimeRefreshOptions {
  enabled: boolean;
  eventType: RealtimeEventType | null;
  onRefresh: () => void | Promise<void>;
}

export function useRealtimeRefresh({
  enabled,
  eventType,
  onRefresh,
}: UseRealtimeRefreshOptions): void {
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled || eventType === null) {
      return;
    }

    const source = new EventSource(REALTIME_STREAM_PATH);
    const handleEvent = () => {
      void refreshRef.current();
    };

    source.addEventListener(eventType, handleEvent);

    source.onerror = () => {
      // EventSource reconnects automatically. The handler is intentionally
      // empty so transient disconnects do not interrupt the open page.
    };

    return () => {
      source.removeEventListener(eventType, handleEvent);
      source.close();
    };
  }, [enabled, eventType]);
}
