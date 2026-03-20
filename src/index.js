
import express  from  'express';

// Route imports
import {matchRouter} from "./routes/matches.js";

// Initialize Express app
const app = express();
const PORT = 8000;

// Use JSON middleware
app.use(express.json());

// Root GET route
app.get('/', (req, res) => {
	res.json({ message: 'API is up and running!' });
});
// Router for /matches endpoint
app.use("/matches", matchRouter);





app.listen(PORT, () => {
	console.log(`Server is running on  http://localhost:${PORT}`);
});
