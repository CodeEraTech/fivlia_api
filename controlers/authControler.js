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
exports.Login = async (req,res) => {
  try {
    let { mobileNumber, userId, fcmToken } = req.body;

    if (!mobileNumber || !userId || !fcmToken) {
      return res.status(400).json({ message: "Pls Provide All Credentials", status: 2 });
    }

    // Clean mobile number
    if (mobileNumber.startsWith('+91')) {
      mobileNumber = mobileNumber.slice(3);
    } else if (mobileNumber.startsWith('91') && mobileNumber.length === 12) {
      mobileNumber = mobileNumber.slice(2);
    }

    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({ status: 2, message: 'Invalid mobile number format' });
    }

    const formattedNumber = `+91${mobileNumber}`;

    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUser(userId);
    } catch (err) {
      return res.status(404).json({
        status: 2,
        message: "Firebase UID not found",
        error: err.message,
      });
    }

    if (!firebaseUser || firebaseUser.phoneNumber !== formattedNumber) {
      return res.status(401).json({ status: 2, message: "Firebase UID and mobile number do not match" });
    }

    const exist = await User.findOne({ mobileNumber: formattedNumber });
    console.log(exist);

    await User.updateOne({ mobileNumber: formattedNumber }, { $set: { userId, fcmToken } });

    const token = jwt.sign({ _id: exist._id }, process.env.jwtSecretKey);
    return res.status(200).json({ status: 1, message: "Login Successfully", token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 2, message: "Error in login", error: error.message });
  }
};

exports.register = async (req, res) => {
  try {
    let { mobileNumber, userId, fcmToken } = req.body;

    if (!mobileNumber || !userId || !fcmToken) {
      return res.status(400).json({status: 2, message: "Please provide all credentials", status: false });
    }

    // Remove non-digit characters from mobile
    mobileNumber = mobileNumber.replace(/\D/g, '');

if (mobileNumber.startsWith('+91')) {
  mobileNumber = mobileNumber.slice(3);
} else if (mobileNumber.startsWith('91') && mobileNumber.length === 12) {
  mobileNumber = mobileNumber.slice(2);
}


    // Validate format: must start with 6-9 and be exactly 10 digits
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({ status: 2, message: 'Invalid mobile number format' });
    }

    // Format number with +91
    const formattedNumber = `+91${mobileNumber}`;

    // Get Firebase user data
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUser(userId);
    } catch (err) {
      return res.status(404).json({
        status: 2,
        message: "Firebase UID not found",
        error: err.message,
      });
    }

    // Match phone number exactly
    if (firebaseUser.phoneNumber !== formattedNumber) {
      return res.status(401).json({
        status: 1,
        message: "Firebase UID and mobile number do not match",
      });
    }

    // Create new user
    const newUser = await User.create({
      mobileNumber: formattedNumber,
      userId,
      fcmToken,
    });

    // Sign JWT token
    const token = jwt.sign({ _id: newUser._id }, process.env.jwtSecretKey);

    return res.status(200).json({
      status: 1,
      message: "Login Successfully",
      token,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 2,
      message: "Error in registration",
      error: error.message,
    });
  }
};

exports.verifyMobile = async (req, res) => {
  try {
    let { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ status: 2, message: 'Mobile number is required' });
    }

    // Clean the number: remove +91 or 91 if present
    if (mobileNumber.startsWith('+91')) {
      mobileNumber = mobileNumber.slice(3);
    } else if (mobileNumber.startsWith('91') && mobileNumber.length === 12) {
      mobileNumber = mobileNumber.slice(2);
    }

    // Now validate if it's proper Indian format (starts 6-9 and 10 digits)
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({ status: 2, message: 'Invalid mobile number format' });
    }

    // Format with +91 to match DB
    const formattedNumber = `+91${mobileNumber}`;

    // Check if user exists
    const exist = await User.findOne({ mobileNumber: formattedNumber });
    console.log('Formatted:', formattedNumber, 'User:', exist);

    if (!exist) {
      return res.status(200).json({ status: 0, message: 'User Not Found' });
    }

    return res.status(200).json({ status: 1, message: 'User Found' });

  } catch (error) {
    return res.status(500).json({ status: 2, message: 'Server Error', error: error.message });
  }
};
