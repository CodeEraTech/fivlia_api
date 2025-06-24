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


exports.getCart = async (req, res) => {
  try {
    const { id: userId } = req.user;

    const items = await Cart.find({ userId }).populate('productId'); // assume productId ref is set

    if (!items || items.length === 0) {
      return res.status(200).json({ message: 'Cart is empty', items: [] });
    }

    // Step 1: Check store consistency
    const storeIds = items.map(item => item.productId.storeId?.toString());
    const uniqueStores = [...new Set(storeIds)];

    if (uniqueStores.length > 1) {
      return res.status(400).json({ message: 'Cart contains items from multiple stores. Please order from one store at a time.' });
    }

    // Step 2: Check quantity
    const insufficientItems = items.filter(item => item.quantity > item.productId.inventory);

    if (insufficientItems.length > 0) {
      return res.status(400).json({
        message: 'Some items exceed available stock',
        insufficientItems: insufficientItems.map(item => ({
          productName: item.productId.productName,
          availableStock: item.productId.inventory,
          requested: item.quantity
        }))
      });
    }

    // ✅ All checks passed
    return res.status(200).json({ message: 'Cart is valid', items });

  } catch (error) {
    console.error('Cart validation error:', error);
    return res.status(500).json({ message: "An error occurred", error: error.message });
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