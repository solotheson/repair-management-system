const mongoose = require('mongoose');

require('dotenv').config();

let didInit = false;

async function connectToMongo() {
  if (didInit) return mongoose.connection;
  didInit = true;

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI_is_required');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
  return mongoose.connection;
}

module.exports = { connectToMongo };
