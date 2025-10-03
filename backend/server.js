/**
 * EnamelPure Lune Laser Management System - Backend Server
 * 
 * Express.js server that provides REST API endpoints for:
 * - User authentication and authorization
 * - Dental office management
 * - Lune machine tracking
 * - Invoice generation and management
 * - Payment processing (Stripe integration)
 * - Email notifications
 * 
 * Features:
 * - JWT-based authentication
 * - SQLite database with automatic initialization
 * - CORS enabled for frontend communication
 * - Security headers with Helmet
 * - Request logging with Morgan
 * - Static file serving for production builds
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import API route handlers
const authRoutes = require('./routes/auth');
const dentalOfficesRoutes = require('./routes/dentalOffices');
const luneMachinesRoutes = require('./routes/luneMachines');
const invoicesRoutes = require('./routes/invoices');
const buttonUsageRoutes = require('./routes/buttonUsage');
const usersRoutes = require('./routes/users');
const paymentsRoutes = require('./routes/payments');

// Import database and services
const { initializeDatabase } = require('./scripts/initDatabase');
const emailService = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database on startup with error handling
initializeDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1); // Exit if database setup fails
  });

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - Allow all Vercel deployments
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);
    
    // Allow all Vercel deployments
    if (origin.includes('vercel.app')) return callback(null, true);
    
    // Allow specific origins
    const allowedOrigins = [
      'https://react-invoice-app-live.vercel.app',
      'https://react-invoice-app-enamel-pure.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For debugging - log the origin
    console.log('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
}));

// Additional CORS headers for preflight requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Trust proxy for rate limiting (required for Render deployment)
app.set('trust proxy', 1);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'EnamelPure Invoice API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'EnamelPure Invoice API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/dental-offices', dentalOfficesRoutes);
app.use('/api/lune-machines', luneMachinesRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/button-usage', buttonUsageRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/payments', paymentsRoutes);

// API-only mode - frontend served separately on Vercel
// Catch-all route for non-API requests
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.originalUrl
    });
  } else {
    res.status(200).json({
      message: 'EnamelPure Invoice Backend API',
      status: 'running',
      frontend: process.env.FRONTEND_URL || 'Frontend deployed separately',
      api_docs: '/api/health for health check',
      version: '1.0.0'
    });
  }
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, async () => {
  console.log(` EnamelPure Invoice API server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  
  // Test email service connection
  console.log(' Testing email service connection...');
  const emailConnected = await emailService.testConnection();
  if (emailConnected) {
    console.log('Email service connected successfully');
  } else {
    console.log('Email service not configured or connection failed');
  }
});

module.exports = app;
