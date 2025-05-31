const User = require('../modals/User');
const jwt = require('jsonwebtoken');
const mongoose = require("mongoose");
const Login = mongoose.model("Login", new mongoose.Schema({}, { strict: false }), "Login");

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
    const userId = req.user.id; // assuming you're using middleware to decode the token and attach `req.user`

    const {
      name,
      password,
      mobileNumber,
      email,
      state,
      city,
      Address,
      otp
    } = req.body;
const image = req.files?.image?.[0].path
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          name,
          password,
          mobileNumber,
          email,
          state,
          city,
          image,
          Address,
          otp
        }
      },
      { new: true }
    );

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
