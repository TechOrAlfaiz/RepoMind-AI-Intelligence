import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IngestionProgressEvent } from "@repomind/shared-types";

interface SubscribedClient {
  ws: WebSocket;
  repoSubscriptions: Set<string>;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients = new Set<SubscribedClient>();
  private localListeners: Array<(event: IngestionProgressEvent) => void> = [];

  /**
   * Attaches WebSocket server to existing HTTP server.
   */
  attach(server: Server): void {
    if (this.wss) return;

    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws: WebSocket) => {
      const clientInfo: SubscribedClient = {
        ws,
        repoSubscriptions: new Set<string>(),
      };
      this.clients.add(clientInfo);

      ws.on("message", (raw: string) => {
        try {
          const data = JSON.parse(raw.toString());
          if (data.type === "subscribe" && data.repositoryId) {
            clientInfo.repoSubscriptions.add(String(data.repositoryId));
          } else if (data.type === "unsubscribe" && data.repositoryId) {
            clientInfo.repoSubscriptions.delete(String(data.repositoryId));
          }
        } catch {
          // Ignore invalid client frames
        }
      });

      ws.on("close", () => {
        this.clients.delete(clientInfo);
      });

      ws.on("error", () => {
        this.clients.delete(clientInfo);
      });
    });

    console.log("[RepoMind WebSocket] Realtime server listening on /ws");
  }

  /**
   * Register in-process callback listener (useful for tests and decoupled modules).
   */
  onProgress(listener: (event: IngestionProgressEvent) => void): () => void {
    this.localListeners.push(listener);
    return () => {
      this.localListeners = this.localListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Broadcasts ingestion progress to connected WebSocket clients and local listeners.
   */
  broadcastProgress(event: IngestionProgressEvent): void {
    // Notify in-process listeners
    for (const listener of this.localListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("[RepoMind WebSocket] Local listener error:", err);
      }
    }

    if (!this.wss) return;

    const message = JSON.stringify({
      type: "ingestion:progress",
      ...event,
      payload: event,
    });

    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Send if client subscribed to this repo, or if subscribed to all
        if (
          client.repoSubscriptions.size === 0 ||
          client.repoSubscriptions.has(event.repositoryId)
        ) {
          try {
            client.ws.send(message);
          } catch {
            // Ignore send failures on transient sockets
          }
        }
      }
    }
  }

  /**
   * Returns current active client connection count.
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Closes the WebSocket server.
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.wss) {
        resolve();
        return;
      }
      this.wss.close(() => {
        this.wss = null;
        this.clients.clear();
        resolve();
      });
    });
  }
}

export const webSocketService = new WebSocketService();
