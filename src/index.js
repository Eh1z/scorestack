
import express  from  'express';
const app = express();

// Use JSON middleware
app.use(express.json());

// Root GET route
app.get('/', (req, res) => {
	res.json({ message: 'API is up and running!' });
});

const PORT = 8000;
app.listen(PORT, () => {
	console.log(`Server is running on  http://localhost:${PORT}`);
});
