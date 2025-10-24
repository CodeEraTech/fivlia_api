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
const mongoose = require("mongoose");
const Category = require("../modals/category");
const contactUs = require("../modals/contactUs");
const { CityData, ZoneData } = require("../modals/cityZone");
const Stock = require("../modals/StoreStock");
const { SettingAdmin } = require("../modals/setting");
const { getDistance } = require("../config/Ola");
const page = require("../modals/pages");
const Store = require("../modals/store");
const { lte } = require("zod/v4-mini");
const Rating = require("../modals/rating");
const {sendMailContact} = require("../config/nodeMailer");
const { contactUsTemplate } = require("../utils/emailTemplates");

exports.forwebbestselling = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const userLat = lat;
    const userLng = lng;

    // Fetch active cities, zones, and allowed stores
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
        if (zone.status && zone._id) activeZoneIds.add(zone._id.toString());
      }
    }

    const allowedStores = Array.isArray(stores?.matchedStores)
      ? stores.matchedStores
      : [];

    if (!allowedStores.length) {
      return res.status(200).json({
        message: "No best-selling products found for your location.",
        best: [],
      });
    }

    // Collect all category IDs
    const allCategoryIds = new Set();
    let categoryIds = allowedStores.flatMap((store) =>
      Array.isArray(store.Category) ? store.Category : [store.Category]
    );

    if (categoryIds.length < 1) {
      allowedStores.forEach((store) => {
        store.sellerCategories?.forEach((category) => {
          const catId = category.categoryId;
          if (catId) allCategoryIds.add(catId);
          category.subCategories?.forEach((subCat) => {
            const subCatId = subCat.subCategoryId;
            if (subCatId) allCategoryIds.add(subCatId);
            subCat.subSubCategories?.forEach((subSubCat) => {
              const subSubCatId = subSubCat.subSubCategoryId;
              if (subSubCatId) allCategoryIds.add(subSubCatId);
            });
          });
        });
      });
    } else {
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
    }

    const categoryArray = Array.from(allCategoryIds);
    const allowedStoreIds = allowedStores.map((s) => s._id.toString());

    // Fetch stock only for allowed stores
    const stockDocs = await Stock.find({
      storeId: { $in: allowedStoreIds },
    }).lean();

    // Map product-variant-stock entries for quick lookup
    const stockMap = {};
    const stockDetailMap = {};

    for (const stockDoc of stockDocs) {
      for (const item of stockDoc.stock || []) {
        const key = `${item.productId}_${item.variantId}_${stockDoc.storeId}`;
        stockMap[key] = item.quantity; // quantity (can be 0)
        stockDetailMap[key] = item; // full stock item
      }
    }

    // Only include products that have at least one entry in stock
    const stockProductIds = new Set(
      stockDocs.flatMap((doc) =>
        (doc.stock || []).map((item) => item.productId.toString())
      )
    );

    // Fetch best-selling products from allowed categories and stock
    const best = await Products.find({
      $and: [
        { _id: { $in: Array.from(stockProductIds) } },
        {
          $or: [
            { "category._id": { $in: categoryArray } },
            { "subCategory._id": { $in: categoryArray } },
            { "subSubCategory._id": { $in: categoryArray } },
          ],
        },
      ],
    })
      .sort({ purchases: -1 })
      .limit(10)
      .lean();

    // Enrich products with store & inventory info
    const enrichedBestProducts = [];
    const storeMap = {};
    allowedStores.forEach((store) => {
      storeMap[store._id.toString()] = store;
    });

    for (const product of best) {
      if (!Array.isArray(product.variants) || !product.variants.length)
        continue;

      const variantOptions = [];
      product.variants.forEach((variant) => {
        allowedStoreIds.forEach((storeId) => {
          const key = `${product._id}_${variant._id}_${storeId}`;
          const stockEntry = stockDetailMap[key];
          const store = storeMap[storeId];
          if (!stockEntry || !store) return;
          variantOptions.push({
            productId: product._id,
            variantId: variant._id,
            storeId: store._id,
            storeName: store.soldBy?.storeName || store.storeName,
            official: store.soldBy?.official || 0,
            rating: 5, // fixed rating
            distance: store.distance || 999999,
            price: stockEntry.price ?? variant.sell_price ?? 0,
            mrp: stockEntry.mrp ?? variant.mrp ?? 0,
            quantity: stockEntry.quantity,
          });
        });
      });

      if (!variantOptions.length) continue;

      variantOptions.sort((a, b) => {
        // 1. Stock availability: prioritize in-stock items
        const aInStock = a.quantity > 0 ? 1 : 0;
        const bInStock = b.quantity > 0 ? 1 : 0;
        if (aInStock !== bInStock) return bInStock - aInStock;
        // 2. Official store
        if (a.official !== b.official) return b.official - a.official;
        // 3. Rating
        if (a.rating !== b.rating) return b.rating - a.rating;
        // 4. Price (lowest first)
        if (a.price !== b.price) return a.price - b.price;
        // 5. Distance (nearest first)
        return a.distance - b.distance;
      });

      const bestVariant = variantOptions[0];
      const enrichedProduct = {
        ...product,
        storeId: bestVariant.storeId,
        storeName: bestVariant.storeName,
      };

      // Rebuild inventory for this product
      enrichedProduct.inventory = product.variants.map((variant) => {
        const match = variantOptions.find(
          (opt) => opt.variantId.toString() === variant._id.toString()
        );
        return { variantId: variant._id, quantity: match ? match.quantity : 0 };
      });

      // Update sell_price and mrp for the selected variant
      product.variants.forEach((variant) => {
        const match = variantOptions.find(
          (opt) => opt.variantId.toString() === variant._id.toString()
        );
        if (match) {
          variant.sell_price = match.price;
          variant.mrp = match.mrp;
        }
      });

      enrichedBestProducts.push(enrichedProduct);
    }

    enrichedBestProducts.sort((a, b) => {
      const aQty = a.inventory?.some((i) => i.quantity > 0) ? 1 : 0;
      const bQty = b.inventory?.some((i) => i.quantity > 0) ? 1 : 0;
      return bQty - aQty;
    });

    return res.status(200).json({
      message: "Success",
      best: enrichedBestProducts,
      count: enrichedBestProducts.length,
    });
  } catch (error) {
    console.error("❌ bestSelling error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred!", error: error.message });
  }
};

