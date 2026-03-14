"use client";

import { useEffect, useRef } from "react";
import { getCashierEventsUrl } from "@/lib/api";

type UseCashierEventsOptions = {
  token: string;
  enabled?: boolean;
  onEvent: () => void | Promise<void>;
};

export function useCashierEvents({ token, enabled = true, onEvent }: UseCashierEventsOptions) {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || !token) {
      return;
    }

    const eventSource = new EventSource(getCashierEventsUrl(token));

    const handleEvent = () => {
      void onEventRef.current();
    };

    eventSource.addEventListener("order.created", handleEvent);
    eventSource.addEventListener("order.updated", handleEvent);

    return () => {
      eventSource.removeEventListener("order.created", handleEvent);
      eventSource.removeEventListener("order.updated", handleEvent);
      eventSource.close();
    };
  }, [enabled, token]);
}