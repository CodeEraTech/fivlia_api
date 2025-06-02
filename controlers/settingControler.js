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
    const { id } = req.params;

    // Get the settings document (full, with all fields)
    const settings = await Settings.findOne().lean();

    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }

    // Get user orders
    const userOrders = await Order.find({ user: id }).lean();

    // Get user data (including addresses)
    const user = await User.findById(id).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Attach orders and addresses into settings object at proper places
    settings.orders = {
      label: settings.orders?.label || "Orders",
      data: userOrders
    };

    settings.address_book = {
      label: settings.address_book?.label || "Address Book",
      data: user.Address || []
    };

    return res.status(200).json({
      message: "Settings with user orders and address",
      settings
    });
  } catch (error) {
    console.error("Get User Settings Error =>", error);
    return res.status(500).json({ message: "Error getting settings", error: error.message });
  }
};

exports.adminSetting=async (req,res) => {
  try {
  const {Owner_Name,Owner_Email,Owner_Number,Store_Number,Password,Platform_Fee,GST_Number,Description,Delivery_Charges,Delivery_Charge_Per_Km,Minimum_Delivery_Charges,Minimum_Delivery_Charge_Within_Km}=req.body

  const newSetting=await SettingAdmin.create({Owner_Name,Owner_Email,Owner_Number,Store_Number,Password,Platform_Fee,GST_Number,Description,Delivery_Charges,Delivery_Charge_Per_Km,Minimum_Delivery_Charges,Minimum_Delivery_Charge_Within_Km})

  return res.status(200).json({message:"Done",newSetting})

  } catch (error) {
    console.error("Get User Settings Error =>", error);
    return res.status(500).json({ message: "Error getting settings", error: error.message }); 
  }
}