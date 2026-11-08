require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const app = require('./app');
const { scheduleMonthlyReports } = require('./utils/monthlyReportCron');

const PORT = process.env.PORT || 5000;

connectDB();

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  // In a horizontally-scaled deployment every replica would fire the cron job,
  // so it can be switched off per environment with ENABLE_CRON=false.
  if (process.env.ENABLE_CRON !== 'false') {
    scheduleMonthlyReports();
  }
});

// Graceful shutdown so rolling deployments / scale-in don't drop in-flight requests.
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await mongoose.connection.close(false).catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
