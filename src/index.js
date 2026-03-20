
import express  from  'express';
import http from 'http';
import { attachWebsocketServer } from './ws/wserver.js';
import { securityMiddleware } from './arcjet.js';

// Route imports
import {matchRouter} from "./routes/matches.js";

// Initialize Express app
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '0.0.0.0';
const app = express();
const server = http.createServer(app);


// Apply security middleware
app.use(securityMiddleware());

// Use JSON middleware
app.use(express.json());

// Root GET route
app.get('/', (req, res) => {
	res.json({ message: 'API is up and running!' });
});


// Router for /matches endpoint
app.use("/matches", matchRouter);


// Attach WebSocket server and get broadcasting functions
const { broadcastMatchCreated } = attachWebsocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;



server.listen(PORT, HOST, () => {
	const baseUrl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
	console.log(`HTTP Server is running at ${baseUrl}`);
	console.log(`WebSocket server is available at ws://${HOST}:${PORT}/ws`);
});
