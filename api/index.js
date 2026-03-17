const express = require('express');
const app = express();

// Middleware to parse JSON (useful for POST requests)
app.use(express.json());

// A sample GET route
app.get('/', (req, res) => {
  res.status(200).send('Welcome to your Node.js API on Vercel!');
});

// A sample API route with data
app.get('/api/user', (req, res) => {
  res.json({
    id: 1,
    name: 'Gemini User',
    status: 'Active',
    timestamp: new Date().toISOString()
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// Export for Vercel's serverless handler
module.exports = app;