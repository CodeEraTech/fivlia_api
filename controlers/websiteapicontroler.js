const Products = require("../modals/Product");
const Filters = require("../modals/filter");
const {
  getStoresWithinRadius,
  getBannersWithinRadius,
  calculateDeliveryTime,
  reverseGeocode,
} = require("../config/google");
const { addFiveMinutes } = require("../controlers/DeliveryControler");
const User = require("../modals/User");
const Category = require("../modals/category");
const contactUs = require("../modals/contactUs");
const { CityData, ZoneData } = require("../modals/cityZone");
const Stock = require("../modals/StoreStock");
const { SettingAdmin } = require("../modals/setting");
const { getDistance } = require("../config/Ola");
const page = require("../modals/pages");
const Store = require("../modals/store");

exports.forwebbestselling = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    const userLat = lat;
    const userLng = lng;

    const [activeCities, zoneDocs, stores] = await Promise.all([
      CityData.find({ status: true }, "city").lean(),
      ZoneData.find({}, "zones").lean(),
      getStoresWithinRadius(userLat, userLng),
    ]);

    const activeCitySet = new Set(
      activeCities.map((c) => c.city?.toLowerCase())
    );
    const activeZoneIds = new Set();

    for (const doc of zoneDocs) {
      for (const zone of doc.zones || []) {
        if (zone.status && zone._id) {
          activeZoneIds.add(zone._id.toString());
        }
      }
    }
    console.log("stores", stores);
    const allowedStores = Array.isArray(stores?.matchedStores)
      ? stores.matchedStores
      : [];

    if (!allowedStores.length) {
      return res.status(200).json({
        message: "No best-selling products found for your location.",
        best: [],
      });
    }

    const allCategoryIds = new Set();
    const categoryIds = allowedStores.flatMap((store) =>
      Array.isArray(store.Category) ? store.Category : [store.Category]
    );

    const uniqueCatIds = [
      ...new Set(categoryIds.filter(Boolean).map((id) => id.toString())),
    ];

    const categories = await Category.find({
      _id: { $in: uniqueCatIds },
    }).lean();
    for (const category of categories) {
      allCategoryIds.add(category._id.toString());
      for (const sub of category.subcat || []) {
        if (sub?._id) allCategoryIds.add(sub._id.toString());
        for (const subsub of sub.subsubcat || []) {
          if (subsub?._id) allCategoryIds.add(subsub._id.toString());
        }
      }
    }

    const categoryArray = Array.from(allCategoryIds);
    const allowedStoreIds = allowedStores.map((s) => s._id.toString());

    const stockDocs = await Stock.find({
      storeId: { $in: allowedStoreIds },
    }).lean();
    const stockMap = {};
    const stockDetailMap = {}; // 👈 to store full item (price, mrp etc.)

    for (const stockDoc of stockDocs) {
      for (const item of stockDoc.stock || []) {
        const key = `${item.productId}_${item.variantId}`;
        stockMap[key] = item.quantity;
        stockDetailMap[key] = item; // 👈 Store full stock item
      }
    }

    const best = await Products.find({
      $or: [
        { "category._id": { $in: categoryArray } },
        { "subCategory._id": { $in: categoryArray } },
        { "subSubCategory._id": { $in: categoryArray } },
      ],
    })
      .sort({ purchases: -1 })
      .limit(10)
      .lean();

    // ✅ Map inventory and cart into products
    for (const product of best) {
      product.inventory = [];
      product.inCart = { status: false, qty: 0, variantIds: [] };

      if (Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          const key = `${product._id}_${variant._id}`;
          const quantity = stockMap[key] || 0;

          const stockEntry = stockDetailMap[key];
          if (stockEntry?.price != null) {
            variant.sell_price = stockEntry.price;
          }
          if (stockEntry?.mrp != null) {
            variant.mrp = stockEntry.mrp;
          }

          product.inventory.push({ variantId: variant._id, quantity });
        }
      }
    }

    return res.status(200).json({
      message: "Success",
      best,
      count: best.length,
    });
  } catch (error) {
    console.error("❌ bestSelling error:", error);
    return res.status(500).json({
      message: "An error occurred!",
      error: error.message,
    });
  }
};

