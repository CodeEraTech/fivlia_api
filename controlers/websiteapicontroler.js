const Products = require('../modals/Product');
const Filters = require('../modals/filter')
const { getStoresWithinRadius,getBannersWithinRadius,calculateDeliveryTime, reverseGeocode } = require('../config/google');
const {addFiveMinutes} = require('../controlers/DeliveryControler')
const User = require('../modals/User')
const Category = require('../modals/category');
const {CityData, ZoneData } = require('../modals/cityZone');
const Stock = require("../modals/StoreStock");
const {SettingAdmin} = require('../modals/setting')
const { getDistance } = require('../config/Ola'); // Add Ola import

exports.forwebbestselling = async (req, res) => {
  try {
 
    const { lat, lng } = req.query;

    const userLat = lat;
    const userLng = lng

    const [activeCities, zoneDocs, stores] = await Promise.all([
      CityData.find({ status: true }, 'city').lean(),
      ZoneData.find({}, 'zones').lean(),
      getStoresWithinRadius(userLat, userLng),
    ]);



    const activeCitySet = new Set(activeCities.map(c => c.city?.toLowerCase()));
    const activeZoneIds = new Set();

    for (const doc of zoneDocs) {
      for (const zone of doc.zones || []) {
        if (zone.status && zone._id) {
          activeZoneIds.add(zone._id.toString());
        }
      }
    }
console.log('stores',stores)
    const allowedStores = Array.isArray(stores?.matchedStores) ? stores.matchedStores : [];

    if (!allowedStores.length) {
      return res.status(200).json({
        message: "No best-selling products found for your location.",
        best: []
      });
    }

    const allCategoryIds = new Set();
    const categoryIds = allowedStores.flatMap(store =>
      Array.isArray(store.Category) ? store.Category : [store.Category]
    );

    const uniqueCatIds = [...new Set(categoryIds.filter(Boolean).map(id => id.toString()))];

    const categories = await Category.find({ _id: { $in: uniqueCatIds } }).lean();
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
    const allowedStoreIds = allowedStores.map(s => s._id.toString());

    const stockDocs = await Stock.find({ storeId: { $in: allowedStoreIds } }).lean();
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
        { "subSubCategory._id": { $in: categoryArray } }
      ]
    }).sort({ purchases: -1 }).limit(10).lean();

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
      count: best.length
    });

  } catch (error) {
    console.error("❌ bestSelling error:", error);
    return res.status(500).json({
      message: "An error occurred!",
      error: error.message
    });
  }
};

