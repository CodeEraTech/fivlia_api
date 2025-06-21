const {Cart,Discount} = require('../modals/cart');
const { ZoneData } = require('../modals/cityZone');
const User = require('../modals/User')

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


exports.getCart=async (req,res) => {
  try {
    const {id} = req.user
    const items = await Cart.find({userId:id})
    return res.status(200).json({ message: 'Cart Items:', items });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occured!", error: error.message });
  }
}
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