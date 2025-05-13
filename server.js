const express = require('express');
require('dotenv').config()

const connectDb = require('./database/database')

const cors = require('cors')
connectDb();

const app = express()
app.use(cors())
app.use('/uploads', express.static('uploads'));
app.use(express.json())
const authRoutes = require('./routes/route')
app.get('/',(req,res)=>{
    res.send('social media api is running ...')
})
app.use('/fivlia/',authRoutes);
app.listen(5000,()=> console.log('Server Running On 5000'))