// Website: Get Product (no token, uses lat/lng from query)
exports.forwebgetProduct = async (req, res) => {
  try {
    const { id, lat, lng, page = 1, limit = 60 } = req.query;
    const skip = (page - 1) * limit;
    const userLat = lat;
    const userLng = lng;

    const [activeCities, zoneDocs, stores] = await Promise.all([
      CityData.find({ status: true }, "city").lean(),
      ZoneData.find({ status: true }, "zones").lean(),
      getStoresWithinRadius(userLat, userLng),
    ]);

    const allowedStores = Array.isArray(stores?.matchedStores)
      ? stores.matchedStores
      : [];
    if (!allowedStores.length) {
      return res.status(200).json({
        message: "No matching products found for your location.",
        products: [],
        filter: [],
        count: 0,
      });
    }

    const allowedStoreIds = allowedStores.map((s) => s._id);

    // Build category list
    const categoryIdSet = new Set();
    const storeCategoryIds = allowedStores
      .flatMap((store) =>
        Array.isArray(store.Category) ? store.Category : [store.Category]
      )
      .filter(Boolean);

    const categories = await Category.find({
      _id: { $in: storeCategoryIds },
    }).lean();

    categories.forEach((category) => {
      categoryIdSet.add(category._id.toString());
      category.subcat?.forEach((sub) => {
        if (sub?._id) categoryIdSet.add(sub._id.toString());
        sub.subsubcat?.forEach((subsub) => {
          if (subsub?._id) categoryIdSet.add(subsub._id.toString());
        });
      });
    });

    const categoryArray = Array.from(categoryIdSet);

    // Build product query
    let productQuery;
    if (id) {
      if (!categoryIdSet.has(id)) {
        return res.status(200).json({
          message: "No matching products found for your location.",
          products: [],
          filter: [],
          count: 0,
        });
      }
      productQuery = {
        $or: [
          { "category._id": id },
          { "subCategory._id": id },
          { "subSubCategory._id": id },
        ],
      };
    } else {
      productQuery = {
        $or: [
          { "category._id": { $in: categoryArray } },
          { "subCategory._id": { $in: categoryArray } },
          { "subSubCategory._id": { $in: categoryArray } },
        ],
      };
    }

    const [stockDocs, products, totalProducts] = await Promise.all([
      Stock.find({ storeId: { $in: allowedStoreIds } }).lean(),
      Products.find(productQuery).lean(),
      Products.countDocuments(productQuery),
    ]);

    // Build stock maps
    const stockMap = {};
    const stockDetailMap = {};
    stockDocs.forEach((doc) => {
      (doc.stock || []).forEach((entry) => {
        const key = `${entry.productId}_${entry.variantId}_${doc.storeId}`;
        stockMap[key] = entry.quantity;
        stockDetailMap[key] = entry;
      });
    });

    // Store lookup map
    const storeMap = {};
    allowedStores.forEach((s) => {
      storeMap[s._id.toString()] = s;
    });

    const enrichedProducts = [];

    for (const product of products) {
      if (!Array.isArray(product.variants) || !product.variants.length)
        continue;

      const variantOptions = [];

      product.variants.forEach((variant) => {
        allowedStoreIds.forEach((storeId) => {
          const key = `${product._id}_${variant._id}_${storeId}`;
          const quantity = stockMap[key] ?? 0;
          const stockEntry = stockDetailMap[key];
          const store = storeMap[storeId.toString()];
          if (!store) return;

          variantOptions.push({
            productId: product._id,
            variantId: variant._id,
            storeId: store._id,
            storeName: store.soldBy?.storeName || store.storeName,
            official: store.soldBy?.official || 0,
            rating: 5, // fixed rating for now
            distance: store.distance || 999999,
            price: stockEntry?.price ?? variant.sell_price ?? 0,
            mrp: stockEntry?.mrp ?? variant.mrp ?? 0,
            quantity,
          });
        });
      });

      if (!variantOptions.length) continue;

      // Sorting logic
      variantOptions.sort((a, b) => {
        if (a.official !== b.official) return b.official - a.official; // Authorized first
        if (a.rating !== b.rating) return b.rating - a.rating; // Rating desc
        if (a.price !== b.price) return a.price - b.price; // Price asc
        return a.distance - b.distance; // Distance asc
      });

      const best = variantOptions[0];

      const finalProduct = {
        ...product,
        storeId: best.storeId,
        storeName: best.storeName,
      };

      // Rebuild inventory
      finalProduct.inventory = product.variants.map((variant) => {
        const match = variantOptions.find(
          (opt) => opt.variantId.toString() === variant._id.toString()
        );
        return {
          variantId: variant._id,
          quantity: match ? match.quantity : 0,
        };
      });

      // Update sell_price and mrp for chosen variant
      product.variants.forEach((variant) => {
        const match = variantOptions.find(
          (opt) => opt.variantId.toString() === variant._id.toString()
        );
        if (match) {
          variant.sell_price = match.price;
          variant.mrp = match.mrp;
        }
      });

      enrichedProducts.push(finalProduct);
    }

    // Pagination after sorting
    const paginatedProducts = enrichedProducts.slice(
      skip,
      skip + Number(limit)
    );

    // Filters
    let filter = [];
    if (id) {
      const matchedCategory = await Category.findById(id).lean();
      if (matchedCategory?.filter?.length) {
        const filterIds = matchedCategory.filter.map((f) => f._id);
        filter = await Filters.find({ _id: { $in: filterIds } }).lean();
      }
    }

    return res.status(200).json({
      message: "Products fetched successfully.",
      filter,
      products: paginatedProducts,
      count: enrichedProducts.length,
      page: Number(page),
      limit: Number(limit) || "",
      totalPages: Math.ceil(enrichedProducts.length / limit) || "",
    });
  } catch (error) {
    console.error("❌ forwebgetProduct error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Website: Get Feature Product (no token, uses lat/lng from query)
exports.forwebgetFeatureProduct = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const userLat = lat;
    const userLng = lng;
    const [activeCities, zoneDocs, stores] = await Promise.all([
      CityData.find({ status: true }, "city").lean(),
      ZoneData.find({}, "zones").lean(),
      getStoresWithinRadius(userLat, userLng),
    ]);
    const activeCitySet = new Set(
      activeCities.map((c) => c.city.toLowerCase())
    );
    const activeZoneIds = new Set();
    for (const doc of zoneDocs) {
      (doc.zones || []).forEach((zone) => {
        if (zone.status && zone._id) {
          activeZoneIds.add(zone._id.toString());
        }
      });
    }
    const allowedStores = Array.isArray(stores?.matchedStores)
      ? stores.matchedStores
      : [];
    const allowedStoreIds = allowedStores.map((store) => store._id.toString());
    const categoryIds = new Set();
    const storeCategoryIds = allowedStores.flatMap((store) =>
      Array.isArray(store.Category)
        ? store.Category.map((id) => id?.toString())
        : store.Category
        ? [store.Category.toString()]
        : []
    );
    const uniqueCategoryIds = [...new Set(storeCategoryIds)];
    if (uniqueCategoryIds.length > 0) {
      const categories = await Category.find({
        _id: { $in: uniqueCategoryIds },
      }).lean();
      for (const cat of categories) {
        categoryIds.add(cat._id.toString());
        (cat.subcat || []).forEach((sub) => {
          if (sub?._id) categoryIds.add(sub._id.toString());
          (sub.subsubcat || []).forEach((subsub) => {
            if (subsub?._id) categoryIds.add(subsub._id.toString());
          });
        });
      }
    }
    const categoryArray = [...categoryIds];
    const stockDocs = await Stock.find({
      storeId: { $in: allowedStoreIds },
    }).lean();
    const stockMap = {};
    for (const doc of stockDocs) {
      for (const item of doc.stock || []) {
        const key = `${item.productId}_${item.variantId}`;
        stockMap[key] = item.quantity;
      }
    }
    const products = await Products.find({
      feature_product: true,
      $or: [
        { "category._id": { $in: categoryArray } },
        { subCategoryId: { $in: categoryArray } },
        { subSubCategoryId: { $in: categoryArray } },
      ],
    }).lean();
    for (const product of products) {
      product.inventory = [];
      if (Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          const key = `${product._id}_${variant._id}`;
          const quantity = stockMap[key] || 0;
          product.inventory.push({ variantId: variant._id, quantity });
        }
      }
    }
    return res.status(200).json({
      message: "It is feature product.",
      products,
      count: products.length,
    });
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred!", error: error.message });
  }
};

