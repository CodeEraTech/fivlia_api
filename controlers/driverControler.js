const driver = require('../modals/driver')
const User = require('../modals/User');
const Assign = require('../modals/driverModals/assignments')
const {Order} = require('../modals/order')
const {SettingAdmin} = require('../modals/setting')
const request = require('request');
const {getAgenda} = require("../config/agenda");
const Address = require('../modals/Address')
const OtpModel = require("../modals/otp")
const { generateAndSendInvoice } = require('../config/invoice');
const Transaction = require('../modals/driverModals/transaction')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const order = require('../modals/order');

exports.driverLogin = async(req,res) => {
    try {
const {mobileNumber, password, fcmToken} = req.body

const exist = await driver.findOne({
      "address.mobileNo": mobileNumber});
console.log(exist)
if(!exist){
    return res.status(400).json({message:"User Not Found"})
}
console.log(exist.password)
if(exist.password !== password){
    return res.status(400).json({message:"Invalid Credentials"})
}
await driver.findOneAndUpdate(  { _id: exist._id },{ fcmToken: fcmToken },{new:true})
const token = jwt.sign({ _id: exist._id }, process.env.jwtSecretKey);
return res.status(200).json({message:"Login Successful",   DriverDetails: {
        id: exist._id,
        name: exist.driverName,
        mobile: exist.address.mobileNo,
        email: exist.email,
        image:exist.image
      },
      token
    })
} catch (error) {
      console.error(error);
      return res.status(500).json({message:"An error occured"})      
    }
}

exports.acceptOrder = async (req,res) => {
  try {
    const {orderId, status, driverId} = req.body
   
const driverData = await driver.findOne({_id:driverId})
    if(status === true){
 const order = await Order.findOneAndUpdate({orderId},{driver: {
            driverId: driverData.driverId,
            name: driverData.driverName,
            mobileNumber: driverData.address.mobileNo,
          },orderStatus: "Going to Pickup"},{new:true})
    }
    if(status === false){
    await Assign.create({driverId,orderId})
    return res.status(200).json({message:"Order Canceled"})
    }
     return res.status(200).json({message:"Order Accepted"})
  } catch (error) {
     console.error(error);
     return res.status(500).json({message:"An error occured"}) 
  }
}

exports.driverOrderStatus = async (req, res) => {
  try {
    const { orderStatus, orderId, otp } = req.body;

    // ===> On The Way block
    if (orderStatus === 'On The Way') {
      const setting = await SettingAdmin.findOne();
      const authSettings = setting?.Auth?.[0] || {};

      const order = await Order.findOne({ orderId });
      if (!order) return res.status(404).json({ message: 'Order not found' });

      const user = await User.findOne({ _id: order.userId });
      if (!user) return res.status(404).json({ message: 'User not found' });

      const generatedOtp = Math.floor(100000 + Math.random() * 900000);
      const mobileNumber = user.mobileNumber;

      const options = {
        method: 'POST',
        url: 'https://msggo.in/wapp/public/api/create-message',
        headers: {},
        formData: {
          appkey: authSettings.whatsApp.appKey,
          authkey: authSettings.whatsApp.authKey,
          to: mobileNumber,
          message: `Welcome to Fivlia - Delivery in Minutes!\nYour OTP is ${generatedOtp}. Do not share it with anyone.`,
        },
      };

      request(options, async function (error, response) {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Failed to send OTP via WhatsApp' });
        }

        await OtpModel.create({
          mobileNumber,
          orderId,
          otp: generatedOtp,
          expiresAt: Date.now() + 1 * 60 * 60 * 1000,
        });

        const statusUpdate = await Order.findOneAndUpdate(
          { orderId },
          { orderStatus },
          { new: true }
        );

        return res.status(200).json({
          message: `OTP sent via WhatsApp to ${mobileNumber}`,
          otp: generatedOtp,
          statusUpdate,
        });
      });

      return;
    }

    if (orderStatus === 'Delivered') {
      const otpRecord = await OtpModel.findOne({ orderId, otp });
      if (!otpRecord) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }

      if (otpRecord.expiresAt < Date.now()) {
        return res.status(400).json({ message: 'OTP expired' });
      }

      const statusUpdate = await Order.findOneAndUpdate(
        { orderId },
        { orderStatus },
        { new: true }
      );

      await OtpModel.deleteOne({ _id: otpRecord._id });
      await Assign.deleteOne({ orderId: orderId ,orderStatus:'Accepted'});
      generateAndSendInvoice(orderId);

      return res.status(200).json({
        message: 'Order Delivered Successfully',
        statusUpdate,
      });
    }

    // ===> Other status update (fallback)
    const statusUpdate = await Order.findOneAndUpdate(
      { orderId },
      { orderStatus },
      { new: true }
    );

    return res.status(200).json({
      message: 'Status Updated Successfully',
      statusUpdate,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred' });
  }
};

