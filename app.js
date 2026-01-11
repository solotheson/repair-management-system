const path = require('path');
const cors = require('cors');
const logger = require('morgan');
const express = require('express');
const cookieParser = require('cookie-parser');
const registerAppRoutes = require('./routes');
const { connectToMongo } = require('./services/db/mongo');

require('dotenv').config();

const appServer = express();

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
appServer.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  optionsSuccessStatus: 204,
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
}));

appServer.use(logger('dev'));
appServer.use(express.json());
appServer.use(express.urlencoded({ extended: false }));
appServer.use(cookieParser());
appServer.use(express.static(path.join(__dirname, 'public')));

connectToMongo().catch((error) => {
  console.error('Mongo connection failed:', error);
});

registerAppRoutes({ appServer });

module.exports = appServer;
