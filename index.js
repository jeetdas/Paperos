require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const ocrRoutes = require('./routes/ocrRoutes');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
db.initializeDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', ocrRoutes);

// API route to get recent documents
app.get('/api/documents/recent', async (req, res) => {
  try {
    const documents = await db.getRecentDocuments();
    res.json(documents);
  } catch (error) {
    console.error('Error fetching recent documents:', error);
    res.status(500).json({ error: 'Failed to fetch recent documents' });
  }
});

// Root route - serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to test the API`);
}); 