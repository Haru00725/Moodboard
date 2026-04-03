require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const { generalLimiter } = require('./middleware/rateLimit.middleware');
const logger = require('./utils/logger');

// ------------------------------------------------------------------
// App Init
// ------------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 5001;

// ------------------------------------------------------------------
// Security Middleware
// ------------------------------------------------------------------
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow image serving
}));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ------------------------------------------------------------------
// General Middleware
// ------------------------------------------------------------------
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// HTTP request logging
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) },
    skip: (req) => req.path === '/api/health',
  })
);

// Serve uploaded files as static assets
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'), {
    maxAge: '7d',
    etag: true,
  })
);

// ------------------------------------------------------------------
// Rate Limiting (global)
// ------------------------------------------------------------------
app.use('/api', generalLimiter);

// ------------------------------------------------------------------
// API Routes
// ------------------------------------------------------------------
app.use('/api', routes);

// ------------------------------------------------------------------
// Root route
// ------------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    name: 'LoversAI API',
    version: '1.0.0',
    status: 'running',
    docs: '/api/health',
  });
});

// ------------------------------------------------------------------
// Error Handling
// ------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

// ------------------------------------------------------------------
// Unhandled errors
// ------------------------------------------------------------------
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason, promise });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

// ------------------------------------------------------------------
// Graceful shutdown
// ------------------------------------------------------------------
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// ------------------------------------------------------------------
// Start
// ------------------------------------------------------------------
let server;

const start = async () => {
  await connectDB();
  server = app.listen(PORT, () => {
    logger.info(`LoversAI API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
  // Increase server timeout for long AI generation requests (5 min)
  server.timeout = 300000;
  server.keepAliveTimeout = 300000;

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

start();

module.exports = app;
