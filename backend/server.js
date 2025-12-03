import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analyzeRoute from './routes/analyzeRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', analyzeRoute);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
