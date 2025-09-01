const {Cart,Discount} = require('../modals/cart');
const { ZoneData } = require('../modals/cityZone');
const Address = require('../modals/Address')
const Store = require('../modals/store')
const User = require('../modals/User')
const stock = require('../modals/StoreStock')
const haversine = require("haversine-distance");

exports.addCart = async (req, res) => {
  try {
    const userId = req.user; 
    const { name, quantity, price,mrp, productId, varientId,image } = req.body;
    const user = await User.findOne(userId).lean()
    const userLat = parseFloat(user?.location?.latitude);
    const userLng = parseFloat(user?.location?.longitude);
console.log(image)
    if (!userLat || !userLng) {
      return res.status(400).json({ message: "User location not available." });
    }

    // ✅ Fetch all active zones
    const zoneDocs = await ZoneData.find({});
    const activeZones = zoneDocs.flatMap(doc => doc.zones.filter(z => z.status === true));

    const matchedZone = activeZones.find(zone => {
      if (!zone.latitude || !zone.longitude || !zone.range) return false;
      const distance = haversine(
        { lat: userLat, lon: userLng },
        { lat: zone.latitude, lon: zone.longitude }
      );
      return distance <= zone.range;
    });

    if (!matchedZone) {
      return res.status(400).json({ message: "No active zone found for your location." });
    }

const paymentOption = matchedZone.cashOnDelivery === true;
const checkCart = await Cart.findOne({ productId: productId, userId: req.user })

if (checkCart) {
  await Cart.deleteOne({ _id: checkCart._id });
  console.log("🗑️ Product removed from cart");
} else {
  console.log("⚠️ Product not found in cart");
}

    const cartItem = await Cart.create({
      image,
      name,
      quantity,
      price,
      mrp,
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

    const [items, user, address] = await Promise.all([
      Cart.find({ userId: id }),
      User.findById(id),
      Address.findOne({ userId: id, default: true }),
    ]);

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found." });
    }

    let userLat, userLng, usedFallback = false;

    if (address?.latitude && address?.longitude) {
      userLat = parseFloat(address.latitude);
      userLng = parseFloat(address.longitude);
    } else if (user?.location?.latitude && user?.location?.longitude) {
      userLat = parseFloat(user.location.latitude);
      userLng = parseFloat(user.location.longitude);
      usedFallback = true;
    } else {
      return res.status(200).json({
        status: false,
        message: "Please select a default address or set your location properly.",
        items,
      });
    }

    const allCities = await ZoneData.find({});
    let matchedZone = null;

    for (const city of allCities) {
      for (const zone of city.zones) {
        if (!zone?.latitude || !zone?.longitude || !zone?.range || zone.status !== true) continue;
        const distance = haversine(
          { lat: userLat, lon: userLng },
          { lat: zone.latitude, lon: zone.longitude }
        );

        if (distance <= zone.range) {
          matchedZone = zone;
          break;
        }
      }
      if (matchedZone) break;
    }
const paymentOption = matchedZone.cashOnDelivery === true;
    if (!matchedZone) {
      return res.status(200).json({
        status: false,
        message: "No service available in your zone please change your address.",
        items,
      });
    }

    const store = await Store.findOne({
      status: true,
      zone: { $elemMatch: { _id: matchedZone._id } },
    });

    if (!store) {
      return res.status(200).json({
        status: false,
        message: "No store found for your location please change your address.",
        items,
      });
    }

    const stockDoc = await stock.findOne({ storeId: store._id });
    const stockMap = new Map();
    stockDoc?.stock?.forEach((s) => {
      stockMap.set(`${s.productId}_${s.variantId}`, s.quantity);
    });

    let anyUnavailable = false;

    const updatedItems = items.map((cartItem) => {
      const key = `${cartItem.productId}_${cartItem.varientId}`;
      const availableQty = stockMap.get(key) || 0;

      if (availableQty < cartItem.quantity) anyUnavailable = true;

      return {
        ...cartItem.toObject(),
        stock: availableQty,
      };
    });

    if (anyUnavailable) {
      return res.status(200).json({
        status: false,
        message: "Some items are out of stock or quantity is insufficient.",
        items: updatedItems,
        paymentOption,
        StoreID: store._id,
      });
    }

    if (usedFallback) {
      return res.status(200).json({
        status: false,
        message: "Please select a default address to proceed with checkout.",
        items: updatedItems,
        paymentOption,
        StoreID: store._id,
      });
    }

    return res.status(200).json({
      status: true,
      message: "Cart items are available.",
      items: updatedItems,
      paymentOption,
      StoreID: store._id,
    });

  } catch (error) {
    console.error("❌ Error in getCart:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred!",
      error: error.message,
    });
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