// Website: Search Product (no token, uses lat/lng from query)
exports.forwebsearchProduct = async (req, res) => {
  try {
    const { name, lat, lng } = req.query;
    const userLat = lat;
    const userLng = lng;
    const [stores] = await Promise.all([
      getStoresWithinRadius(userLat, userLng),
    ]);
    const allowedStores = Array.isArray(stores?.matchedStores)
      ? stores.matchedStores
      : [];
    const allowedStoreIds = allowedStores.map((s) => s._id.toString());
    const searchFilter = {};
    if (name) {
      searchFilter.productName = { $regex: name, $options: "i" };
    }
    const categoryIds = new Set();
    const storeCategoryIds = allowedStores.flatMap((store) =>
      Array.isArray(store.Category)
        ? store.Category.map((id) => id?.toString())
        : store.Category
        ? [store.Category.toString()]
        : []
    );
    const uniqueCategoryIds = [...new Set(storeCategoryIds)];
    if (uniqueCategoryIds.length > 0) {
      const categories = await Category.find({
        _id: { $in: uniqueCategoryIds },
      }).lean();
      for (const cat of categories) {
        categoryIds.add(cat._id.toString());
        (cat.subcat || []).forEach((sub) => {
          if (sub?._id) categoryIds.add(sub._id.toString());
          (sub.subsubcat || []).forEach((subsub) => {
            if (subsub?._id) categoryIds.add(subsub._id.toString());
          });
        });
      }
    }
    const categoryArray = [...categoryIds];
    const products = await Products.find({
      ...searchFilter,
      $or: [
        { "category._id": { $in: categoryArray } },
        { subCategoryId: { $in: categoryArray } },
        { subSubCategoryId: { $in: categoryArray } },
      ],
    }).lean();
    const stockDocs = await Stock.find({
      storeId: { $in: allowedStoreIds },
    }).lean();
    const stockMap = {};
    const stockDetailMap = {};
    for (const doc of stockDocs) {
      for (const item of doc.stock || []) {
        const key = `${item.productId}_${item.variantId}`;
        stockMap[key] = item.quantity;
        stockDetailMap[key] = item;
      }
    }
    for (const product of products) {
      product.inventory = [];
      for (const variant of product.variants || []) {
        const key = `${product._id}_${variant._id}`;
        const quantity = stockMap[key] || 0;
        const stockEntry = stockDetailMap[key];
        if (stockEntry?.price != null) variant.sell_price = stockEntry.price;
        if (stockEntry?.mrp != null) variant.mrp = stockEntry.mrp;
        product.inventory.push({ variantId: variant._id, quantity });
      }
    }
    return res.status(200).json({
      message: "Search results fetched successfully.",
      products,
      count: products.length,
    });
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred!", error: error.message });
  }
};

