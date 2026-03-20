import { WebSocket, WebSocketServer } from "ws";

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

  wsServer.on("connection", (ws) => {
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
