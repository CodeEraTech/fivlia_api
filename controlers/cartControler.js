const {Cart,Discount} = require('../modals/cart');
const { ZoneData } = require('../modals/cityZone');
const Address = require('../modals/Address')
const Store = require('../modals/store')
const User = require('../modals/User')
const stock = require('../modals/StoreStock')

exports.addCart = async (req, res) => {
  try {
    const userId = req.user; 
    const { name, quantity, price, productId, varientId } = req.body;
    const image = req.files?.image?.[0]?.path;

    const userZoneShort = userId?.location?.zone;

    const zoneData = await ZoneData.findOne({
      "zones.address": { $regex: userZoneShort, $options: "i" }
    });

    const matchedZone = zoneData.zones.find(z =>
      z.address.toLowerCase().includes(userZoneShort.toLowerCase())
    );

    const paymentOption = matchedZone.cashOnDelivery === true;

    const cartItem = await Cart.create({
      image,
      name,
      quantity,
      price,
      productId,
      varientId,
      userId,
      paymentOption
    });

    return res.status(200).json({ message: 'Item Added To Database', item: cartItem });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred!', error: error.message });
  }
};


exports.getCart = async (req, res) => {
  try {
    const { id } = req.user;

    // 1. Get user's cart
    const items = await Cart.find({ userId: id });

    // 2. Get user's default address
    const address = await Address.findOne({ userId: id, default: true });
    if (!address) {
      return res.status(400).json({ status: false, message: "Please select an address." });
    }

    const userCity = address.city?.toLowerCase();
    const userZone = address.address?.toLowerCase();

    // 3. Find zoneData for city (case-insensitive)
    const cityZoneDoc = await ZoneData.findOne({ city: { $regex: new RegExp(`^${userCity}$`, "i") } });
    if (!cityZoneDoc) {
      return res.status(400).json({ status: false, message: "City not serviceable." });
    }

    // 4. Match zone in that city (case-insensitive)
    const matchedZone = cityZoneDoc.zones.find(z =>
      z.address.toLowerCase().includes(userZone)
    );

    if (!matchedZone) {
      return res.status(400).json({ status: false, message: "Zone not serviceable." });
    }
console.log(userZone);
console.log(userZone);
    console.log(matchedZone);
    
    // 5. Find store in that zone
    const store = await Store.findOne({
      zone: { $elemMatch: { _id: matchedZone._id } }
    });

    if (!store) {
      return res.status(400).json({ status: false, message: "No store found for your location.",items});
    }

    // 6. Find stock data for the store
    const stockDoc = await stock.findOne({ storeId: store._id });

let anyUnavailable = false;

const updatedItems = items.map((cartItem) => {
  const stockItem = stockDoc.stock.find(s =>
    s.productId.toString() === cartItem.productId.toString() &&
    s.variantId.toString() === cartItem.varientId.toString()
  );

  const availableQty = stockItem ? stockItem.quantity : 0;

  const itemObj = {
    ...cartItem.toObject(),
    stock: availableQty,
  };

  if (availableQty < cartItem.quantity) {
    anyUnavailable = true;
  }

  return itemObj;
});


if (anyUnavailable) {
  return res.status(200).json({
    status: false,
    message: "Some items are out of stock or quantity is insufficient.",
    items: updatedItems,
    StoreID: store._id,
  });
}

 return res.status(200).json({
  status: true,
  message: "Cart items are available.",
  items: updatedItems,
  StoreID: store._id,
});

  } catch (error) {
    console.error("Error in getCart:", error);
    return res.status(500).json({ status: false, message: "An error occurred!", error: error.message });
  }
};


exports.discount=async (req,res) => {
  try {
 const{description,value,head}=req.body
  const newDiscount=await Discount.create({description,value,head})
   return res.status(200).json({ message: 'New Discount:', newDiscount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occured!", error: error.message });
  }
}
exports.getDicount=async (req,res) => {
  try {
  const discount = await Discount.find()
  return res.status(200).json({ message: 'New Discounts:', discount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occured!", error: error.message });
  }
}
exports.quantity=async (req,res) => {
    try {
    const{id}=req.params
    const {quantity}=req.body

const updated_cart=await Cart.findByIdAndUpdate(  id,{ quantity },{ new: true })

  return res.status(200).json({ message: 'New Quantity:', updated_cart });
} catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occured!", error: error.message });   
    }
}

exports.deleteCart=async (req,res) => {
    try {
    const{id}=req.params
    const cart = await Cart.findByIdAndDelete(id)

    return res.status(200).json({ message: 'Cart Item Removed:', cart });
    } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occured!", error: error.message });   
    }
}