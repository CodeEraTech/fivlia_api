const { Cart, Discount } = require("../modals/cart");
const { ZoneData } = require("../modals/cityZone");
const Address = require("../modals/Address");
const Products = require("../modals/Product");
const Store = require("../modals/store");
const User = require("../modals/User");
const stock = require("../modals/StoreStock");
const mongoose = require('mongoose');
const haversine = require("haversine-distance");

exports.addCart = async (req, res) => {
  try {
    const userId = req.user;
    const {
      name,
      quantity,
      price,
      mrp,
      productId,
      storeId,
      varientId,
      image,
      clearCart,
    } = req.body;

    if (clearCart === "true") {
      await Cart.deleteMany({ userId });
    }
    if(!storeId){
      return res.status(400).json({ message: "storeId Not found." });
    }
    const user = await User.findOne(userId).lean();
    const userLat = parseFloat(user?.location?.latitude);
    const userLng = parseFloat(user?.location?.longitude);

    // Check if user location is available
    if (!userLat || !userLng) {
      return res.status(400).json({ message: "User location not available." });
    }

    // Fetch all active zones
    const zoneDocs = await ZoneData.find({});
    const activeZones = zoneDocs.flatMap((doc) =>
      doc.zones.filter((z) => z.status === true)
    );

    // Match the zone based on user's location
    const matchedZone = activeZones.find((zone) => {
      if (!zone.latitude || !zone.longitude || !zone.range) return false;
      const distance = haversine(
        { lat: userLat, lon: userLng },
        { lat: zone.latitude, lon: zone.longitude }
      );
      return distance <= zone.range;
    });

    if (!matchedZone) {
      return res
        .status(400)
        .json({ message: "No active zone found for your location." });
    }

    const paymentOption = matchedZone.cashOnDelivery === true;

    // Check if the cart already has products from a different store
    const cartItems = await Cart.find({ userId: req.user }).lean();

    if (cartItems.length > 0) {
      // If cart is not empty, check if any item belongs to a different store
      const cartStoreId = cartItems[0].storeId || {};
      // If the storeId of the item trying to be added doesn't match the current storeId in cart
      if (cartStoreId.toString() !== storeId) {
        return res.status(200).json({
          message: `You can only add products from one store at a time.`,
          errorType: "multiple_stores_in_cart",
        });
      }
    }

    // Check if the product is already in the cart, if yes, remove it
    const checkCart = await Cart.findOne({
      productId: productId,
      userId: req.user,
    });

    if (checkCart) {
      await Cart.deleteOne({ _id: checkCart._id });
    }

    // Create the new cart item
    const cartItem = await Cart.create({
      image,
      name,
      quantity,
      price,
      mrp,
      productId,
      varientId,
      userId,
      storeId,
      paymentOption,
    });

    return res
      .status(200)
      .json({ message: "Item Added To Cart", item: cartItem });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred!", error: error.message });
  }
};

exports.getCart = async (req, res) => {
  try {
    const { id } = req.user;

    // Fetch cart items and user data
    const [items, user] = await Promise.all([
      Cart.find({ userId: id }),
      User.findById(id),
    ]);

    if (!user) {
      return res
        .status(404)
        .json({ status: false, message: "User not found." });
    }

    // Get the store ID from the first cart item
    const storeId = items[0]?.storeId;

    // Fetch stock data for the store
    const stockDoc = await stock.findOne({ storeId });
    if (!stockDoc) {
      return res.status(200).json({
        status: false,
        message: "No stock data found for the store.",
        items,
      });
    }

    // Map stock data for quick lookup
    const stockMap = new Map();
    stockDoc.stock.forEach((s) => {
      const key = `${s.productId.toString()}_${s.variantId.toString()}`;
      stockMap.set(key, s.quantity);
    });

    // Add stock information to each cart item
    const updatedItems = items.map((cartItem) => {
      const key = `${cartItem.productId}_${cartItem.varientId}`;
      const availableQty = stockMap.get(key) || 0;

      return {
        ...cartItem.toObject(),
        stock: availableQty,
      };
    });

    return res.status(200).json({
      status: true,
      message: "Cart items fetched successfully.",
      items: updatedItems,
      paymentOption: false,
      StoreID: storeId,
    });
  } catch (error) {
    //console.error("❌ Error in getCart:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching cart items.",
      error: error.message,
    });
  }
};

