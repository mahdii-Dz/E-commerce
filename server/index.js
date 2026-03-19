import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv'
import router from './route/route.js';
import CloudinaryRouter from './controllers/routeUpload.js';
dotenv.config()
const app = express()

// Middleware
app.use(
  cors({
    origin: ["https://e-commerce-tarek.netlify.app", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json())

app.use('/api/shop',router)
app.use('/cloudinary', CloudinaryRouter)
app.listen(5000, () => {
    console.log('Server is running on port 5000');
});



