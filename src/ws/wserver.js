
import { WebSocket, WebSocketServer } from "ws";

function sendJson(socket, payload){
    if(socket.readyState !== WebSocket.OPEN) return;


    socket.send(JSON.stringify(payload));
}


function broadcast(wss, payload){

    for (const client of wss.clients) {
            if(client.readyState !== WebSocket.OPEN) return;


    client.send(JSON.stringify(payload));
    }
}


export function attachWebsocketServer(server){

    const wsServer = new WebSocketServer({ server, path: "/ws", maxPayload: 1024 * 1024  });

    wsServer.on("connection", (ws) => {
        sendJson(ws, { message: "Welcome to the ScoreStack WebSocket server!" });

        ws.on("close", () => {
            console.log("Websocket Client disconnected");
        });

        ws.on("error", (error) => {
            console.error("WebSocket error:", error);
        });
    })

    function broadcastMatchCreated(match) {
        broadcast(wsServer, { type: "match_created", data: match });
    }

    return {
        broadcastMatchCreated,
    }
}