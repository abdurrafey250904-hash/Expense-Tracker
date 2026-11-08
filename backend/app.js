const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const reportRoutes = require('./routes/reports');
const budgetRoutes = require('./routes/budget');

const app = express();

// Behind AWS ALBs + Nginx: trust X-Forwarded-* headers for client IP / protocol.
app.set('trust proxy', true);
app.disable('x-powered-by');

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Structured access logs in production (shipped to CloudWatch), colourful logs in dev.
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Liveness/readiness probe used by the internal ALB target group and Docker HEALTHCHECK.
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.json({
    status: 'ok',
    db: dbState === 1 ? 'connected' : 'disconnected',
    version: process.env.APP_VERSION || 'dev',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/budget', budgetRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