// Website: Get Related Products (no token, uses lat/lng from query)
exports.forwebgetRelatedProducts = async (req, res) => {
  try {
    const { productId, lat, lng } = req.query;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // --- Fetch base product & stores within radius in parallel
    const [product, stores] = await Promise.all([
      Products.findById(productId).lean(),
      getStoresWithinRadius(lat, lng),
    ]);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // --- Build allowed store IDs
    const allowedStores = Array.isArray(stores?.matchedStores)
      ? stores.matchedStores
      : [];
    const allowedStoreIds = allowedStores.map((s) => s._id.toString());

    // --- Get stock only for those stores
    const stockDocs = await Stock.find({
      storeId: { $in: allowedStoreIds },
    }).lean();
    const stockMap = {};
    for (const doc of stockDocs) {
      for (const item of doc.stock || []) {
        const key = `${item.productId}_${item.variantId}`;
        stockMap[key] = {
          quantity: item.quantity || 0,
          price: item.price ?? null,
          mrp: item.mrp ?? null,
        };
      }
    }

    // --- Build category filter
    const productCatIds = (product.category || []).map((c) => String(c._id));

    // --- Get related products by category match
    const candidates = await Products.find({
      _id: { $ne: productId },
      "category._id": { $in: productCatIds },
    })
      .hint("category._id_1") // Use index for fast lookup
      .limit(20) // fetch more, filter later
      .lean();

    // --- Score & filter candidates
    const relatedProducts = candidates
      .map((p) => {
        let score = 0;

        // Category match
        const pCatIds = (p.category || []).map((c) => String(c._id));
        if (pCatIds.some((id) => productCatIds.includes(id))) score += 1;

        // Brand match
        if (
          product.brand_Name?._id &&
          p.brand_Name?._id &&
          String(product.brand_Name._id) === String(p.brand_Name._id)
        ) {
          score += 1;
        }

        // Type match
        const matchedTypes = (p.type || []).filter((t) =>
          (product.type || []).includes(t)
        );
        if (matchedTypes.length > 0) score += 2;

        return { ...p, relevanceScore: score };
      })
      .filter((p) => p.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);

    // --- Attach inventory info
    for (const relProduct of relatedProducts) {
      relProduct.inventory = [];

      if (Array.isArray(relProduct.variants)) {
        for (const variant of relProduct.variants) {
          const key = `${relProduct._id}_${variant._id}`;
          const stockEntry = stockMap[key];

          // Update variant pricing if stock info available
          if (stockEntry?.price != null) variant.sell_price = stockEntry.price;
          if (stockEntry?.mrp != null) variant.mrp = stockEntry.mrp;

          relProduct.inventory.push({
            variantId: variant._id,
            quantity: stockEntry?.quantity || 0,
          });
        }
      }
    }

    return res.status(200).json({
      message: "Related Product",
      relatedProducts,
    });
  } catch (err) {
    console.error("❌ Error fetching related products (web):", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// Website: Get Banner (no token, uses lat/lng from query)
exports.forwebgetBanner = async (req, res) => {
  try {
    const { type, lat, lng } = req.query;
    const userLat = lat;
    const userLng = lng;

    // 🟢 Get active city names
    const activeCities = await CityData.find({ status: true }, "city").lean();
    const activeCityNames = activeCities.map((c) => c.city?.toLowerCase());

    // 🟢 Get active zone IDs
    const zoneDocs = await ZoneData.find({ status: true }, "zones").lean();
    const activeZoneIds = [];
    zoneDocs.forEach((doc) => {
      (doc.zones || []).forEach((zone) => {
        if (zone.status && zone._id) {
          activeZoneIds.push(zone._id.toString());
        }
      });
    });

    // 🔎 Apply base filters
    const filters = { status: true };
    if (type) {
      const validTypes = ["offer", "normal"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          message: 'Invalid banner type. Must be "offer" or "normal".',
        });
      }
      filters.type = type;
    }

    const Banner = require("../modals/banner");
    const { getBannersWithinRadius } = require("../config/google");
    const allBanners = await Banner.find(filters).lean();
    const matchedBanners = await getBannersWithinRadius(
      userLat,
      userLng,
      allBanners
    );

    if (!matchedBanners.length) {
      return res.status(200).json({
        message: "No banners found for your location.",
        count: 0,
        data: [],
      });
    }

    return res.status(200).json({
      message: "Banners fetched successfully.",
      count: matchedBanners.length,
      data: matchedBanners,
    });
  } catch (error) {
    console.error("❌ Error fetching banners:", error);
    return res.status(500).json({
      message: "An error occurred while fetching banners.",
      error: error.message,
      count: 0,
      data: [],
    });
  }
};

exports.getDeliveryEstimateForWebsite = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    const currentLat = lat;
    const currentLong = lng;

    if (!currentLat || !currentLong) {
      return res
        .status(200)
        .json({ status: false, message: "User location not set" });
    }

    const { zoneAvailable, matchedStores } = await getStoresWithinRadius(
      currentLat,
      currentLong
    );

    if (!zoneAvailable) {
      return res.json({ status: false, message: "Service zone not available" });
    }

    // Get admin settings for Map_Api
    const settings = await SettingAdmin.findOne().lean();
    const mapApiArray = settings?.Map_Api || [];
    const mapApi = mapApiArray[0] || {};

    const googleApi = mapApi?.google || {};
    const appleApi = mapApi?.apple || {};
    const olaApi = mapApi?.ola || {};

    const results = await Promise.all(
      matchedStores.map(async (store) => {
        if (!store.Latitude || !store.Longitude) return null;

        let result = null;

        // ✅ Use ONLY the API that admin has enabled
        if (googleApi.status && googleApi.api_key) {
          // Use Google API only
          try {
            result = await calculateDeliveryTime(
              parseFloat(store.Latitude),
              parseFloat(store.Longitude),
              currentLat,
              currentLong,
              googleApi.api_key
            );
            if (result) result.source = "google";
          } catch (err) {
            console.log("Google API failed:", err.message);
            return null; // No fallback, just return null
          }
        } else if (olaApi.status && olaApi.api_key) {
          try {
            const olaResult = await getDistance(
              {
                lat: parseFloat(store.Latitude),
                lng: parseFloat(store.Longitude),
              },
              { lat: currentLat, lng: currentLong },
              olaApi.api_key
            );

            if (olaResult.status === "OK") {
              result = {
                source: "ola",
                distanceText: olaResult.distance.text,
                durationText: olaResult.duration.text,
                trafficDurationText: olaResult.duration.text,
                distanceValue: olaResult.distance.value,
                durationValue: olaResult.duration.value,
                trafficDurationValue: olaResult.duration.value,
              };
            }
          } catch (err) {
            console.error("Ola API failed:", err.message);
            return null; // No fallback, just return null
          }
        } else if (appleApi.status && appleApi.api_key) {
          // Use Apple API only (when you implement it)
          console.log("Apple API not implemented yet");
          return null;
        }

        if (!result) return null;

        return {
          storeId: store._id,
          storeName: store.storeName,
          city: store.city?.name || null,
          distance: result.distanceText,
          duration: addFiveMinutes(result.trafficDurationText),
          raw: result,
        };
      })
    );

    const filtered = results.filter(Boolean);
    if (filtered.length === 0) {
      return res.json({ status: false, filtered });
    }

    res.json({ status: true, filtered });
  } catch (err) {
    console.error("💥 Delivery Error:", err);
    res
      .status(500)
      .json({ status: false, message: "Server error", error: err.message });
  }
};

