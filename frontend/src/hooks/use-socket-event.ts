"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";

/** Subscribe to a server push for the lifetime of the component. */
export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const s = getSocket();
    const fn = (payload: T) => ref.current(payload);
    s.on(event, fn);
    return () => {
      s.off(event, fn);
    };
  }, [event]);
}

/** Run `fn` now (if connected) and again after every reconnect — rooms are lost when a socket drops. */
export function useOnSocketConnect(fn: () => void, deps: unknown[]) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    const s = getSocket();
    const run = () => ref.current();
    if (s.connected) run();
    s.on("connect", run);
    return () => {
      s.off("connect", run);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
