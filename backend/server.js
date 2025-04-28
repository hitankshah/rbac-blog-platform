require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Configure CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware for logging requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log(`Request body type: ${typeof req.body}`);
  console.log(`Request Content-Type: ${req.get('Content-Type')}`);
  
  if (req.body && typeof req.body === 'object') {
    console.log(`Request body keys: ${JSON.stringify(Object.keys(req.body))}`);
  } else {
    console.log(`Request body is empty or undefined`);
  }
  
  next();
});

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const blogRoutes = require('./routes/blog');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/blog', blogRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Handle Supabase auth errors
  if (err.__isAuthError) {
    return res.status(401).json({
      message: 'Authentication error: ' + (err.message || 'Invalid token'),
      code: err.code || 'AUTH_ERROR'
    });
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    code: err.code
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});