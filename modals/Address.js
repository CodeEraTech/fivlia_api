const addressSchema = new mongoose.Schema({
  userId:{_id:{type:mongoose.Schema.ObjectId,ref:'Login'}},
  fullName: { type: String},
  mobileNumber: { type: String},
  pincode: { type: String},
  locality: { type: String},
  address: { type: String},
  zone:{ type: mongoose.Schema.Types.ObjectId, ref: 'Locations'},
  city: { type: String},
  addressType: { type: String, enum: ['home', 'work', 'other'] },
},{timestamps:true});