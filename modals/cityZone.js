module.exports = {
  Haryana: {
    Hisar: ['Sector 1', 'Sector 2', 'Sector 3', 'Sector 4'],
    Rohtak: ['Sector 11', 'Sector 12', 'Sector 13', 'Sector 14'],
    Gurgaon: ['DLF Phase 1', 'DLF Phase 2', 'Sushant Lok', 'Sector 56'],
    Faridabad: ['Sector 15', 'Sector 16', 'Sector 17', 'Sector 18'],
  },
  Punjab: {
    Ludhiana: ['Model Town', 'Civil Lines', 'Sarabha Nagar', 'Pakhowal Road'],
    Amritsar: ['Ranjit Avenue', 'Lawrence Road', 'GT Road', 'Sultanwind'],
    Jalandhar: ['Urban Estate', 'Model Town', 'Shastri Nagar', 'Ladowali Road'],
  },
  UttarPradesh: {
    Lucknow: ['Hazratganj', 'Gomti Nagar', 'Aliganj', 'Indira Nagar'],
    Kanpur: ['Swaroop Nagar', 'Kakadeo', 'Govind Nagar', 'Kidwai Nagar'],
    Noida: ['Sector 18', 'Sector 62', 'Sector 15', 'Sector 76'],
    Agra: ['Tajganj', 'Dayalbagh', 'Sanjay Place', 'Civil Lines'],
  },
  Maharashtra: {
    Mumbai: ['Andheri', 'Bandra', 'Dadar', 'Borivali'],
    Pune: ['Kothrud', 'Hinjewadi', 'Baner', 'Hadapsar'],
    Nagpur: ['Civil Lines', 'Sadar', 'Dharampeth', 'Sitabuldi'],
  },
  Delhi: {
    NorthDelhi: ['Kamla Nagar', 'Model Town', 'Mukherjee Nagar', 'Civil Lines'],
    SouthDelhi: ['Saket', 'Hauz Khas', 'Greater Kailash', 'Lajpat Nagar'],
    EastDelhi: ['Preet Vihar', 'Laxmi Nagar', 'Mayur Vihar', 'Patparganj'],
    WestDelhi: ['Janakpuri', 'Rajouri Garden', 'Vikaspuri', 'Tilak Nagar'],
  },
  Rajasthan: {
    Jaipur: ['Malviya Nagar', 'Vaishali Nagar', 'Mansarovar', 'C-Scheme'],
    Jodhpur: ['Shastri Nagar', 'Ratanada', 'Sardarpura', 'Chopasni'],
    Udaipur: ['Hiran Magri', 'Fatehpura', 'Bhopalpura', 'Sector 3'],
  }
};

const mongoose = require('mongoose');

const zoneSchemma=new mongoose.Schema({
     city: {
    type: String,
    required: true,
    unique: true,
  },
  status:{type:String,enum:['Active','UnActive']},
  zones: {
    type: [String],
    default: [],
  },
},{timestamps:true})

const citySchemma1=new mongoose.Schema({
     city: {
    type: [String],
    required: true,
    unique: true,
  },
},{timestamps:true})

module.exports = {
  ZoneData: mongoose.model('CityData1', zoneSchemma,'Locations'),
  CityData2: mongoose.model('CityData2', citySchemma1)
};