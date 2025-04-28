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

// Body parsers - important for handling multipart form data correctly
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
  
  // Log environment check for debugging
  if (req.url === '/api/blog' && req.method === 'POST') {
    console.log('Environment check for blog post:');
    console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
    console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing');
    console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing');
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
    timestamp: new Date().toISOString(),
    env: {
      node: process.version,
      supabaseUrl: process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing'
    }
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Not Found' });
});

// Global error handler with detailed error information
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  
  const errorResponse = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };
  
  // Include more details in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
    errorResponse.detail = err.detail || err.error || err.data;
  }
  
  res.status(errorResponse.status).json(errorResponse);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/api/health`);
});