exports.acceptedOrder = async(req,res)=>{
  try {
    const {mobileNumber} = req.params
    const AcceptedOrders = await Order.find({'driver.mobileNumber':mobileNumber, orderStatus: { $in: ['On The Way', 'Going to Pickup'] }})
    const enrichedOrders = await Promise.all(AcceptedOrders.map(async (order) => {
      const address = await Address.findById(order.addressId);

      return {
        ...order.toObject(),
        name: address?.fullName,
        contact: address?.mobileNumber,
        userLat: address?.latitude ,
        userLng: address?.longitude
      };
    }));

    return res.status(200).json({ message: 'Orders', enrichedOrders });
  } catch (error) {
     console.error(error);
     return res.status(500).json({message:"An error occured"})  
  }
}

exports.updateDriverStatus = async (driverId, status) => {
  try {
    const drivers = await driver.findById(driverId);
    if (!drivers) return { success: false, message: "Driver not found" };

    drivers.activeStatus = status;
    await drivers.save();

    return { success: true };
  } catch (error) {
    console.error("Update failed", error);
    return { success: false, message: "Internal error" };
  }
};

exports.activeStatus = async (req, res) => {
  try {
    const { driverId, status } = req.body;
    const result = await exports.updateDriverStatus(driverId, status);

    if (result.success) {
      return res.status(200).json({ message: 'Status Changed' });
    } else {
      return res.status(500).json({ message: result.message || 'Failed to update status' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred" });
  }
};

exports.driverWallet = async (req, res) => {
  try {
    const { orderId } = req.params;
    // If orderId is MongoDB _id, use: { _id: orderId }
    const order = await Order.findOne({ orderId });
    if (!order || order.orderStatus !== "Delivered") {
      return res.status(400).json({ message: "Invalid order or not delivered" });
    }

    const payout = order.deliveryCharges;
    // If you have order.driver.driverId, use that for more reliability
    const updatedDriver = await driver.findOneAndUpdate(
      { "address.mobileNo": order.driver.mobileNumber },
      { $inc: { wallet: payout } },
      { new: true }
    );
    if (!updatedDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    await Transaction.create({
      driverId: updatedDriver._id,
      type: "credit",
      amount: payout,
      orderId: order._id,
      description: `Payout for Order #${orderId}`,
    });

    return res.status(200).json({ message: "Wallet updated and transaction logged" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred" });
  }
};

exports.transactionList = async (req,res) => {
  try {
    const {driverId} = req.params
    const transactionList = await Transaction.find({driverId})
    const driverWallet = await driver.findOne({'_id':driverId})
    totalAmount = driverWallet.wallet
    return res.status(200).json({message:'Transaction List',transactionList,totalAmount})
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred" });
  }
}
exports.cancelOrders = async(req,res)=> {
  try {
    const {driverId} = req.params
    const Canceled = await Assign.find({driverId,orderStatus:'Rejected'})
    return res.status(200).json({message:"Canceled Orders",Canceled})
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred" });
  }
}

exports.completedOrders = async (req,res) => {
  try {
    const {mobileNumber} = req.params
    const order = await Order.find({'driver.mobileNumber':mobileNumber,orderStatus:'Delivered'})
    return res.status(200).json({ message: 'Completed Orders', order}); 
  } catch (error) {
   console.error(error);
   return res.status(500).json({ message: 'Server error', error: error.message}); 
  }
}

exports.getDriverDetail = async (req,res) => {
  try {
    const {id} = req.params
    const Driver = await driver.findById(id)
    return res.status(200).json({ message: 'Drivers', Driver}); 
  } catch (error) {
   console.error(error);
   return res.status(500).json({ message: 'Server error', error: error.message}); 
  }
}

exports.editProfile = async(req,res)=>{
  try {
    const {id} = req.params
    const {password} = req.body
     const image = req.files?.image?.[0]?.location;

const updateData = {};

    if (password) {
      updateData.password = password;
    }

    if (image) {
      const pathOnly = new URL(image).pathname;
      updateData.image = pathOnly;
    }
    const Profile = await driver.findByIdAndUpdate(id,updateData,{ new: true } )
    console.log(Profile)
    return res.status(200).json({message:"Profile Updated"})
  } catch (error) {
   console.error(error);
   return res.status(500).json({ message: 'Server error', error: error.message});  
  }
}

exports.deleteDriver = async(req,res)=>{
  try{
const {id} = req.params
const deleteDriver = await driver.findByIdAndDelete(id)
return res.status(200).json({message:"Driver Deleted"})
  }
  catch{
    console.error(error);
   return res.status(500).json({ message: 'Server error', error: error.message});  
  }
}