const {CityData,ZoneData} = require('../modals/cityZone');
const Location = require('../modals/location');
const User = require('../modals/User');
const Address = require('../modals/Address');
const StoreStock = require('../modals/StoreStock');
const Store = require('../modals/store')
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
console.log(updatedUser);

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
    const {id} = req.user; 
    const {fullName,alternateNumber,pincode,house_No,address,state,latitude,longitude,city,addressType,floor,landmark} = req.body;
console.log(req.body);

    const user = await User.findById(id);

    if (!user) return res.status(404).json({message: "User not found" });

    const newAddress = await  Address.create({  userId:user._id,
        fullName,
        mobileNumber:user.mobileNumber,
        alternateNumber,
        pincode,
        house_No,
        address,
        state,
        latitude,
        longitude,
        city,
        addressType,
        floor,
        landmark
        })

    return res.status(200).json({message:"Address added successfully",newAddress});

  } catch (error) {
    console.error("Error adding address:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getAddress = async (req,res) => {
 try {
  const {id} = req.user; 
       const user = await User.findById(id);
  //   const { city, zone } = user.location;

  // const addresses = await Address.find({ userId: id }).sort({ createdAt: -1 });

  // const userZoneDoc = await ZoneData.findOne({ city });
   
  //   const matchedZone = userZoneDoc.zones.find(z =>
  //     z.address.toLowerCase().includes(zone.toLowerCase())
  //   );

  //   const stores = await Store.find({
  //     zone: { $elemMatch: { _id: matchedZone._id } }
  //   });

  //   if (!addresses.length && !stores.length)
  //     return res.json({status:false, message: "Sorry, no stores available in your zone pls change ur address." });

//     let matched = false;
// for (const addr of addresses) {
//   if (
//     addr.city.toLowerCase() === city.toLowerCase() &&
//     addr.address.toLowerCase() === zone.toLowerCase()
//   ) {
//     matched = addr;
//     break;
//   }
// }

    // await Promise.all(addresses.map(addr =>
    //   Address.findByIdAndUpdate(addr._id, { default: matched && addr._id.equals(matched._id) })
    // ));

const addresses = await Address.find({userId:user._id})

    res.status(200).json({
      addresses,
    });
  } catch (error) {
   console.error("Error adding address:", error);
    return res.status(500).json({ message: "Server error" });
 }
}

exports.EditAddress=async (req,res) => {
  try {
  const {id} = req.user;
  const { userId,fullName,mobileNumber,pincode,house_No,address,state,latitude,longitude,city,addressType, floor,landmark }=req.body

  const edit = await Address.findByIdAndUpdate(id,{userId,fullName,mobileNumber,pincode,house_No,address,state,latitude,longitude,city,addressType,floor,landmark})

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

exports.setDefault = async (req, res) => {
  try {
    const { id: userId } = req.user; // Get user ID from auth middleware
    const { addressId } = req.body;

    await Address.updateMany({ userId }, { $set: { default: false } });

    const setDefault = await Address.findByIdAndUpdate(
      addressId,
      { $set: { default: true } },
      { new: true }
    );

  if (!setDefault) {
      return res.status(404).json({status:false, message: "Address not found" });
    }

    res.status(200).json({status:true, message: "Default address updated", address: setDefault });
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(500).json({ message: "Server error" });
  }
};
