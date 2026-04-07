const { Cart, Discount } = require("../modals/cart");
const { ZoneData } = require("../modals/cityZone");
const Products = require("../modals/Product");
const Store = require("../modals/store");
const User = require("../modals/User");
const stock = require("../modals/StoreStock");
const haversine = require("haversine-distance");
const Address = require("../modals/Address");
const { SettingAdmin } = require("../modals/setting");
const {
  getDistanceKm,
  getBillableKm,
  computeDeliveryCharge,
  resolveDeliveryRatesForMode,
} = require("../utils/deliveryCharge");
const {
  isWithinZone,
  getZoneWindowConfig,
  getCurrentZoneWindowMode,
} = require("../config/google");

exports.addCart = async (req, res) => {
  try {
    const userId = req.user;
    const { quantity, productId, storeId, varientId, clearCart } = req.body;

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
    // Fetch active zones
    const [zoneDocs, zoneWindowConfig] = await Promise.all([
      ZoneData.find({}),
      getZoneWindowConfig(),
    ]);
    const activeZones = zoneDocs.flatMap((doc) =>
      doc.zones.filter((z) => z.status === true),
    );

    const matchedZone = activeZones.find((zone) =>
      isWithinZone(userLat, userLng, zone, zoneWindowConfig),
    );

    if (!matchedZone) {
      return res
        .status(400)
        .json({ message: "No active zone found for your location." });
    }

    const paymentOption = matchedZone.cashOnDelivery === true;

    // Single-store cart policy
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

    // Check product
    const product = await Products.findOne({ _id: productId }).lean();
    if (!product) {
      return res.status(400).json({ message: "Product is unavailable." });
    }

    // Check stock entry
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
          s.variantId.toString() === varientId.toString(),
      );
    }

    if (!stockEntry || stockEntry.quantity < quantity) {
      return res.status(400).json({
        message:
          "Product variant is out of stock or requested quantity is unavailable.",
      });
    }

    const name = product.productName;
    const image = product.productThumbnailUrl;
    const tax = product.tax || "0%"; // fallback if not present
    let price = stockEntry?.price;
    let mrp = stockEntry?.mrp;

    // Fallback to product.variants if price or mrp is missing
    if (!price || !mrp) {
      const matchedVariant = product.variants?.find(
        (v) => v._id?.toString() === varientId?.toString(),
      );

      if (matchedVariant) {
        price = matchedVariant.sell_price;
        mrp = matchedVariant.mrp;
      }
    }

    // Final fallback to avoid undefined values (optional)
    if (!price || !mrp) {
      return res.status(400).json({
        message: "Price/MRP could not be determined for the selected variant.",
      });
    }

    // Remove old cart entry for same product
    await Cart.deleteOne({
      userId,
      productId,
    });

    // Create new cart item
    const cartItem = await Cart.create({
      name,
      image,
      quantity,
      price,
      mrp,
      tax,
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
    console.error("Error in add to cart", error);
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
      (z) => z._id.toString() === storeZone._id.toString(),
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

    const settings = await SettingAdmin.findOne().lean();
    let address = null;

    address = await Address.findOne({
      userId: id,
      default: true,
      isDeleted: { $ne: true },
    }).lean();
    if (!address) {
      address = await Address.findOne({
        userId: id,
        isDeleted: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    let deliveryCharge = 0;
    let deliveryDistanceKm = 0;
    let billableKm = 0;
    let deliveryChargeMode = "day";

    if (address && items?.length) {
      const storeId = items[0].storeId;
      const store = await Store.findById(storeId, {
        Latitude: 1,
        Longitude: 1,
      }).lean();

      const distanceMeters = Math.round(
        haversine(
          {
            lat: parseFloat(address?.latitude),
            lon: parseFloat(address?.longitude),
          },
          {
            lat: parseFloat(store?.Latitude),
            lon: parseFloat(store?.Longitude),
          },
        ),
      );

      deliveryDistanceKm = Number(getDistanceKm(distanceMeters).toFixed(2));
      billableKm = getBillableKm(distanceMeters);

      const zoneWindowConfig = await getZoneWindowConfig();
      const currentWindowMode = getCurrentZoneWindowMode(zoneWindowConfig);
      const { fixedFirstKm, perKm, appliedMode } = resolveDeliveryRatesForMode({
        settings,
        mode: currentWindowMode,
      });
      deliveryChargeMode = appliedMode;

      deliveryCharge = computeDeliveryCharge({
        distanceMeters,
        fixedFirstKm,
        perKm,
      });

      const itemsTotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      if (itemsTotal >= (settings?.freeDeliveryLimit || 0)) {
        deliveryCharge = 0;
      }
    }

    return res.status(200).json({
      status: true,
      message: "Cart items fetched successfully.",
      items: updatedItems,
      paymentOption: cashOnDelivery,
      StoreID: storeId,
      deliveryCharge,
      deliveryChargeMode,
      deliveryDistanceKm,
      billableKm,
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
      { new: true },
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

    const cartItems = await Cart.find({ userId }).lean();
    if (!cartItems.length) {
      return res.status(404).json({ message: "Cart is empty" });
    }

    const cartProductIds = cartItems
      .map((item) => item.productId?.toString())
      .filter(Boolean);
    const cartProductIdSet = new Set(cartProductIds);
    const sellerId = cartItems[0]?.storeId;

    if (!sellerId) {
      return res.status(404).json({ message: "Seller not found" });
    }

    const [cartProducts, seller, sellerStockDoc] = await Promise.all([
      Products.find({
        _id: { $in: cartProductIds },
      }).lean(),
      Store.findById(sellerId).lean(),
      stock.findOne({ storeId: sellerId }).lean(),
    ]);

    if (!cartProducts.length) {
      return res.status(404).json({ message: "Cart products not found" });
    }

    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    const sellerStockEntries = (sellerStockDoc?.stock || []).filter(
      (entry) =>
        entry?.productId &&
        !cartProductIdSet.has(entry.productId.toString()) &&
        Number(entry.quantity) > 0,
    );

    if (!sellerStockEntries.length) {
      return res.status(200).json({
        message: "No recommended products found",
        relatedProducts: [],
      });
    }

    const candidateProductIds = [
      ...new Set(sellerStockEntries.map((entry) => entry.productId.toString())),
    ];

    const candidateProducts = await Products.find({
      _id: { $in: candidateProductIds },
      status: true,
      online_visible: true,
    }).lean();

    const cartCategoryIds = new Set(
      cartProducts
        .flatMap((product) => product.category || [])
        .map((category) => category?._id?.toString())
        .filter(Boolean),
    );
    const cartSubCategoryIds = new Set(
      cartProducts
        .flatMap((product) => product.subCategory || [])
        .map((category) => category?._id?.toString())
        .filter(Boolean),
    );
    const cartSubSubCategoryIds = new Set(
      cartProducts
        .flatMap((product) => product.subSubCategory || [])
        .map((category) => category?._id?.toString())
        .filter(Boolean),
    );

    const stockByProductId = sellerStockEntries.reduce((acc, entry) => {
      const productId = entry.productId.toString();

      if (!acc[productId]) {
        acc[productId] = [];
      }

      acc[productId].push(entry);
      return acc;
    }, {});

    const recommendedProducts = candidateProducts
      .map((product) => {
        const productStockEntries =
          stockByProductId[product._id.toString()] || [];

        if (!productStockEntries.length) {
          return null;
        }

        let relationPriority = 0;

        if (
          (product.subSubCategory || []).some((category) =>
            cartSubSubCategoryIds.has(category?._id?.toString()),
          )
        ) {
          relationPriority = 3;
        } else if (
          (product.subCategory || []).some((category) =>
            cartSubCategoryIds.has(category?._id?.toString()),
          )
        ) {
          relationPriority = 2;
        } else if (
          (product.category || []).some((category) =>
            cartCategoryIds.has(category?._id?.toString()),
          )
        ) {
          relationPriority = 1;
        }

        const stockByVariantId = new Map(
          productStockEntries
            .filter((entry) => entry.variantId)
            .map((entry) => [entry.variantId.toString(), entry]),
        );

        const variants = Array.isArray(product.variants)
          ? product.variants
              .map((variant) => {
                const stockEntry = stockByVariantId.get(
                  variant?._id?.toString(),
                );

                if (!stockEntry) {
                  return null;
                }

                return {
                  ...variant,
                  sell_price: stockEntry.price ?? variant.sell_price,
                  mrp: stockEntry.mrp ?? variant.mrp,
                  quantity: stockEntry.quantity ?? 0,
                };
              })
              .filter((variant) => variant && variant.quantity > 0)
          : [];

        const inventory = productStockEntries
          .filter((entry) => Number(entry.quantity) > 0)
          .map((entry) => ({
            variantId: entry.variantId ?? null,
            quantity: entry.quantity,
            price: entry.price ?? null,
            mrp: entry.mrp ?? null,
          }));

        const maxQuantity = inventory.length
          ? Math.max(...inventory.map((item) => item.quantity || 0))
          : 0;

        if (!inventory.length) {
          return null;
        }

        return {
          ...product,
          variants,
          inventory,
          storeId: seller._id,
          storeName: seller.storeName,
          relationPriority,
          maxQuantity,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.relationPriority !== a.relationPriority) {
          return b.relationPriority - a.relationPriority;
        }

        if (b.maxQuantity !== a.maxQuantity) {
          return b.maxQuantity - a.maxQuantity;
        }

        return (a.productName || "").localeCompare(b.productName || "");
      })
      .slice(0, 20)
      .map(({ relationPriority, maxQuantity, ...product }) => product);

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

