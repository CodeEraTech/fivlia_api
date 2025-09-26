const { Cart, Discount } = require("../modals/cart");
const { ZoneData } = require("../modals/cityZone");
const Address = require("../modals/Address");
const Products = require("../modals/Product");
const Store = require("../modals/store");
const User = require("../modals/User");
const stock = require("../modals/StoreStock");
const mongoose = require("mongoose");
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

    if (!storeId) {
      return res.status(400).json({ message: "storeId not found." });
    }

    if (!productId || !varientId || !quantity) {
      return res
        .status(400)
        .json({ message: "Missing product or variant info." });
    }

    // Clear cart if requested
    if (clearCart === "true") {
      await Cart.deleteMany({ userId });
    }

    // Get user location
    const user = await User.findOne(userId).lean();
    const userLat = parseFloat(user?.location?.latitude);
    const userLng = parseFloat(user?.location?.longitude);

    if (!userLat || !userLng) {
      return res.status(400).json({ message: "User location not available." });
    }

    // Fetch all active zones
    const zoneDocs = await ZoneData.find({});
    const activeZones = zoneDocs.flatMap((doc) =>
      doc.zones.filter((z) => z.status === true)
    );

    // Match user to a delivery zone
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

    // Validate single-store cart policy
    const cartItems = await Cart.find({ userId }).lean();
    if (cartItems.length > 0) {
      const existingStoreId = cartItems[0].storeId?.toString();
      if (existingStoreId !== storeId) {
        return res.status(200).json({
          message: `You can only add products from one store at a time.`,
          errorType: "multiple_stores_in_cart",
        });
      }
    }

    // Check stock availability for this product variant in the given store
    const stockDoc = await stock
      .findOne({
        storeId,
        "stock.productId": productId,
        "stock.variantId": varientId,
      })
      .lean();

    let stockEntry;
    if (stockDoc?.stock?.length) {
      stockEntry = stockDoc.stock.find(
        (s) =>
          s.productId.toString() === productId.toString() &&
          s.variantId.toString() === varientId.toString()
      );
    }

    if (!stockEntry || stockEntry.quantity < quantity) {
      return res.status(400).json({
        message:
          "Product variant is out of stock or requested quantity is unavailable.",
      });
    }

    // Remove existing cart entry for same product (if any)
    await Cart.deleteOne({
      userId,
      productId,
    });

    // Add new item to cart
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

    return res.status(200).json({
      message: "Item added to cart.",
      item: cartItem,
    });
  } catch (error) {
    //console.error("❌ addCart error:", error);
    return res.status(500).json({
      message: "An error occurred!",
      error: error.message,
    });
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

    if (!items || items.length === 0) {
      return res.status(204).json({ status: false, message: "Cart Is Empty." });
    }
    if (!user) {
      return res
        .status(404)
        .json({ status: false, message: "User not found." });
    }

    const storeId = items[0]?.storeId;

    let storeZone = await Store.findById(storeId);

    storeZone = storeZone.zone[0];

    const zoneData = await ZoneData.findOne({ "zones._id": storeZone._id });

    const zone = zoneData.zones.find(
      (z) => z._id.toString() === storeZone._id.toString()
    );

    const cashOnDelivery = zone?.cashOnDelivery || false;
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
      paymentOption: cashOnDelivery,
      StoreID: storeId,
    });
  } catch (error) {
    console.error("❌ Error in getCart:", error);
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
    const userId = req.user._id;

    // 1️⃣ Get cart items
    const cartItems = await Cart.find({ userId }).lean();
    if (!cartItems.length) {
      return res.status(404).json({ message: "Cart is empty" });
    }

    // 2️⃣ Get seller of first cart item
    const firstCartItem = cartItems[0];
    const seller = await Store.findById(firstCartItem.storeId).lean();
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    // 3️⃣ Extract all allowed category IDs
    let allowedCategoryIds = [];
    if (seller.sellerCategories?.length) {
      // Unofficial sellers: subCategories + subSubCategories
      allowedCategoryIds = seller.sellerCategories.flatMap(
        (cat) =>
          cat.subCategories?.flatMap((sub) =>
            [
              ...(sub.subSubCategories?.map((ssc) => ssc.subSubCategoryId) ||
                []),
              sub.subCategoryId,
            ].filter(Boolean)
          ) || []
      );
    } else if (seller.Category?.length) {
      // Official store: main categories
      allowedCategoryIds = seller.Category;
    }

    if (!allowedCategoryIds.length) {
      return res.status(200).json({
        message: "No recommended products found",
        relatedProducts: [],
      });
    }

    // 4️⃣ Build query to exclude products already in cart
    const matchQuery = {
      _id: { $nin: cartItems.map((c) => c.productId) },
      $or: [
        { "subSubCategory._id": { $in: allowedCategoryIds } },
        { "subCategory._id": { $in: allowedCategoryIds } },
        { "category._id": { $in: allowedCategoryIds } },
      ],
    };

    // 5️⃣ Aggregate recommended products with stock info
    const recommendedProducts = await Products.aggregate([
      { $match: matchQuery },
      { $limit: 50 },
      {
        $lookup: {
          from: "stocks",
          let: { productId: "$_id", variants: "$variants" },
          pipeline: [
            { $match: { storeId: seller._id } },
            { $unwind: "$stock" },
            {
              $match: {
                $expr: {
                  $and: [
                    { $gt: ["$stock.quantity", 0] }, // only include stock > 0
                    {
                      $or: [
                        {
                          $in: [
                            "$stock.variantId",
                            {
                              $ifNull: [
                                {
                                  $map: {
                                    input: "$$variants",
                                    as: "v",
                                    in: "$$v._id",
                                  },
                                },
                                [],
                              ],
                            },
                          ],
                        },
                        { $eq: ["$stock.productId", "$$productId"] },
                      ],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                _id: "$stock._id",
                variantId: "$stock.variantId",
                quantity: "$stock.quantity",
                price: "$stock.price",
                mrp: "$stock.mrp",
              },
            },
          ],
          as: "inventory",
        },
      },
      {
        $addFields: {
          maxQuantity: { $ifNull: [{ $max: "$inventory.quantity" }, 0] },
          storeId: seller._id,
          storeName: seller.storeName,
        },
      },
      { $match: { maxQuantity: { $gt: 0 } } }, // filter products with no stock
      { $sort: { maxQuantity: -1 } },
      { $project: { maxQuantity: 0 } }, // remove temporary field
    ]);

    return res.status(200).json({
      message: "Recommended products fetched successfully",
      relatedProducts: recommendedProducts,
    });
  } catch (error) {
    console.error("❌ Error in recommedProduct:", error);
    return res
      .status(500)
      .json({ message: "An error occurred!", error: error.message });
  }
};
