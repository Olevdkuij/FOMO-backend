require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const venuesRouter = require('./src/routes/venues');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('FOMO backend is running');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', mongoConnected: mongoose.connection.readyState === 1 });
});

app.use('/api/venues', venuesRouter);

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error('MongoDB connection failed:', err.message);
    }
  } else {
    console.log('No MONGODB_URI set, skipping DB connection for now');
  }

  app.listen(port, () => {
    console.log(`FOMO backend listening at http://localhost:${port}`);
  });
}

start();
