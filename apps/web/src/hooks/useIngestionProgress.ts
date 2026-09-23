import { useState, useEffect, useRef } from "react";
import type { IngestionProgressEvent } from "@repomind/shared-types";

interface UseIngestionProgressOptions {
  repositoryId?: string;
  wsUrl?: string;
  onComplete?: (event: IngestionProgressEvent) => void;
  onError?: (event: IngestionProgressEvent) => void;
}

export function useIngestionProgress({
  repositoryId,
  wsUrl = "ws://localhost:4000/ws",
  onComplete,
  onError,
}: UseIngestionProgressOptions) {
  const [progress, setProgress] = useState<IngestionProgressEvent | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [history, setHistory] = useState<IngestionProgressEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!repositoryId) return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    function connect() {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setIsConnected(true);
          // Subscribe to repository events
          socket?.send(
            JSON.stringify({
              type: "subscribe",
              repositoryId,
            }),
          );
        };

        socket.onmessage = (event) => {
          try {
            const data: IngestionProgressEvent = JSON.parse(event.data);
            if (data.repositoryId === repositoryId) {
              setProgress(data);
              setHistory((prev) => [...prev.slice(-49), data]);

              if (data.stage === "completed") {
                onComplete?.(data);
              } else if (data.stage === "error") {
                onError?.(data);
              }
            }
          } catch (e) {
            // Non-JSON or heartbeat
          }
        };

        socket.onclose = () => {
          setIsConnected(false);
          // Reconnect after 3 seconds if component still mounted
          reconnectTimeout = setTimeout(connect, 3000);
        };

        socket.onerror = () => {
          setIsConnected(false);
        };
      } catch (err) {
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "unsubscribe",
              repositoryId,
            }),
          );
          socket.close();
        }
      }
    };
  }, [repositoryId, wsUrl]);

  return {
    progress,
    isConnected,
    history,
    resetProgress: () => setProgress(null),
  };
}
