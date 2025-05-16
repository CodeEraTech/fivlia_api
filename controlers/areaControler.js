const {CityData,CityData2} = require('../modals/cityZone');
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

exports.updateCityZones = async (req, res) => {
  try {
    const { city, zones } = req.body;

    if (!city || !Array.isArray(zones)) {
      return res.status(400).json({ message: 'City and zones array are required' });
    }

    const cityDoc = await CityData.findOneAndUpdate(
      { city },
      { zones },
      { upsert:true,new: true }
    );
    return res.status(200).json({ message: 'Zones updated successfully', data: cityDoc });

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

exports.addState=async (req,res) => {
    try{
    const{state,city}=req.body
     if (!state || !Array.isArray(city)) {
      return res.status(400).json({ message: 'State and City array are required' });
    }

    let stateDoc = await StateData.findOne({ state });

    if (!stateDoc) {
      const newDoc = new StateData({
        state,
        city,
      });
      await newDoc.save();
    } else {
      // Merge zones without duplicates
      const mergedZones = Array.from(new Set([...stateDoc.city, ...city]));
      stateDoc.zones = mergedZones;
      await stateDoc.save();
    }

    return res.status(200).json({ message: 'State/City merged successfully' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}

exports.getCity=async (req,res) => {
    const city =await CityData.find()
    res.json(city);
}

exports.getState=async (req,res) => {
    const state =await StateData.find()
    res.json(state);
}

exports.addCityData=async (req,res) => {
  try {
  const{city}=req.body
  const newCity = await CityData2.create({city})
   return res.status(200).json({ message: 'City added succesfuly',newCity });
 } catch (error) {
  console.error(error);
  
     return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
}
exports.getCityData=async (req,res) => {
  const city = await CityData2.find()
res.json(city)
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
     return res.status(500).json({ResponseMsg: "An Error Occured"
  });
  }
};
