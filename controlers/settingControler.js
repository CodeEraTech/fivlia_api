const {Settings,SettingAdmin} = require('../modals/setting');
const Order = require('../modals/order');
const User = require('../modals/User');  

exports.addSettings = async (req, res) => {
  try {
    const data = req.body;

    const newSettings = new Settings(data);
    await newSettings.save();

    return res.status(200).json({
      message: "Settings added successfully",
      settings: newSettings
    });

  } catch (error) {
    console.error("Add Settings Error =>", error);
    return res.status(500).json({ message: "Error adding settings", error: error.message });
  }
};

exports.settings = async (req, res) => {
  try {
    const  userId  = req.user;

    // Get the settings document (full, with all fields)
    const settings = await SettingAdmin.findOne().lean();
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }

    // Get user data (including addresses)
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    return res.status(200).json({
      message: "Settings",
      mobileNumber:user.mobileNumber,
      settings
    });
  } catch (error) {
    console.error("Get User Settings Error =>", error);
    return res.status(500).json({ message: "Error getting settings", error: error.message });
  }
};

exports.adminSetting=async (req,res) => {
  try {
  const {Owner_Name,Owner_Email,Owner_Number,Store_Number,Password,Platform_Fee,GST_Number,Description,Delivery_Charges,DeliveryStatus,Delivery_Charge_Per_Km,Minimum_Delivery_Charges,links,Minimum_Delivery_Charge_Within_Km}=req.body

  const newSetting=await SettingAdmin.create({Owner_Name,Owner_Email,Owner_Number,Store_Number,Password,Platform_Fee,GST_Number,Description,Delivery_Charges,Delivery_Charge_Per_Km,Minimum_Delivery_Charges,DeliveryStatus,Minimum_Delivery_Charge_Within_Km,links})

  return res.status(200).json({message:"Done",newSetting})

  } catch (error) {
    console.error("Get User Settings Error =>", error);
    return res.status(500).json({ message: "Error getting settings", error: error.message }); 
  }
}