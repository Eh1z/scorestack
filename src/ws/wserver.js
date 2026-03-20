import { WebSocket, WebSocketServer } from "ws";
import { wsArcjetConfig } from "../arcjet.js";

// In-memory map to track WebSocket clients subscribed to specific match updates
const matchSubscribers = new Map();

// Subscribe a WebSocket client to updates for a specific match
function subscribeToMatch(matchId, socket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }
  matchSubscribers.get(matchId).add(socket);
}

// Unsubscribe a WebSocket client from updates for a specific match
function unsubscribeFromMatch(matchId, socket) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) return;

  if (subscribers) {
    subscribers.delete(socket);
    if (subscribers.size === 0) {
      matchSubscribers.delete(matchId);
    }
  }
}

// Clean up all subscriptions for a WebSocket client (e.g., when it disconnects)
function cleanupSubscriptions(socket) {
  for (const matchId of socket.subscriptions) {
    unsubscribeFromMatch(matchId, socket);
  }
}

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}

// Broadcast a message to all connected WebSocket clients
function broadcastToAll(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
}

// Notify all subscribed clients about an update to a specific match
function broadcastMatchUpdate(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers || subscribers.size === 0) return;

  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "match_update", data: payload }));
    }
  }
}

function handleBroadcastMessage(socket, data) {
  let message;

  try {
    message = JSON.parse(data.toString());
  } catch (error) {
    sendJson(socket, { type: "error", message: "Invalid message format" });
  }

  if (message?.type === "subscribe" && Number.isInteger(message.matchId)) {
    subscribeToMatch(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: "subscribed", matchId: message.matchId });
  }

  if (message?.type === "unsubscribe" && Number.isInteger(message.matchId)) {
    unsubscribeFromMatch(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, { type: "unsubscribed", matchId: message.matchId });
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

    ws.subscriptions = new Set();

    ws.on("message", (data) => {
      handleBroadcastMessage(ws, data);
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

   

    ws.on("error", (error) => {
      ws.terminate();
      console.error("WebSocket error:", error);
    });

     ws.on("close", () => {
      console.log("Websocket Client disconnected");
      cleanupSubscriptions(ws);
      clearInterval(heartbeatInterval);
    });
  });

  function broadcastMatchCreated(match) {
    broadcastToAll(wsServer, { type: "match_created", data: match });
  }

  function  broadcastCommentaryUpdate(matchId, commentary) {
  broadcastMatchUpdate(matchId, { type: "commentary_update", data: commentary });
}

  return {
    broadcastMatchCreated,
    broadcastCommentaryUpdate
  };
}
