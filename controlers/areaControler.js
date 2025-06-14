const {CityData,ZoneData} = require('../modals/cityZone');
const Location = require('../modals/location');
const User = require('../modals/User');
const Address = require('../modals/Address');
exports.addCity = async (req, res) => {
  try {
    const { city, zone } = req.body;

    if (!city || !Array.isArray(zone)) {
      return res.status(400).json({ message: 'City and zone array are required' });
    }

    let cityDoc = await CityData.findOne({ city });

    if (!cityDoc) {
      const newDoc = new CityData({
        city,
        zones: zone,
      });
      await newDoc.save();
    } else {
      const mergedZones = Array.from(new Set([...cityDoc.zones, ...zone]));
      cityDoc.zones = mergedZones;
      await cityDoc.save();
    }

    return res.status(200).json({ message: 'City/Zone merged successfully' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
};

exports.updateCityStatus = async (req, res) => {
  try {
    const {id} = req.params
    const { status,city,state,latitude,longitude,fullAddress } = req.body;

    const cityDoc = await CityData.findByIdAndUpdate(id,{ status,city,state,latitude,longitude,fullAddress },{new: true });
    return res.status(200).json({ message: 'Status updated successfully', data: cityDoc });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
};

exports.getAviableCity=async (req,res) => {
  try {
  const status=await CityData.find({status:true})
  res.json(status)
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

exports.getCity=async (req,res) => {
    const city =await CityData.find()
    res.json(city);
}

exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.user; // get from token or body
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude || !id) {
      return res.status(400).json({ message: "Missing userId or coordinates" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          location: {
            latitude,
            longitude,
          }
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Location updated successfully!",
      location: updatedUser.location
    });
  } catch (error) {
    console.error("❌ Location update error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAllZone=async (req,res) => {
  try {
    const cityStatus = await CityData.find({status:true})
    const activeCityNames = cityStatus.map(city => city.city);

    const zones =await ZoneData.find({city:{$in:activeCityNames}})
    res.json(zones);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ResponseMsg: "An Error Occured"});
  }
}

exports.getZone=async (req,res) => {
  try {
    const cityStatus = await CityData.find({status:true})
   
    const activeCityNames = cityStatus.map(city => city.city);

    
      const zones =await ZoneData.find({status:true,city:{$in:activeCityNames}})
    res.json(zones);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ResponseMsg: "An Error Occured"});
  }
}

exports.updateZoneStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status,city,zone, cashOnDelivery,zoneTitle,address,latitude,longitude,range} = req.body;

    const updated = await ZoneData.updateOne(
      { "zones._id": id },
      {
        $set: {
          city,zone,
           "zones.$.zoneTitle":zoneTitle,
           "zones.$.address":address,
           "zones.$.latitude":latitude,
           "zones.$.longitude":longitude,
           "zones.$.range":range,
          "zones.$.status": status,
          "zones.$.cashOnDelivery": cashOnDelivery,
        }
      }
    );

    if (updated.modifiedCount === 0) {
      return res.status(404).json({ message: "Zone not found" });
    }

    return res.status(200).json({ message: "Zone updated successfully" ,updated});
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ message: "An error occurred", error: error.message });
  }
};
exports.addAddress = async (req, res) => {
  try {
    const {id} = req.params; 
    const {fullName,mobileNumber,pincode,House_No,locality,address,State,latitude,longitude,city,addressType} = req.body;

    if (!fullName || !mobileNumber || !pincode || !House_No || !locality || !address || !city || !addressType || !State ||!latitude || !longitude) {
      return res.status(400).json({message: "All fields are required" });
    }

    const user = await User.findById(id);

    if (!user) return res.status(404).json({message: "User not found" });

    const newAddress = await  Address.create({  userId:user._id,
        fullName,
        mobileNumber,
        pincode,
        House_No,
        locality,
        address,
        State,
        latitude,
        longitude,
        city,
        addressType
        })

    return res.status(200).json({message:"Address added or updated successfully",newAddress});

  } catch (error) {
    console.error("Error adding address:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getAddress = async (req,res) => {
 try {
  const {id} = req.params
  const address =await Address.find({userId:id })
  res.json(address)
  } catch (error) {
   console.error("Error adding address:", error);
    return res.status(500).json({ message: "Server error" });
 }
}

exports.EditAddress=async (req,res) => {
  try {
  const {id} = req.params
  const { userId,fullName,mobileNumber,pincode,House_No,locality,address,State,latitude,longitude,city,addressType }=req.body

  const edit = await Address.findByIdAndUpdate(id,{userId,fullName,mobileNumber,pincode,House_No,locality,address,State,latitude,longitude,city,addressType})

return res.status(200).json({message:"Address Updated Successfuly"})

  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
}

exports.deleteAddress = async (req,res) => {
try {
  const {id} = req.params
  const deleteAddress = await Address.findByIdAndDelete(id) 
  return res.status(200).json({message:"Address Delete Successfuly",deleteAddress})
} catch (error) {
  console.error(error);
  
  return res.status(500).json({ message: "Server error" }); 
}

}