exports.discount = async (req, res) => {
  try {
    const { description, value, head } = req.body;
    const newDiscount = await Discount.create({ description, value, head });
    return res.status(200).json({ message: "New Discount:", newDiscount });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occured!", error: error.message });
  }
};
exports.getDicount = async (req, res) => {
  try {
    const discount = await Discount.find();
    return res.status(200).json({ message: "New Discounts:", discount });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occured!", error: error.message });
  }
};
exports.quantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const updated_cart = await Cart.findByIdAndUpdate(
      id,
      { quantity },
      { new: true }
    );

    return res.status(200).json({ message: "New Quantity:", updated_cart });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occured!", error: error.message });
  }
};

exports.deleteCart = async (req, res) => {
  try {
    const { id } = req.params;
    const cart = await Cart.findByIdAndDelete(id);

    return res.status(200).json({ message: "Cart Item Removed:", cart });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occured!", error: error.message });
  }
};

exports.recommedProduct = async (req, res) => {
  try {
    const userId = req.user._id

    const cartItem = await Cart.find({userId}).lean();

    if (!cartItem) return res.status(404).json({ message: "Cart item not found" });

    // 2️⃣ Get the seller
    const seller = await Store.findById(cartItem[0].storeId).lean();
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    // 3️⃣ Extract allowed subCategories & subSubCategories
    const allowedSubCategoryIds = seller.sellerCategories?.flatMap(cat =>
      cat.subCategories?.map(sub => sub.subCategoryId).filter(Boolean) || []
    ) || [];

    const allowedSubSubCategoryIds = seller.sellerCategories?.flatMap(cat =>
      cat.subCategories?.flatMap(sub =>
        sub.subSubCategories?.map(subsub => subsub.subSubCategoryId).filter(Boolean) || []
      ) || []
    ) || [];

    if (!allowedSubCategoryIds.length && !allowedSubSubCategoryIds.length) {
      return res.status(200).json({ message: "No recommended products found", products: [] });
    }

    // 4️⃣ Build query
    const matchQuery = {
      _id: { $ne: cartItem.productId },
      $or: []
    };
    if (allowedSubSubCategoryIds.length) matchQuery.$or.push({ "subSubCategory._id": { $in: allowedSubSubCategoryIds } });
    if (allowedSubCategoryIds.length) matchQuery.$or.push({ "subCategory._id": { $in: allowedSubCategoryIds } });

    // 5️⃣ Aggregate products with stock in a single query
    const recommendedProducts = await Products.aggregate([
      { $match: matchQuery },
      { $limit: 20 },
      {
        $lookup: {
          from: "stocks",
          let: { productId: "$_id",variants: "$variants"  },
          pipeline: [
            { $match: { storeId: seller._id } },
            { $unwind: "$stock" },
            { $match: { $expr: { $in: ["$stock.variantId", { $map: { input: "$$variants", as: "v", in: "$$v._id" } }]} } },
            { $replaceRoot: { newRoot: "$stock" } }
          ],
          as: "inventory"
        }
      },
      { $addFields: { storeId: seller._id, storeName: seller.storeName } },
      { $sort: { "inventory.quantity": -1 } } // optional, sorts by max quantity first
    ]);

    return res.status(200).json({
      message: "Recommended products fetched successfully",
      relatedProducts:recommendedProducts
    });

  } catch (error) {
    console.error("❌ Error in recommedProduct:", error);
    return res.status(500).json({ message: "An error occurred!", error: error.message });
  }
};
