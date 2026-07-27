// index.js - Add this at the VERY TOP, before any other middleware
import express from 'express';
import cors from 'cors';
import router from './route/route.js';
import CloudinaryRouter from './controllers/routeUpload.js';
import { executeQuery } from './db.js';

const app = express();

// Simple health check with NO database
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


// Rest of your middleware
app.use(
  cors({
    origin: ["https://e-commerce-tarek.netlify.app", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.use('/api/shop', router);
app.use('/cloudinary', CloudinaryRouter);

const PORT = process.env.PORT || 5000;``
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));