// src/db/mongo.js
const mongoose = require('mongoose');

async function connectMongo(uri) {
  if (!uri) throw new Error('MONGODB_URI not set');
  // useUnifiedTopology and useNewUrlParser defaults are handled by mongoose v6+
  await mongoose.connect(uri, {
    autoIndex: true,
  });
  console.log('Connected to MongoDB');
}

module.exports = { connectMongo, mongoose };
