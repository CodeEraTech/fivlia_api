const express = require('express');
require('dotenv').config()
const connectDb = require('./database/database')
require('./config/scheduler/notification')

const cors = require('cors')
connectDb();

const app = express()
app.use(cors())
app.use(express.json())

// app.use((req, res, next) => {
//   const start = Date.now();
//   res.on('finish', () => {
//     const duration = Date.now() - start;
//     console.log(`[${req.method}] ${req.originalUrl} - ${duration}ms`);
//   });
//   next();
// });
const PORT = process.env.PORT || 5000;
const host = process.env.HOST || undefined
const authRoutes = require('./routes/route');
const zonesRoute = require('./routes/route');
app.get('/',(req,res)=>{
    res.send('Fivlia api is running ...')
})
app.use('/fivlia',authRoutes);
app.use('/',zonesRoute);
app.listen(PORT,host,()=> console.log(`Server Running On http://${host}:${PORT}`))