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

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

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

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
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
