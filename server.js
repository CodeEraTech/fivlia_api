const express = require('express');
require('dotenv').config()

const connectDb = require('./database/database')

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

const authRoutes = require('./routes/route');
const zonesRoute = require('./routes/route');
app.get('/',(req,res)=>{
    res.send('social media api is running ...')
})
app.use('/fivlia',authRoutes);
app.use('/',zonesRoute);
app.listen(5000,()=> console.log('Server Running On 5000'))