// Website: Get Product (no token, uses lat/lng from query)
exports.forwebgetProduct = async (req, res) => {
  try {
    const {
      seller,
      category,
      subCategory,
      subSubCategory,
      priceMin,
      priceMax,
      filterId,
      lat,
      lng,
      page = 1,
      limit = 60,
    } = req.query;

    const skip = (page - 1) * limit;

    // 1. Get allowed stores by location
    let allowedStores = [];
    if (seller) {
      const store = await Store.findById(seller).lean();
      if (store) {
        allowedStores = [store];
      }
    } else {
      const stores = await getStoresWithinRadius(lat, lng);
      allowedStores = Array.isArray(stores?.matchedStores)
        ? stores.matchedStores
        : [];
    }

    const allowedStoreIds = allowedStores.map((s) => s._id.toString());

    if (!allowedStoreIds.length) {
      return res.status(200).json({
        message: "No matching products found for your location.",
        products: [],
        filter: [],
        count: 0,
        totalPages: 0,
        page: Number(page),
        limit: Number(limit),
      });
    }

    // 2. Get all allowed category IDs
    const allCategoryIds = new Set();
    let storeCategoryIds = allowedStores.flatMap((store) =>
      Array.isArray(store.Category)
        ? store.Category.map((id) => id?.toString())
        : store.Category
        ? [store.Category.toString()]
        : []
    );

    if (storeCategoryIds.length < 1) {
      allowedStores.forEach((store) => {
        store.sellerCategories?.forEach((categoryObj) => {
          if (categoryObj?.categoryId)
            allCategoryIds.add(categoryObj.categoryId);
          categoryObj.subCategories?.forEach((sub) => {
            if (sub?.subCategoryId) allCategoryIds.add(sub.subCategoryId);
            sub.subSubCategories?.forEach((ss) => {
              if (ss?.subSubCategoryId) allCategoryIds.add(ss.subSubCategoryId);
            });
          });
        });
      });
    } else {
      const uniqueCatIds = [...new Set(storeCategoryIds)];
      const categories = await Category.find({
        _id: { $in: uniqueCatIds },
      }).lean();
      for (const cat of categories) {
        allCategoryIds.add(cat._id.toString());
        (cat.subcat || []).forEach((sub) => {
          if (sub?._id) allCategoryIds.add(sub._id.toString());
          (sub.subsubcat || []).forEach((ss) => {
            if (ss?._id) allCategoryIds.add(ss._id.toString());
          });
        });
      }
    }

    const categoryScopeIds = Array.from(allCategoryIds);

    // 3. Get stock documents for current location stores
    const stockDocs = await Stock.find({
      storeId: { $in: allowedStoreIds },
    }).lean();

    const stockDetailMap = {};

    for (const doc of stockDocs) {
      (doc.stock || []).forEach((entry) => {
        const key = `${entry.productId}_${entry.variantId}_${doc.storeId}`;
        stockDetailMap[key] = entry;
      });
    }

    // 4. Build product query
    const productQuery = {
      $or: [
        { "category._id": { $in: categoryScopeIds } },
        { "subCategory._id": { $in: categoryScopeIds } },
        { "subSubCategory._id": { $in: categoryScopeIds } },
      ],
    };

    if (category) {
      const catArr = Array.isArray(category) ? category : [category];
      productQuery.$or = [
        { "category._id": { $in: catArr } },
        { "subCategory._id": { $in: catArr } },
        { "subSubCategory._id": { $in: catArr } },
      ];
    }

    if (subCategory) {
      const subArr = Array.isArray(subCategory) ? subCategory : [subCategory];
      productQuery["subCategory._id"] = { $in: subArr };
    }

    if (subSubCategory) {
      const ssArr = Array.isArray(subSubCategory)
        ? subSubCategory
        : [subSubCategory];
      productQuery["subSubCategory._id"] = { $in: ssArr };
    }

    // 5. Get all products in the category scope
    const allProducts = await Products.find(productQuery).lean();

    const storeMap = {};
    allowedStores.forEach((s) => {
      storeMap[s._id.toString()] = s;
    });

    const enriched = [];

    for (const product of allProducts) {
      if (!Array.isArray(product.variants) || product.variants.length === 0) {
        continue;
      }

      const variantOptions = [];

      for (const variant of product.variants) {
        for (const storeId of allowedStoreIds) {
          const key = `${product._id}_${variant._id}_${storeId}`;
          const stockEntry = stockDetailMap[key];
          const store = storeMap[storeId];
          if (!store) continue;

          const price = stockEntry?.price ?? variant.sell_price ?? 0;
          const mrp = stockEntry?.mrp ?? variant.mrp ?? 0;

          // Apply price range filters
          if (priceMin != null && price < Number(priceMin)) continue;
          if (priceMax != null && price > Number(priceMax)) continue;

          if (filterId) {
            const matches = (product.filter || []).some((f) =>
              (f.selected || []).some(
                (sel) => sel._id.toString() === filterId.toString()
              )
            );
            if (!matches) continue;
          }

          variantOptions.push({
            productId: product._id.toString(),
            variantId: variant._id.toString(),
            storeId: store._id.toString(),
            storeName: store.soldBy?.storeName || store.storeName,
            official: store.soldBy?.official || 0,
            rating: variant.rating ?? product.rating ?? 0,
            distance: store.distance ?? Number.MAX_SAFE_INTEGER,
            price,
            mrp,
            quantity: stockEntry?.quantity ?? 0,
          });
        }
      }

      let finalProd = {
        ...product,
        storeId: null,
        storeName: "",
        inventory: [],
        variants: [],
      };

      if (variantOptions.length > 0) {
        variantOptions.sort((a, b) => {
          const aInStock = a.quantity > 0 ? 1 : 0;
          const bInStock = b.quantity > 0 ? 1 : 0;
          if (aInStock !== bInStock) return bInStock - aInStock;
          if (a.official !== b.official) return b.official - a.official;
          if (a.rating !== b.rating) return b.rating - a.rating;
          if (a.price !== b.price) return a.price - b.price;
          return a.distance - b.distance;
        });

        const best = variantOptions[0];
        finalProd.storeId = best.storeId;
        finalProd.storeName = best.storeName;

        finalProd.inventory = product.variants.map((variant) => {
          const match = variantOptions.find(
            (opt) => opt.variantId === variant._id.toString()
          );
          return {
            variantId: variant._id.toString(),
            quantity: match?.quantity || 0,
          };
        });

        finalProd.variants = product.variants.map((variant) => {
          const match = variantOptions.find(
            (opt) => opt.variantId === variant._id.toString()
          );
          return {
            ...variant,
            sell_price: match?.price ?? variant.sell_price,
            mrp: match?.mrp ?? variant.mrp,
          };
        });
      } else {
        // No stock entries matched → default pricing/inventory
        finalProd.inventory = product.variants.map((variant) => ({
          variantId: variant._id.toString(),
          quantity: 0,
        }));

        finalProd.variants = product.variants.map((variant) => ({
          ...variant,
          sell_price: variant.sell_price ?? 0,
          mrp: variant.mrp ?? 0,
        }));
      }

      enriched.push(finalProd);
    }

    enriched.sort((a, b) => {
      const aQty = a.inventory?.some((i) => i.quantity > 0) ? 1 : 0;
      const bQty = b.inventory?.some((i) => i.quantity > 0) ? 1 : 0;
      return bQty - aQty;
    });

    const totalEnriched = enriched.length;
    const sliced = enriched.slice(skip, skip + Number(limit));

    // 6. Get filters (if category is present)
    let filterList = [];
    if (category) {
      const catId = Array.isArray(category) ? category[0] : category;
      const catDoc = await Category.findById(catId).lean();
      if (catDoc?.filter?.length) {
        const filterIds = catDoc.filter.map((f) => f._id);
        filterList = await Filters.find({ _id: { $in: filterIds } }).lean();
      }
    }

    return res.status(200).json({
      message: "Products fetched successfully.",
      filter: filterList,
      products: sliced,
      count: totalEnriched,
      totalPages: Math.ceil(totalEnriched / Number(limit)),
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error("❌ forwebgetProduct error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Website: Get Product count by category
exports.getCategoryCounts = async (req, res) => {
  try {
    const { seller, category, subCategory, subSubCategory, lat, lng } =
      req.query;

    // Build base product query filtering by stock presence
    const productQuery = {};

    // Apply filters same as your main endpoint
    if (seller) {
      const stockData = await Stock.find({ storeId: seller }).lean();
      const stockEntries = stockData.flatMap((doc) => doc.stock || []);

      if (!stockData || stockData.length === 0) {
        return res
          .status(404)
          .json({ message: "No stock data found for this seller." });
      }

      let productIds = stockEntries.map((s) => s.productId).filter(Boolean);
      if (productIds.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No products found for this seller",
        });
      }
      productQuery["_id"] = { $in: productIds };
    }
    if (category) {
      const catArr = Array.isArray(category) ? category : [category];
      productQuery["category._id"] = { $in: catArr };
    }
    if (subCategory) {
      const subArr = Array.isArray(subCategory) ? subCategory : [subCategory];
      productQuery["subCategory._id"] = { $in: subArr };
    }
    if (subSubCategory) {
      const ssArr = Array.isArray(subSubCategory)
        ? subSubCategory
        : [subSubCategory];
      productQuery["subSubCategory._id"] = { $in: ssArr };
    }

    // Fetch products matching query (ignoring inventory for simplicity)
    const products = await Products.find(productQuery).lean();

    // 5. Count in-memory categories / sub / subsub
    const counts = {
      main: {},
      subcat: {},
      subsubcat: {},
    };

    for (const prod of products) {
      // main category
      if (Array.isArray(prod.category) && prod.category.length > 0) {
        const mainCatId = prod.category[0]._id.toString();
        counts.main[mainCatId] = (counts.main[mainCatId] || 0) + 1;
      }

      // sub category
      if (Array.isArray(prod.subCategory)) {
        prod.subCategory.forEach((sc) => {
          const scId = sc._id.toString();
          counts.subcat[scId] = (counts.subcat[scId] || 0) + 1;
        });
      }

      // sub-sub category
      if (Array.isArray(prod.subSubCategory)) {
        prod.subSubCategory.forEach((ss) => {
          const ssId = ss._id.toString();
          counts.subsubcat[ssId] = (counts.subsubcat[ssId] || 0) + 1;
        });
      }
    }
    return res.json({ counts });
  } catch (err) {
    console.error("getCategoryCounts error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Website: Get Feature Product (no token, uses lat/lng from query)
exports.forwebgetFeatureProduct = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const userLat = lat;
    const userLng = lng;

    // Fetch active cities, zones, and allowed stores
    const [activeCities, zoneDocs, stores] = await Promise.all([
      CityData.find({ status: true }, "city").lean(),
      ZoneData.find({}, "zones").lean(),
      getStoresWithinRadius(userLat, userLng),
    ]);

    const activeCitySet = new Set(
      activeCities.map((c) => c.city.toLowerCase())
    );
    const activeZoneIds = new Set();

    // Populate active zone ids
    for (const doc of zoneDocs) {
      (doc.zones || []).forEach((zone) => {
        if (zone.status && zone._id) activeZoneIds.add(zone._id.toString());
      });
    }

    // Get allowed stores based on radius and status
    const allowedStores = Array.isArray(stores?.matchedStores)
      ? stores.matchedStores
      : [];
    const allowedStoreIds = allowedStores.map((store) => store._id.toString());

    if (!allowedStores.length) {
      return res.status(200).json({
        message: "No feature products found for your location.",
        products: [],
      });
    }

    // Collect all category IDs
    const allCategoryIds = new Set();
    let storeCategoryIds = allowedStores.flatMap((store) =>
      Array.isArray(store.Category)
        ? store.Category.map((id) => id?.toString())
        : store.Category
        ? [store.Category.toString()]
        : []
    );

    // Fallback to sellerCategories if no Category found
    if (storeCategoryIds.length < 1) {
      allowedStores.forEach((store) => {
        store.sellerCategories?.forEach((category) => {
          if (category?.categoryId) allCategoryIds.add(category.categoryId);
          category.subCategories?.forEach((sub) => {
            if (sub?.subCategoryId) allCategoryIds.add(sub.subCategoryId);
            sub.subSubCategories?.forEach((subsub) => {
              if (subsub?.subSubCategoryId)
                allCategoryIds.add(subsub.subSubCategoryId);
            });
          });
        });
      });
    } else {
      const uniqueCategoryIds = [...new Set(storeCategoryIds)];
      const categories = await Category.find({
        _id: { $in: uniqueCategoryIds },
      }).lean();
      for (const cat of categories) {
        allCategoryIds.add(cat._id.toString());
        (cat.subcat || []).forEach((sub) => {
          if (sub?._id) allCategoryIds.add(sub._id.toString());
          (sub.subsubcat || []).forEach((subsub) => {
            if (subsub?._id) allCategoryIds.add(subsub._id.toString());
          });
        });
      }
    }

    const categoryArray = [...allCategoryIds];

    // Get stock data for allowed stores
    const stockDocs = await Stock.find({
      storeId: { $in: allowedStoreIds },
    }).lean();

    const stockMap = {};
    const stockDetailMap = {};

    // Map stock entries for quick lookup
    for (const doc of stockDocs) {
      for (const item of doc.stock || []) {
        const key = `${item.productId}_${item.variantId}_${doc.storeId}`;
        stockMap[key] = item.quantity;
        stockDetailMap[key] = item; // full stock info
      }
    }

    // Only include products which have stock entries
    const stockProductIds = new Set(
      stockDocs.flatMap((doc) =>
        (doc.stock || []).map((item) => item.productId.toString())
      )
    );

    // Fetch featured products based on category and stock
    const products = await Products.find({
      feature_product: true,
      _id: { $in: Array.from(stockProductIds) },
      $or: [
        { "category._id": { $in: categoryArray } },
        { "subCategory._id": { $in: categoryArray } },
        { "subSubCategory._id": { $in: categoryArray } },
      ],
    }).lean();

    // Enrich products with inventory and store details
    const enrichedFeatureProducts = [];
    const storeMap = {};
    allowedStores.forEach((store) => {
      storeMap[store._id.toString()] = store;
    });

    for (const product of products) {
      if (!Array.isArray(product.variants) || !product.variants.length)
        continue;

      const variantOptions = [];

      product.variants.forEach((variant) => {
        allowedStoreIds.forEach((storeId) => {
          const key = `${product._id}_${variant._id}_${storeId}`;
          const stockEntry = stockDetailMap[key];
          const store = storeMap[storeId];
          if (!store || !stockEntry) return;

          variantOptions.push({
            productId: product._id,
            variantId: variant._id,
            storeId: store._id,
            storeName: store.soldBy?.storeName || store.storeName,
            official: store.soldBy?.official || 0,
            rating: 5,
            distance: store.distance || 999999,
            price: stockEntry.price ?? variant.sell_price ?? 0,
            mrp: stockEntry.mrp ?? variant.mrp ?? 0,
            quantity: stockEntry.quantity,
          });
        });
      });

      if (!variantOptions.length) continue;

      variantOptions.sort((a, b) => {
        // 1. Stock availability: prioritize in-stock items
        const aInStock = a.quantity > 0 ? 1 : 0;
        const bInStock = b.quantity > 0 ? 1 : 0;
        if (aInStock !== bInStock) return bInStock - aInStock;
        // 2. Official store
        if (a.official !== b.official) return b.official - a.official;
        // 3. Rating
        if (a.rating !== b.rating) return b.rating - a.rating;
        // 4. Price (lowest first)
        if (a.price !== b.price) return a.price - b.price;
        // 5. Distance (nearest first)
        return a.distance - b.distance;
      });

      const bestVariant = variantOptions[0];

      const enrichedProduct = {
        ...product,
        storeId: bestVariant.storeId,
        storeName: bestVariant.storeName,
      };

      // Rebuild inventory
      enrichedProduct.inventory = product.variants.map((variant) => {
        const match = variantOptions.find(
          (opt) => opt.variantId.toString() === variant._id.toString()
        );
        return { variantId: variant._id, quantity: match ? match.quantity : 0 };
      });

      // Update variant prices
      product.variants.forEach((variant) => {
        const match = variantOptions.find(
          (opt) => opt.variantId.toString() === variant._id.toString()
        );
        if (match) {
          variant.sell_price = match.price;
          variant.mrp = match.mrp;
        }
      });

      enrichedFeatureProducts.push(enrichedProduct);
    }

    enrichedFeatureProducts.sort((a, b) => {
      const aQty = a.inventory?.some((i) => i.quantity > 0) ? 1 : 0;
      const bQty = b.inventory?.some((i) => i.quantity > 0) ? 1 : 0;
      return bQty - aQty;
    });

    return res.status(200).json({
      message: "Feature products fetched successfully.",
      products: enrichedFeatureProducts,
      count: enrichedFeatureProducts.length,
    });
  } catch (error) {
    //console.error("❌ forwebgetFeatureProduct error:", error);
    return res.status(500).json({
      message: "An error occurred!",
      error: error.message,
    });
  }
};

// Website: Search Product (no token, uses lat/lng from query)
exports.forwebsearchProduct = async (req, res) => {
  try {
    const { name, lat, lng } = req.query;
    const userLat = lat;
    const userLng = lng;

    // Fetch stores within radius
    const [stores] = await Promise.all([
      getStoresWithinRadius(userLat, userLng),
    ]);
    const allowedStores = Array.isArray(stores?.matchedStores)
      ? stores.matchedStores
      : [];
    const allowedStoreIds = allowedStores.map((s) => s._id.toString());

    // Derive categories from allowed stores
    const allCategoryIds = new Set();
    const storeCategoryIds = allowedStores.flatMap((store) =>
      Array.isArray(store.Category)
        ? store.Category.map((id) => id?.toString())
        : store.Category
        ? [store.Category.toString()]
        : []
    );

    if (storeCategoryIds.length < 1) {
      // fallback to sellerCategories
      allowedStores.forEach((store) => {
        store.sellerCategories?.forEach((category) => {
          if (category?.categoryId) allCategoryIds.add(category.categoryId);
          category.subCategories?.forEach((sub) => {
            if (sub?.subCategoryId) allCategoryIds.add(sub.subCategoryId);
            sub.subSubCategories?.forEach((subsub) => {
              if (subsub?.subSubCategoryId)
                allCategoryIds.add(subsub.subSubCategoryId);
            });
          });
        });
      });
    } else {
      const uniqueCategoryIds = [...new Set(storeCategoryIds)];
      const categories = await Category.find({
        _id: { $in: uniqueCategoryIds },
      }).lean();
      for (const cat of categories) {
        allCategoryIds.add(cat._id.toString());
        (cat.subcat || []).forEach((sub) => {
          if (sub?._id) allCategoryIds.add(sub._id.toString());
          (sub.subsubcat || []).forEach((subsub) => {
            if (subsub?._id) allCategoryIds.add(subsub._id.toString());
          });
        });
      }
    }

    const categoryArray = [...allCategoryIds].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // Fetch stock data
    const stockDocs = await Stock.find({
      storeId: { $in: allowedStoreIds },
    }).lean();

    const stockDetailMap = {};
    for (const doc of stockDocs) {
      for (const item of doc.stock || []) {
        const key = `${item.productId}_${item.variantId}_${doc.storeId}`;
        stockDetailMap[key] = item;
      }
    }

    const storeMap = {};
    allowedStores.forEach((store) => {
      storeMap[store._id.toString()] = store;
    });

    // Only include products that have at least one entry in stock
    const stockProductIds = new Set(
      stockDocs.flatMap((doc) =>
        (doc.stock || []).map((item) => item.productId.toString())
      )
    );

    // Build aggregation pipeline using Atlas Search
    const pipeline = [];

    // If name exists, use $search stage
    if (name) {
      pipeline.push({
        $search: {
          index: "product_search",
          compound: {
            should: [
              {
                autocomplete: {
                  query: name,
                  path: "productName",
                  fuzzy: {
                    maxEdits: 1,
                    prefixLength: 2,
                    maxExpansions: 50,
                  },
                },
              },
              {
                autocomplete: {
                  query: name,
                  path: "brand_Name.name",
                  fuzzy: {
                    maxEdits: 1,
                    prefixLength: 2,
                    maxExpansions: 50,
                  },
                },
              },
              {
                autocomplete: {
                  query: name,
                  path: "description",
                  fuzzy: {
                    maxEdits: 1,
                    prefixLength: 2,
                    maxExpansions: 50,
                  },
                },
              },
            ],
          },
        },
      });
    }

    // Match stage: filter by category & visibility
    pipeline.push({
      $match: {
        online_visible: true,
        _id: {
          $in: Array.from(stockProductIds).map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
        },
        $or: [
          { "category._id": { $in: categoryArray } },
          { "subCategory._id": { $in: categoryArray } },
          { "subSubCategory._id": { $in: categoryArray } },
        ],
      },
    });

    // Optionally, limit number of results to keep response fast
    pipeline.push({ $limit: 100 });

    const best = await Products.find({
      $and: [
        { _id: { $in: Array.from(stockProductIds) } },
        {
          $or: [
            { "category._id": { $in: categoryArray } },
            { "subCategory._id": { $in: categoryArray } },
            { "subSubCategory._id": { $in: categoryArray } },
          ],
        },
      ],
    });

    // Execute aggregation
    const products = await Products.aggregate(pipeline);

    // Enrich product objects with inventory, price, best store etc.
    for (const product of products) {
      let bestStore = null;
      product.inventory = [];

      for (const variant of product.variants || []) {
        allowedStoreIds.forEach((storeId) => {
          const key = `${product._id}_${variant._id}_${storeId}`;
          const stockEntry = stockDetailMap[key];
          const store = storeMap[storeId];

          if (store && stockEntry) {
            // Set variant pricing & quantity
            variant.price = stockEntry.price ?? variant.sell_price ?? 0;
            variant.mrp = stockEntry.mrp ?? variant.mrp ?? 0;
            variant.quantity = stockEntry.quantity;

            product.inventory.push({
              variantId: variant._id,
              quantity: stockEntry.quantity,
            });

            // Evaluate best store logic
            if (
              !bestStore ||
              (store.soldBy?.official && !bestStore.soldBy?.official)
            ) {
              bestStore = store;
            }
          }
        });
      }

      if (bestStore) {
        product.storeId = bestStore._id;
        product.soldBy = bestStore.soldBy?.storeName || bestStore.storeName;
      }
    }

    // Return with same structure (keys/values) as before
    return res.status(200).json({
      message: "Search results fetched successfully.",
      products,
      count: products.length,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return res.status(500).json({
      message: "An error occurred!",
      error: error.message,
    });
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
    await contactUs.create({
      firstName,
      lastName,
      email,
      phone,
      message,
    });
    
   await sendMailContact(
              "support@fivlia.in",
              "New Contact Request",
              contactUsTemplate(firstName,lastName,email,phone,message)
            );
    return res.status(200).json({ message: "Request Submitted" });
  } catch (error) {
    //console.error("Error updating status:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.getAllSellerProducts = async (req, res) => {
  const { id, page, limit } = req.query;
  const skip = (page - 1) * limit;
  try {
    // 1. Fetch Stock data for the seller using sellerId
    const stockData = await Stock.find({ storeId: id }).lean();

    const seller = await Store.findOne({ _id: id }).select(
      "storeName sellerCategories advertisementImages"
    );
    const stockEntries = stockData.flatMap((doc) => doc.stock || []);

    if (!stockData || stockData.length === 0) {
      return res
        .status(404)
        .json({ message: "No stock data found for this seller." });
    }

    let productIds = stockEntries.map((s) => s.productId).filter(Boolean);
    if (productIds.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No products found for this seller" });
    }

    const productFilter = { _id: { $in: productIds } };

    const total = await Products.countDocuments(productFilter);

    const sellerProducts = await Products.find(productFilter)
      .skip(skip)
      .limit(parseInt(limit))
      .populate([
        { path: "category", select: "name" },
        { path: "brand_Name", select: "name" },
        { path: "unit", select: "name" },
      ])
      .lean();

    const productsWithStock = await Promise.all(
      sellerProducts.map(async (prod) => {
        // Find all stock entries for this product
        const productStockEntries = stockEntries.filter(
          (s) => s.productId?.toString() === prod._id.toString()
        );

        // Prepare variants with stock
        const variantsWithStock = (prod.variants || []).map((variant) => {
          const stockEntry = productStockEntries.find(
            (s) => s.variantId?.toString() === variant._id.toString()
          );
          return {
            ...variant,
            stock: stockEntry?.quantity ?? 0,
            mrp: stockEntry?.mrp ?? variant.mrp,
            sell_price: stockEntry?.price ?? variant.sell_price,
            status: stockEntry?.status ?? false,
          };
        });

        const inventoryWithStock = (prod.inventory || []).map((inv) => {
          const stockEntry = productStockEntries.find(
            (s) => s.variantId?.toString() === inv.variantId?.toString()
          );
          return {
            ...inv,
            quantity: stockEntry?.quantity ?? 0, // overwrite with live stock quantity
          };
        });

        // Determine category name + commission if needed
        const categoryName = prod.category?.name ?? "Uncategorized";

        return {
          ...prod,
          variants: variantsWithStock,
          inventory: inventoryWithStock,
          status: productStockEntries.some((s) => s.status) ?? false,
          storeId: seller._id,
          storeName: seller.storeName,
        };
      })
    );
    // get and set all categories
    const categoryIds = seller.sellerCategories.map((c) => c.categoryId);
    const categories = await Category.find({
      _id: { $in: categoryIds },
    }).lean();

      productsWithStock.sort((a, b) => {
      const aQty = a.inventory?.some((i) => i.quantity > 0) ? 1 : 0;
      const bQty = b.inventory?.some((i) => i.quantity > 0) ? 1 : 0;
      return bQty - aQty;
    });

    return res.status(200).json({
      sellerImage: seller.advertisementImages?.length
        ? seller.advertisementImages
        : ["/MultipleImage/1758278596489-MultipleImage.jpg"],
      seller: seller,
      categories: categories,
      products: productsWithStock,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching seller products:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getTopSeller = async (req, res) => {
  const { lat, lng } = req.query;
  try {
    const stores = await getStoresWithinRadius(lat, lng);
    const allowedStores = Array.isArray(stores?.matchedStores)
      ? stores.matchedStores
      : [];

    if (!allowedStores.length) {
      return { error: "No stores found within the radius" };
    }

    const storeDetailsWithRatings = [];

    for (const store of allowedStores) {
      // Fetch ratings for the store
      const ratings = await Rating.find({ storeId: store._id });

      // Calculate average rating
      const averageRating =
        ratings.reduce((sum, rating) => sum + rating.rating, 0) /
          ratings.length || 0;

      // Construct store details with average rating
      storeDetailsWithRatings.push({
        storeName: store.storeName,
        storeId: store._id,
        image: store.image,
        averageRating: averageRating.toFixed(1),
        isAssured: store.fivliaAssured || false,
      });
    }

    // Sort stores by averageRating in descending order (highest to lowest)
    storeDetailsWithRatings.sort((a, b) => b.averageRating - a.averageRating);

    return res.status(200).json({
      storeDetailsWithRatings,
    });
  } catch (error) {
    console.error("Error fetching seller:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};
