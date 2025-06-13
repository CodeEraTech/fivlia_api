const User = require('../modals/User');
const jwt = require('jsonwebtoken');
const admin = require('../firebase/firebase');
const mongoose = require("mongoose");
const Login = mongoose.model("Login", new mongoose.Schema({}, { strict: false }), "Login");
require('dotenv').config()
// exports.sign = async (req,res) => {
//     const{mobileNumber}=req.body
//     const exist = User.find({mobileNumber})
//     if(exist){
//         const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRET, {expiresIn: '1d'});
//       return res.status(200).json({ message: 'Login successful', token });
//     }
// const otp = '1234'
// if()
// }


exports.users = async (req,res) => {
    try {
    const user=await Login.find()
    res.json(user)
     } catch (error) {
        console.error(error);
        res.status(500).json({message:"Error"})
    }
}


exports.addUser = async (req, res) => {
  try {
    const { name, password, mobileNumber, email, state, city, zone } = req.body;
    const image = req.files?.image[0].path
    const newUser = await User.create({
      name,
      password,
      mobileNumber,
      email,
      state,
      image,
      city,
      zone
    });

    return res.status(200).json({
      message: 'User added successfully',
      data: newUser
    });

  } catch (error) {
    console.error('Add User Error =>', error);
    return res.status(500).json({
      message: 'An error occurred while adding the user',
      error: error.message
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {name,password,mobileNumber,email,state,city,Address,otp} = req.body;
const image = req.files?.image?.[0].path
    const updatedUser = await User.findByIdAndUpdate(userId,
      {$set: {name,password,mobileNumber,email,state,city,image,Address,otp}},{ new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update Profile Error =>', error);
    return res.status(500).json({
      message: 'An error occurred while updating the profile',
      error: error.message
    });
  }
};

exports.sign = async (req,res) => {
  try {
  const {mobileNumber, userId, fcmToken} = req.body

if(!mobileNumber || !userId || !fcmToken){
return res.status(400).json({message:"Pls Provide All Credentials",status:false})
}


   let firebaseUser;
try {
  firebaseUser = await admin.auth().getUser(userId);
} catch (err) {
  return res.status(404).json({
    status: false,
    message: "Firebase UID not found",
    error: err.message,
  });
}

    // 2. Match mobileNumber with Firebase phoneNumber
    if (firebaseUser.phoneNumber !== mobileNumber || !firebaseUser) {
      return res.status(401).json({status:false, message: "Firebase UID and mobile number do not match" });
    }

    const exist =await User.findOne({mobileNumber})
console.log(exist);

if(!exist){
const newUser = await User.create({mobileNumber,userId,fcmToken})
const token = jwt.sign({ _id:newUser._id }, process.env.jwtSecretKey);
 return res.status(200).json({status:true,message:"Login Successfuly",token})
}



const data = await User.updateOne({mobileNumber},{$set:{userId,fcmToken}})
const token = jwt.sign({ _id:exist._id }, process.env.jwtSecretKey);
console.log(data);
return res.status(200).json({status:true,message:"Login Successfuly",token})
} catch (error) {
  console.error(error);
    return res.status(500).json({status:false,message:"Error in login",error:error.message})
  }
}