// Website: Get Product (no token, uses lat/lng from query)
exports.forwebgetProduct = async (req, res) => {
  try {
    const { id, lat, lng } = req.query;
    const userLat = lat;
    const userLng = lng;

    const [activeCities, zoneDocs, stores] = await Promise.all([
      CityData.find({ status: true }, 'city').lean(),
      ZoneData.find({ status: true }, 'zones').lean(),
      getStoresWithinRadius(userLat, userLng)
    ]);

    const activeCitySet = new Set(activeCities.map(c => c.city?.toLowerCase()));
    const activeZoneIdSet = new Set();
    zoneDocs.forEach(doc => {
      doc.zones?.forEach(zone => {
        if (zone.status) activeZoneIdSet.add(zone._id.toString());
      });
    });

    const allowedStores = Array.isArray(stores?.matchedStores) ? stores.matchedStores : [];
    if (!allowedStores.length) {
      return res.status(200).json({
        message: "No matching products found for your location.",
        products: [],
        filter: [],
        count: 0
      });
    }
    const allowedStoreIds = allowedStores.map(s => s._id);
    const categoryIdSet = new Set();
    const storeCategoryIds = allowedStores.flatMap(store => Array.isArray(store.Category) ? store.Category : [store.Category]).filter(Boolean);
    const categories = await Category.find({ _id: { $in: storeCategoryIds } }).lean();
    categories.forEach(category => {
      categoryIdSet.add(category._id.toString());
      category.subcat?.forEach(sub => {
        if (sub?._id) categoryIdSet.add(sub._id.toString());
        sub.subsubcat?.forEach(subsub => {
          if (subsub?._id) categoryIdSet.add(subsub._id.toString());
        });
      });
    });
    const categoryArray = Array.from(categoryIdSet);
    let productQuery;
    if (id) {
      if (!categoryIdSet.has(id)) {
        return res.status(200).json({
          message: "No matching products found for your location.",
          products: [],
          filter: [],
          count: 0
        });
      }
      productQuery = {
        $or: [
          { "category._id": id },
          { "subCategory._id": id },
          { "subSubCategory._id": id }
        ]
      };
    } else {
      productQuery = {
        $or: [
          { "category._id": { $in: categoryArray } },
          { "subCategory._id": { $in: categoryArray } },
          { "subSubCategory._id": { $in: categoryArray } }
        ]
      };
    }
    const [stockDocs, products] = await Promise.all([
      Stock.find({ storeId: { $in: allowedStoreIds } }).lean(),
      Products.find(productQuery).lean()
    ]);
    const stockMap = {};
    const stockDetailMap = {};
    stockDocs.forEach(doc => {
      (doc.stock || []).forEach(entry => {
        const key = `${entry.productId}_${entry.variantId}`;
        stockMap[key] = entry.quantity;
        stockDetailMap[key] = entry;
      });
    });
    products.forEach(product => {
      product.inventory = [];
      if (Array.isArray(product.variants)) {
        product.variants.forEach(variant => {
          const key = `${product._id}_${variant._id}`;
          const quantity = stockMap[key] || 0;
          const stockEntry = stockDetailMap[key];
          if (stockEntry?.price != null) variant.sell_price = stockEntry.price;
          if (stockEntry?.mrp != null) variant.mrp = stockEntry.mrp;
          product.inventory.push({ variantId: variant._id, quantity });
        });
      }
    });
    let filter = [];
    if (id) {
      const matchedCategory = await Category.findById(id).lean();
      if (matchedCategory?.filter?.length) {
        const filterIds = matchedCategory.filter.map(f => f._id);
        filter = await Filters.find({ _id: { $in: filterIds } }).lean();
      }
    }
    return res.status(200).json({
      message: "Products fetched successfully.",
      filter,
      products,
      count: products.length
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
      CityData.find({ status: true }, 'city').lean(),
      ZoneData.find({}, 'zones').lean(),
      getStoresWithinRadius(userLat, userLng)
    ]);
    const activeCitySet = new Set(activeCities.map(c => c.city.toLowerCase()));
    const activeZoneIds = new Set();
    for (const doc of zoneDocs) {
      (doc.zones || []).forEach(zone => {
        if (zone.status && zone._id) {
          activeZoneIds.add(zone._id.toString());
        }
      });
    }
    const allowedStores = Array.isArray(stores?.matchedStores) ? stores.matchedStores : [];
    const allowedStoreIds = allowedStores.map(store => store._id.toString());
    const categoryIds = new Set();
    const storeCategoryIds = allowedStores.flatMap(store =>
      Array.isArray(store.Category)
        ? store.Category.map(id => id?.toString())
        : store.Category ? [store.Category.toString()] : []
    );
    const uniqueCategoryIds = [...new Set(storeCategoryIds)];
    if (uniqueCategoryIds.length > 0) {
      const categories = await Category.find({ _id: { $in: uniqueCategoryIds } }).lean();
      for (const cat of categories) {
        categoryIds.add(cat._id.toString());
        (cat.subcat || []).forEach(sub => {
          if (sub?._id) categoryIds.add(sub._id.toString());
          (sub.subsubcat || []).forEach(subsub => {
            if (subsub?._id) categoryIds.add(subsub._id.toString());
          });
        });
      }
    }
    const categoryArray = [...categoryIds];
    const stockDocs = await Stock.find({ storeId: { $in: allowedStoreIds } }).lean();
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
        { subSubCategoryId: { $in: categoryArray } }
      ]
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
      message: 'It is feature product.',
      products,
      count: products.length
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "An error occurred!", error: error.message });
  }
};

