const mongoose = require('mongoose');

// Works for local MongoDB and Amazon DocumentDB. For DocumentDB the URI carries
// tls=true&tlsCAFile=...&replicaSet=rs0&retryWrites=false (see infra/terraform/secrets.tf).
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
