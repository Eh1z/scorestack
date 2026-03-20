import { WebSocket, WebSocketServer } from "ws";
import { wsArcjetConfig } from "../arcjet.js";

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
}

export function attachWebsocketServer(server) {
  const wsServer = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wsServer.on("connection", async (ws, req) => {
    if (wsArcjetConfig) {
      try {
        const decision = await wsArcjetConfig.protect(req);
        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          const reason = decision.reason.isRateLimit()
            ? "Rate limit exceeded. Please try again later."
            : "Your connection has been blocked by security measures.";
          console.warn(`WebSocket connection denied: ${reason}`);
          ws.close(code, reason);
          return;
        }
      } catch (error) {
        console.error("Error processing Arcjet WebSocket connection:", error);
        ws.close(1011, "An error occurred while processing the connection.");
        return;
      }
    }

    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    sendJson(ws, { message: "Welcome to the ScoreStack WebSocket server!" });

    const heartbeatInterval = setInterval(() => {
      wsServer.clients.forEach((client) => {
        if (client.isAlive === false) {
          console.log("Terminating unresponsive WebSocket client");
          return client.terminate();
        }

        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    ws.on("close", () => {
      console.log("Websocket Client disconnected");
      clearInterval(heartbeatInterval);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  function broadcastMatchCreated(match) {
    broadcast(wsServer, { type: "match_created", data: match });
  }

  return {
    broadcastMatchCreated,
  };
}
