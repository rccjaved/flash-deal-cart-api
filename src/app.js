require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes');
const { connect } = require('./redisClient');
const { connectMongo } = require('./db/mongo');
const { startWorker } = require('./worker/expiryWorker');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(bodyParser.json());

const limiter = rateLimit({ windowMs: 15 * 1000, max: 100 });
app.use(limiter);

app.use('/api', routes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Internal Error' });
});

const PORT = process.env.PORT || 3000;
async function start() {
  await connect(); // redis
  await connectMongo(process.env.MONGODB_URI); // mongodb
  app.listen(PORT, () => console.log(`Listening on ${PORT}`));
  startWorker(5000);
}
start();
