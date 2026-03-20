import {WebSocketServer, WebSocket} from 'ws';

const wss = new WebSocketServer({ port: 8080 });



// Connection established
wss.on('connection', (socket, request) => {
    const ip = request.socket.remoteAddress;

    socket.on('message', (rawData) => {
        const message = rawData.toString()
        console.log(`Received message from ${ip}: ${message}`);

        wss.clients.forEach((client) => {
            if(client.readyState === WebSocket.OPEN) {
                client.send(`Server Broadcast: ${message}`);
            }
        })
    })


    socket.on('error', (error) => {
        console.error(`Error on connection with ${ip}:`, error.message);
    })


    socket.on('close', (code, reason) => {
        console.log(`Connection with ${ip} closed: ${code} - ${reason}`);
    })
});

console.log('WebSocket server is running on ws://localhost:8080');