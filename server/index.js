import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv'
import router from './route/route.js';
dotenv.config()
const app = express()

// Middleware
app.use(cors())
app.use(express.json())

app.use('/api/shop',router)

app.listen(5000, () => {
    console.log('Server is running on port 5000');
});



