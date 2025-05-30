const {CityData,ZoneData} = require('../modals/cityZone');
const Location = require('../modals/location');
const User = require('../modals/User');
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

exports.location=async (req, res) => {
  try {
  const { longitude, latitude } = req.body;
  if (!longitude || !latitude ) {
    console.log(req.body);
    
    return res.status(400).json({message: "Missing parameters"});
  }
  const newLocation = await Location.create({longitude, latitude })
  console.log(newLocation);
  
  return res.status(200).json({message: "Location update successfully!"},newLocation);
   } catch (error) {
    console.error(error);
     return res.status(500).json({ResponseMsg: "An Error Occured"});
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
    const { status,city,zone, cashOnDelivery,address,latitude,longitude,range} = req.body;

    const updated = await ZoneData.updateOne(
      { "zones._id": id },
      {
        $set: {
          city,zone,
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
    const { id } = req.params;
    const {fullName,mobileNumber,pincode,locality,address,city,addressType} = req.body;

    if (!fullName || !mobileNumber || !pincode || !locality || !address || !city || !addressType) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findById(id);
    
    if (!user) return res.status(404).json({ message: "User not found" });

    const existing = user.Address.find(a => a.addressType === addressType);

    if (existing) {
      // Update the existing address
      existing.set({
        fullName,
        mobileNumber,
        pincode,
        locality,
        address,
        city,
        addressType
      });
    } else {
      user.Address.push({
        fullName,
        mobileNumber,
        pincode,
        locality,
        address,
        city,
        addressType
      });
    }

    await user.save();

    return res.status(200).json({message:"Address added or updated successfully"});

  } catch (error) {
    console.error("Error adding address:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