// Website: Search Product (no token, uses lat/lng from query)
exports.forwebsearchProduct = async (req, res) => {
  try {
    const { name, lat, lng } = req.query;
    const userLat = lat;
    const userLng = lng;
    const [stores] = await Promise.all([
      getStoresWithinRadius(userLat, userLng)
    ]);
    const allowedStores = Array.isArray(stores?.matchedStores) ? stores.matchedStores : [];
    const allowedStoreIds = allowedStores.map(s => s._id.toString());
    const searchFilter = {};
    if (name) {
      searchFilter.productName = { $regex: name, $options: 'i' };
    }
    const categoryIds = new Set();
    const storeCategoryIds = allowedStores.flatMap(store =>
      Array.isArray(store.Category)
        ? store.Category.map(id => id?.toString())
        : store.Category ? [store.Category.toString()] : []
    );
    const uniqueCategoryIds = [...new Set(storeCategoryIds)];
    if (uniqueCategoryIds.length > 0) {
      const categories = await Category.find({ _id: { $in: uniqueCategoryIds } }).lean();
      for (const cat of categories) {
        categoryIds.add(cat._id.toString());
        (cat.subcat || []).forEach(sub => {
          if (sub?._id) categoryIds.add(sub._id.toString());
          (sub.subsubcat || []).forEach(subsub => {
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
        { subSubCategoryId: { $in: categoryArray } }
      ]
    }).lean();
    const stockDocs = await Stock.find({ storeId: { $in: allowedStoreIds } }).lean();
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
      count: products.length
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "An error occurred!", error: error.message });
  }
};

// Website: Get Related Products (no token, uses lat/lng from query)
exports.forwebgetRelatedProducts = async (req, res) => {
  try {
    const { productId, lat, lng } = req.query;
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }
    // Fetch base data
    const [product, allProducts] = await Promise.all([
      Products.findById(productId).lean(),
      Products.find({ _id: { $ne: productId } }).lean()
    ]);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    // 🔍 Score related products by relevance
    const scoredProducts = allProducts.map(p => {
      let score = 0;
      // ✅ Category Match (compare by _id inside array of objects)
      const productCatIds = (product.category || []).map(c => String(c._id));
      const pCatIds = (p.category || []).map(c => String(c._id));
      if (pCatIds.some(catId => productCatIds.includes(catId))) {
        score += 1;
      }
      // ✅ Brand Match
      if (
        product.brand_Name?._id &&
        p.brand_Name?._id &&
        String(product.brand_Name._id) === String(p.brand_Name._id)
      ) {
        score += 1;
      }
      // ✅ Type Match (assuming it's array of strings)
      const matchedTypes = (p.type || []).filter(t => (product.type || []).includes(t));
      if (matchedTypes.length > 0) {
        score += 2;
      }
      return { ...p, relevanceScore: score };
    });
    // 📊 Sort and limit to top 10
    const relatedProducts = scoredProducts
      .filter(p => p.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);
    // Add inventory info (from nearby stores)
    const [stores, stockDocs] = await Promise.all([
      getStoresWithinRadius(lat, lng),
      Stock.find().lean()
    ]);
    const allowedStores = Array.isArray(stores?.matchedStores) ? stores.matchedStores : [];
    const allowedStoreIds = allowedStores.map(s => s._id.toString());
    const stockMap = {};
    for (const doc of stockDocs) {
      if (!allowedStoreIds.includes(doc.storeId.toString())) continue;
      for (const item of doc.stock || []) {
        const key = `${item.productId}_${item.variantId}`;
        stockMap[key] = item.quantity;
      }
    }
    for (const product of relatedProducts) {
      product.inventory = [];
      for (const variant of product.variants || []) {
        const key = `${product._id}_${variant._id}`;
        const quantity = stockMap[key] || 0;
        product.inventory.push({ variantId: variant._id, quantity });
      }
    }
    return res.status(200).json({
      message: "Related Product",
      relatedProducts
    });
  } catch (err) {
    console.error("❌ Error fetching related products:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Website: Get Banner (no token, uses lat/lng from query)
exports.forwebgetBanner = async (req, res) => {
  try {
    const { type, lat, lng } = req.query;
    const userLat = lat;
    const userLng = lng;

    // 🟢 Get active city names
    const activeCities = await CityData.find({ status: true }, 'city').lean();
    const activeCityNames = activeCities.map(c => c.city?.toLowerCase());

    // 🟢 Get active zone IDs
    const zoneDocs = await ZoneData.find({ status: true }, 'zones').lean();
    const activeZoneIds = [];
    zoneDocs.forEach(doc => {
      (doc.zones || []).forEach(zone => {
        if (zone.status && zone._id) {
          activeZoneIds.push(zone._id.toString());
        }
      });
    });

    // 🔎 Apply base filters
    const filters = { status: true };
    if (type) {
      const validTypes = ['offer', 'normal'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: 'Invalid banner type. Must be "offer" or "normal".' });
      }
      filters.type = type;
    }

    const Banner = require('../modals/banner');
    const { getBannersWithinRadius } = require('../config/google');
    const allBanners = await Banner.find(filters).lean();
    const matchedBanners = await getBannersWithinRadius(userLat, userLng, allBanners);

    if (!matchedBanners.length) {
      return res.status(200).json({
        message: "No banners found for your location.",
        count: 0,
        data: []
      });
    }

    return res.status(200).json({
      message: "Banners fetched successfully.",
      count: matchedBanners.length,
      data: matchedBanners
    });
  } catch (error) {
    console.error('❌ Error fetching banners:', error);
    return res.status(500).json({
      message: 'An error occurred while fetching banners.',
      error: error.message,
      count: 0,
      data: []
    });
  }
};

exports.getDeliveryEstimateForWebsite = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    const currentLat =  lat;
    const currentLong = lng;

    if (!currentLat || !currentLong) {
      return res.status(200).json({ status: false, message: "User location not set" });
    }

    const { zoneAvailable, matchedStores } = await getStoresWithinRadius(currentLat, currentLong);

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
            if (result) result.source = 'google';
          } catch (err) {
            console.log('Google API failed:', err.message);
            return null; // No fallback, just return null
          }
        } else if (olaApi.status && olaApi.api_key) {
          try {
            
            const olaResult = await getDistance(
              { lat: parseFloat(store.Latitude), lng: parseFloat(store.Longitude) },
              { lat: currentLat, lng: currentLong },
              olaApi.api_key
            );

            if (olaResult.status === 'OK') {
              result = {
                source: 'ola',
                distanceText: olaResult.distance.text,
                durationText: olaResult.duration.text,
                trafficDurationText: olaResult.duration.text,
                distanceValue: olaResult.distance.value,
                durationValue: olaResult.duration.value,
                trafficDurationValue: olaResult.duration.value
              };
            }
          } catch (err) {
            console.error('Ola API failed:', err.message);
            return null; // No fallback, just return null
          }
        } else if (appleApi.status && appleApi.api_key) {
          // Use Apple API only (when you implement it)
          console.log('Apple API not implemented yet');
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
    res.status(500).json({ status: false, message: "Server error", error: err.message });
  }
};
