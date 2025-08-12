const {Settings,SettingAdmin} = require('../modals/setting');
const Order = require('../modals/order');
const User = require('../modals/User');  

exports.getSettings = async (req, res) => {
  try {
   const settings = await SettingAdmin.findOne().lean();
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }

    return res.status(200).json({message: "Settings",settings});
  } catch (error) {
    console.error("Get User Settings Error =>", error);
    return res.status(500).json({ message: "Error getting settings", error: error.message });
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

exports.getSmsType = async(req,res)=>{
  try{
const setting = await SettingAdmin.find()
return res.status(200).json({message:"Setting",setting})
  }catch{
    console.error("Get User Settings Error =>", error);
    return res.status(500).json({ message: "Error getting settings", error: error.message });
  }
}

exports.adminSetting = async (req, res) => {
  try {
    const updateFields = req.body;

    if (updateFields.Map_Api && updateFields.Map_Api[0]) {
      const mapApi = updateFields.Map_Api[0];
      
      const currentSettings = await SettingAdmin.findOne().lean();
      const currentMapApi = currentSettings?.Map_Api?.[0] || {};
      
      const finalMapApi = {
        google: { ...currentMapApi.google, ...mapApi.google },
        apple: { ...currentMapApi.apple, ...mapApi.apple },
        ola: { ...currentMapApi.ola, ...mapApi.ola }
      };

      if (mapApi.google?.status || mapApi.apple?.status || mapApi.ola?.status) {

        finalMapApi.google = { ...finalMapApi.google, status: false };
        finalMapApi.apple = { ...finalMapApi.apple, status: false };
        finalMapApi.ola = { ...finalMapApi.ola, status: false };
        
        if (mapApi.google?.status) finalMapApi.google.status = true;
        if (mapApi.apple?.status) finalMapApi.apple.status = true;
        if (mapApi.ola?.status) finalMapApi.ola.status = true;
      }

      updateFields.Map_Api = [finalMapApi];
    }

    const updatedSetting = await SettingAdmin.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      message: "Admin settings updated successfully",
      settings: updatedSetting,
    });

  } catch (error) {
    console.error("Admin Settings Error =>", error);
    return res.status(500).json({
      message: "Error updating settings",
      error: error.message,
    });
  }
};