exports.addPage = async (req, res) => {
  try {
    const { pageTitle, pageSlug, pageContent } = req.body;
    const addPage = await page.create({ pageTitle, pageSlug, pageContent });
    return res.status(200).json({ message: "Page Created", addPage });
  } catch (error) {
    console.error("Server Error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.editPage = async (req, res) => {
  try {
    const { id } = req.params;
    const { pageTitle, pageSlug, pageContent } = req.body;
    const editPage = await page.findByIdAndUpdate(
      id,
      { pageTitle, pageSlug, pageContent },
      { new: true }
    );
    return res.status(200).json({ message: "Page edited", editPage });
  } catch (error) {
    console.error("Server Error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.getPage = async (req, res) => {
  try {
    const { id } = req.query;

    if (id) {
      getPage = await page.findById(id);
    } else {
      getPage = await page.find();
    }

    return res.status(200).json({ message: "Pages", getPage });
  } catch (error) {
    console.error("Server Error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.deletePage = async (req, res) => {
  try {
    const { id } = req.params;
    const deletePage = await page.findByIdAndDelete(id);
    return res.status(200).json({ message: "Page delete", deletePage });
  } catch (error) {
    console.error("Server Error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.updatePageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedPage = await page.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!updatedPage) {
      return res.status(404).json({ message: "Page not found" });
    }
    return res.status(200).json({ message: "Status updated", updatedPage });
  } catch (error) {
    console.error("Error updating status:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.contactUs = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;
    const info = await contactUs.create({
      firstName,
      lastName,
      email,
      phone,
      message,
    });
    return res.status(200).json({ message: "Request Submitted", info });
  } catch (error) {
    console.error("Error updating status:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.getAllSellerProducts = async (req, res) => {
  const { id } = req.query;

  try {
    // 1. Fetch Stock data for the seller using sellerId
    const stockData = await Stock.find({ storeId: id }).populate({
      path: "stock.productId",
      model: "Product",
    });

    const seller = await Store.findOne({ _id: id }).select("storeName");

    if (!stockData || stockData.length === 0) {
      return res
        .status(404)
        .json({ message: "No stock data found for this seller." });
    }

    // 2. Collect all product IDs from the stock data
    const productIds = stockData.flatMap((item) =>
      item.stock.map((stockItem) => stockItem.productId)
    );

    // 3. Fetch products corresponding to the productIds
    const products = await Products.find({ _id: { $in: productIds } }).populate(
      [
        { path: "category", select: "name" },
        { path: "brand_Name", select: "name" },
        { path: "unit", select: "name" },
      ]
    );
    return res.status(200).json({ seller: seller, products: products });
  } catch (error) {
    console.error("Error fetching seller products:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
