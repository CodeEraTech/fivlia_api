const driver = require('../modals/driver')
const Store = require('../modals/store')
const User = require('../modals/User');
const Assign = require('../modals/driverModals/assignments')
const {Order} = require('../modals/order')
const {SettingAdmin} = require('../modals/setting')
const request = require('request');
const {getAgenda} = require("../config/agenda");
const Address = require('../modals/Address')
const mongoose = require('mongoose');
const OtpModel = require("../modals/otp")
const admin = require("../firebase/firebase");
const admin_transaction = require('../modals/adminTranaction')
const store_transaction = require('../modals/storeTransaction')
const { FeeInvoiceId } = require("../config/counter");
const { generateAndSendThermalInvoice, generateStoreInvoiceId} = require('../config/invoice');
const Transaction = require('../modals/driverModals/transaction')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const order = require('../modals/order');

exports.driverLogin = async(req,res) => {
    try {
const {mobileNumber, password, fcmToken} = req.body

const exist = await driver.findOne({
      "address.mobileNo": mobileNumber});
// console.log(exist)
if(!exist){
    return res.status(400).json({message:"User Not Found"})
}
// console.log(exist.password)
if(exist.password !== password){
    return res.status(400).json({message:"Invalid Credentials"})
}
if (fcmToken) {
  await driver.findByIdAndUpdate(exist._id, { fcmToken });
}

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

 await OtpModel.findOneAndUpdate(
      { mobileNumber, orderId },
      { otp: generatedOtp, expiresAt: Date.now() + 60 * 60 * 1000 },
      { upsert: true, new: true }
    );

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
  let feeInvoiceId = await FeeInvoiceId(true); 
  const otpRecord = await OtpModel.findOne({ orderId, otp });
  if (!otpRecord) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }
  if (otpRecord.expiresAt < Date.now()) {
    return res.status(400).json({ message: 'OTP expired' });
  }

  const order = await Order.findOne({ orderId }).populate("userId").lean();
  const user = order.userId;

  if (!order) return res.status(404).json({ message: 'Order not found' });

  const storeBefore = await Store.findById(order.storeId).lean();
  const store = storeBefore; // just renaming for clarity

  // 🧮 Calculate total commission from order.items
 // 🧮 Calculate total commission as percentage
const totalCommission = order.items.reduce((sum, item) => {
  const itemTotal = item.price * item.quantity;
  const commissionAmount = (item.commision || 0) / 100 * itemTotal;
  return sum + commissionAmount;
}, 0);


  let creditToStore = order.totalPrice;
  if (!store.Authorized_Store) {
    creditToStore = order.totalPrice - totalCommission; // deduct commission
  }

  // ===> Update Store Wallet
  const storeData = await Store.findByIdAndUpdate(
    order.storeId,
    { $inc: { wallet: creditToStore } },
    { new: true }
  );

  // ===> Update Store Transaction
  const data = await store_transaction.create({
    currentAmount: storeData.wallet,
    lastAmount: storeBefore.wallet,
    type: 'Credit',
    amount: creditToStore,
    orderId: order.orderId,
    storeId: order.storeId,
    description: store.Authorized_Store
      ? 'Full amount credited (Authorized Store)'
      : `Credited after commission cut (${totalCommission} deducted)`
  });
// console.log(data)
  // ===> Update Admin Wallet only if commission > 0
  if (!store.Authorized_Store && totalCommission > 0) {
    const lastAmount = await admin_transaction.findById('6899c9b7eeb3a6cd3a142237').lean();
    const updatedWallet = await admin_transaction.findByIdAndUpdate(
      '6899c9b7eeb3a6cd3a142237',
      { $inc: { wallet: totalCommission } },
      { new: true }
    );

    await admin_transaction.create({
      currentAmount: updatedWallet.wallet,
      lastAmount: lastAmount.wallet,
      type: 'Credit',
      amount: totalCommission,
      orderId: order.orderId,
      description: 'Commission credited to Admin wallet'
    });
  }

  // ===> Generate Store Invoice ID
  const storeInvoiceId = await generateStoreInvoiceId(order.storeId);

  const statusUpdate = await Order.findOneAndUpdate(
    { orderId },
    { orderStatus, storeInvoiceId,feeInvoiceId,deliverStatus: true },
    { new: true }
  );

  // ✅ Clean up OTP and Assignments
  await OtpModel.deleteOne({ _id: otpRecord._id });
  await Assign.deleteOne({ orderId: orderId, orderStatus: 'Accepted' });

  // ✅ Generate Thermal Invoice
  try {
    await generateAndSendThermalInvoice(orderId);
  } catch (error) {
    console.error('Error generating thermal invoice:', error);
  }

if (user?.fcmToken) {
  try {
    await admin.messaging().send({
      token: user.fcmToken,
      notification: {
        title: "Order Delivered 🎉",
        body: `Your order #${orderId} has been delivered successfully.`,
      },
      android: {
        notification: {
          channelId: "default_channel",
          sound: "default",
        },
      },
      data: {
        type: "delivered",
        orderId: orderId.toString(),
      },
    });
    console.log("✅ Notification sent to user");
  } catch (err) {
    console.warn("⚠️ User FCM send failed:", err.message);
  }
}

if (store?.fcmToken) {
  try {
    await admin.messaging().send({
      token: store.fcmToken,
      notification: {
        title: "Order Delivered 🎉",
        body: `Driver delivered order #${orderId}.`,
      },
      android: {
        notification: {
          channelId: "default_channel",
          sound: "default",
        },
      },
      data: {
        type: "delivered",
        orderId: orderId.toString(),
      },
    });
    console.log("✅ Notification sent to store");
  } catch (err) {
    console.warn("⚠️ Store FCM send failed:", err.message);
  }
}

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
      const address1 = await Address.findById(order.addressId);
      const storeAddress = await Store.findById(order.storeId);

      return {
        ...order.toObject(),
        name: address1?.fullName,
        address: address1?.address,
        contact: address1?.mobileNumber,
        storeAddress: storeAddress?.fullAddress,
        storeContact: storeAddress?.PhoneNumber,
        userLat: address1?.latitude ,
        userLng: address1?.longitude
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

    const driverObjectId = mongoose.Types.ObjectId.isValid(order.driver.driverId)
      ? new mongoose.Types.ObjectId(order.driver.driverId)
      : null;

    const checkTransaction = await Transaction.findOne({
      orderId: order._id,
      driverId: driverObjectId,
    });

    if (checkTransaction) {
      return res.status(200).json({ message: "Payout already processed for this order" });
    }

    const payout = order.deliveryPayout;
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
    // console.log(Profile)
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

exports.withdrawalRequest = async (req, res) => {
  try {
    const { driverId, amount } = req.body;

    const driverData = await driver.findById(driverId);
    if (!driverData) return res.status(404).json({ message: "Driver not found" });

    // Calculate total pending withdrawals
    const pendingWithdrawals = await Transaction.aggregate([
      { $match: { driverId: driverData._id, status: "Pending", type: "debit" } },
      { $group: { _id: null, totalPending: { $sum: "$amount" } } }
    ]);

    const totalPending = pendingWithdrawals[0]?.totalPending || 0;

    // Check if requested amount + pending exceeds wallet
    if (amount + totalPending > driverData.wallet) {
      return res.status(400).json({ message: "Insufficient wallet balance considering pending withdrawals" });
    }

    // Check if a pending withdrawal already exists
    let withdrawal = await Transaction.findOne({ driverId: driverData._id, status: "Pending", type: "debit" });

    if (withdrawal) {
      // Update existing pending request
      withdrawal.amount += amount;
      withdrawal.description = `Withdrawal request of ₹${withdrawal.amount} by driver`;
      await withdrawal.save();
    } else {
      // Create new withdrawal request
      withdrawal = await Transaction.create({
        driverId: driverData._id,
        amount,
        type: "debit",
        description: `Withdrawal request of ₹${amount} by driver`,
        status: "Pending"
      });
    }

    return res.status(200).json({
      message: "Withdrawal request submitted successfully",
      wallet: driverData.wallet,
      pendingWithdrawal: withdrawal
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
