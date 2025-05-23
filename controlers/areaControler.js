const {CityData,ZoneData} = require('../modals/cityZone');
const StateData = require('../modals/state')
const Location = require('../modals/location');
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
    const { status } = req.body;

    const cityDoc = await CityData.findByIdAndUpdate(id,{ status },{new: true });
    return res.status(200).json({ message: 'Status updated successfully', data: cityDoc });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
};

exports.deleteCity = async (req, res) => {
  try {
    const { city } = req.params;

    const deleted = await CityData.findOneAndDelete({ city });

    if (!deleted) return res.status(404).json({ message: 'City not found' });

    return res.status(200).json({ message: 'City deleted successfully' });

  } catch (error) {
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
};

exports.deleteZoneFromCity = async (req, res) => {
  try {
    const { city, zone } = req.body;

    const cityDoc = await CityData.findOne({ city });

    if (!cityDoc) return res.status(404).json({ message: 'City not found' });
    const zonesToRemove = Array.isArray(zone) ? zone : [zone];
    cityDoc.zones = cityDoc.zones.filter(z => !zonesToRemove.includes(z));
    await cityDoc.save();

    return res.status(200).json({ message: `Zone '${zonesToRemove.join(", ")}' removed from city '${city}'`, data: cityDoc });

  } catch (error) {
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
    const { status, cashOnDelivery } = req.body;

    const updated = await ZoneData.updateOne(
      { "zones._id": id },
      {
        $set: {
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

