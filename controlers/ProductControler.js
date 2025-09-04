const mongoose = require('mongoose');
const admin = require("../firebase/firebase");
const Products = require('../modals/Product');
const Attribute = require('../modals/attribute');
const Store = require('../modals/store')
const Filters = require('../modals/filter')
const { getStoresWithinRadius } = require('../config/google');
const User = require('../modals/User')
const {Cart} = require('../modals/cart')
const Category = require('../modals/category');
const Unit = require('../modals/unit');
const {CityData, ZoneData } = require('../modals/cityZone');
const brand = require('../modals/brand')
const Notification = require('../modals/Notification');
const cloudinary = require('../config/aws');
const moment = require('moment-timezone');
const Stock = require("../modals/StoreStock");
const Rating = require("../modals/rating")
const path = require('path')

exports.addAtribute=async (req,res) => {
    try {
    const {Attribute_name,varient}=req.body
    const newAttribute = await Attribute.create({Attribute_name,varient})
     return res.status(200).json({message:"Attribute Created",newAttribute})   
    } catch (error) {
      console.error(error);
      return res.status(500).json({message:"An error occured"})   
    }
}
exports.editAttributes = async (req, res) => {
  try {
    const { id } = req.params;
    const { Attribute_name, varient } = req.body;

    const attribute = await Attribute.findById(id);
    if (!attribute) {
      return res.status(404).json({ message: "Attribute not found" });
    }

    if (Attribute_name) {
      attribute.Attribute_name = Attribute_name;
    }

    if (Array.isArray(varient)) {
      varient.forEach(newVar => {
        const exists = attribute.varient.some(v => v.name === newVar.name);
        if (!exists) {
          attribute.varient.push({ _id: new mongoose.Types.ObjectId(), ...newVar });
        }
      });
    }

    const updated = await attribute.save();
    return res.status(200).json({ message: "Attributes Updated", updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred" });
  }
};

exports.getAttributes=async (req,res) => {
  try {
  const Attributes=await Attribute.find()
  res.json(Attributes)
} catch (error) {
  console.error(error);
  return res.status(500).json({message:"An error occured"})   
  }
}

exports.getAttributesId=async (req,res) => {
  try {
    const {id}=req.params
  const Attributes=await Category.findById(id,'attribute')
  res.json(Attributes)
} catch (error) {
  console.error(error);
  return res.status(500).json({message:"An error occured"})   
  }
}

exports.deleteAttribute=async (req,res) => {
  try {
  const {id} = req.params
  const dltAttribute = await Attribute.findByIdAndDelete(id)
  return res.status(200).json({message:"Attribute Deleted"})
  } catch (error) {
      console.error(error);
  return res.status(500).json({message:"An error occured"})   
  }
}

exports.addProduct = async (req, res) => {
  try {
    const {
      productName, description, category, subCategory, subSubCategory, rating,
      ribbon, brand_Name, sold_by, type, location, online_visible,
      inventory, tax, feature_product, fulfilled_by, variants, minQuantity,
      maxQuantity, ratings, unit, mrp, sell_price, filter, returnProduct,isVeg
    } = req.body;

  const MultipleImage = req.files?.MultipleImage?.map(file => `/${file.key}`) || [];

const imageKey = req.files?.image?.[0]?.key || "";
const image = imageKey ? `/${imageKey}` : "";

    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
      } catch (e) {
        parsedVariants = [];
      }
    }

    let finalFilterArray = [];
    if (req.body.filter) {
      let parsedFilter;
      try {
        parsedFilter = typeof req.body.filter === 'string'
          ? JSON.parse(req.body.filter)
          : req.body.filter;
      } catch {
        parsedFilter = [];
      }

      for (let item of parsedFilter) {
        const filterDoc = await Filters.findById(item._id);
        if (!filterDoc) continue;

        let selectedArray = [];
        const selectedIds = Array.isArray(item.selected) ? item.selected : [item.selected];

        for (const selId of selectedIds) {
          const selectedObj = filterDoc.Filter.find(f => f._id.toString() === selId);
          if (selectedObj) {
            selectedArray.push({ _id: selectedObj._id, name: selectedObj.name });
          }
        }

        if (selectedArray.length > 0) {
          finalFilterArray.push({
            _id: filterDoc._id,
            Filter_name: filterDoc.Filter_name,
            selected: selectedArray
          });
        }
      }
    }

    let parsedLocation = [];
    try {
      parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
    } catch {}

    const productLocation = [];
    for (let loc of parsedLocation) {
      try {
        if (!loc.city || !Array.isArray(loc.city)) continue;
        for (let cityObj of loc.city) {
          const cityName = cityObj.name;
          if (!cityName) continue;

          const cityData = await ZoneData.findOne({ city: cityName });
          if (!cityData) continue;

          let matchedZones = [];
          if (loc.zone && Array.isArray(loc.zone)) {
            for (let zoneObj of loc.zone) {
              const zoneName = zoneObj.name;
              const zoneMatch = cityData.zones.find(zone => zone.address === zoneName);
              if (zoneMatch) {
                matchedZones.push({ _id: zoneMatch._id, name: zoneMatch.address });
              }
            }
          }

          productLocation.push({
            city: [{ _id: cityData._id, name: cityData.city }],
            zone: matchedZones
          });
        }
      } catch {}
    }

    const brandObj = brand_Name ? await brand.findOne({ brandName: brand_Name }) : null;

    let categories = [];
    try {
      categories = typeof category === 'string' ? JSON.parse(category) : category;
    } catch {
      categories = [category];
    }

    const categoryIds = categories.filter(c => /^[0-9a-fA-F]{24}$/.test(c));
    const categoryNames = categories.filter(c => !/^[0-9a-fA-F]{24}$/.test(c));

    const foundCategories = await Category.find({
      $or: [
        { _id: { $in: categoryIds } },
        { name: { $in: categoryNames } }
      ]
    }).lean();

    const productCategories = foundCategories.map(cat => ({ _id: cat._id, name: cat.name }));

    const foundSubCategory = subCategory && foundCategories[0]?.subcat?.find(sub =>
      sub.name === subCategory || sub._id.toString() === subCategory
    );

    const foundSubSubCategory = subSubCategory && foundSubCategory?.subsubcat?.find(subsub =>
      subsub.name === subSubCategory || subsub._id.toString() === subSubCategory
    );

    let returnProductData = null;
if (returnProduct) {
  try {
    const parsedReturn = typeof returnProduct === 'string' ? JSON.parse(returnProduct) : returnProduct;
    returnProductData = { title: parsedReturn.title?.trim() || "" };

    // ✅ Get image key from S3-uploaded file
const uploadedFile = req.files?.file?.[0];
if (uploadedFile && uploadedFile.key) {
  returnProductData.image = `/${uploadedFile.key}`;  // prepend '/'
}
  } catch (err) {
    console.error("ReturnProduct parse/upload error:", err);
  }
}


    const parsedVariantsArray = parsedVariants.map(v => ({
      ...v,
      _id: new mongoose.Types.ObjectId()
    }));

    const variantImageMap = {};
    if (req.files) {
      Object.keys(req.files).forEach(key => {
        if (Array.isArray(req.files[key]) && req.files[key][0]?.path) {
          variantImageMap[key] = req.files[key][0].path;
        }
      });
    }

    const finalInventoryArray = parsedVariantsArray.map(variant => ({
      _id: new mongoose.Types.ObjectId(),
      variantId: variant._id,
      quantity: 0
    }));

 const finalVariants = [];
for (let variant of parsedVariantsArray) {
  const discount = variant.mrp && variant.sell_price
    ? Math.round(((variant.mrp - variant.sell_price) / variant.mrp) * 100)
    : 0;

  const imageKey = req.files?.[variant.imageKey]?.[0]?.key;
  const image = imageKey ? `/${imageKey}` : "";

  finalVariants.push({
    ...variant,
    discountValue: discount,
    ...(image && { image })
  });
}

const lastProduct = await Products.findOne({ sku: { $regex: /^FIV\d+$/ } })
  .sort({ createdAt: -1 })
  .lean();

let nextNumber = 1;
if (lastProduct?.sku) {
  const lastNumber = parseInt(lastProduct.sku.replace("FIV", ""), 10);
  nextNumber = lastNumber + 1;
}

const sku = `FIV${String(nextNumber).padStart(3, "0")}`;

    await Products.create({
      ...(productName && { productName }),
      ...(description && { description }),
      ...(rating && { rating }),
      ...(image && { productThumbnailUrl: image }),
      ...(MultipleImage.length && { productImageUrl: MultipleImage }),
      ...(productCategories.length && { category: productCategories }),
      ...(foundSubCategory && { subCategory: { _id: foundSubCategory._id, name: foundSubCategory.name } }),
      ...(foundSubSubCategory && { subSubCategory: { _id: foundSubSubCategory._id, name: foundSubSubCategory.name } }),
      ...(sku && { sku }),
      ...(returnProduct && { returnProduct: returnProductData }),
      ...(ribbon && { ribbon }),
      ...(unit && typeof unit === 'string' && { unit: { name: unit } }),
      ...(brandObj && { brand_Name: { _id: brandObj._id, name: brandObj.brandName } }),
      ...(sold_by && { sold_by }),
      ...(type && { type }),
      ...(productLocation.length && { location: productLocation }),
      ...(online_visible !== undefined && { online_visible }),
      ...(finalInventoryArray.length && { inventory: finalInventoryArray }),
      ...(tax && { tax }),
      ...(feature_product && { feature_product }),
      ...(fulfilled_by && { fulfilled_by }),
      ...(minQuantity && { minQuantity }),
      ...(maxQuantity && { maxQuantity }),
      ...(finalFilterArray.length && { filter: finalFilterArray }),
      ...(finalVariants.length && { variants: finalVariants }),
      ...(ratings && { ratings }),
      ...(mrp && { mrp }),
      ...(isVeg && { isVeg }),
      ...(sell_price && { sell_price })
    });

    return res.status(200).json({ message: "Product Added" });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "An error occurred!", error: error.message });
  }
};


exports.getProduct = async (req, res) => {
  try {
    const { id ,page = 1, limit = 100} = req.query;
    const skip = (page - 1) * limit;

    const userId = req.user._id;

    const user = await User.findById(userId).lean();
    if (!user?.location?.latitude || !user?.location?.longitude) {
      return res.status(400).json({ message: "User location not found" });
    }

    const userLat = user.location.latitude;
    const userLng = user.location.longitude;

    const [activeCities, zoneDocs, stores] = await Promise.all([
      CityData.find({ status: true }, 'city').lean(),
      ZoneData.find({status: true}, 'zones').lean(),
      getStoresWithinRadius(userLat, userLng)
    ]);

    const activeCitySet = new Set(activeCities.map(c => c.city.toLowerCase()));
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

    const storeCategoryIds = allowedStores.flatMap(store => 
      Array.isArray(store.Category) ? store.Category : [store.Category]
    ).filter(Boolean);

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

    const [stockDocs, products, cartDocs, totalProducts] = await Promise.all([
      Stock.find({ storeId: { $in: allowedStoreIds } }).lean(),
      Products.find(productQuery).skip(skip).limit(Number(limit)).lean(),
      Cart.find({ userId }).lean(),
      Products.countDocuments(productQuery)
    ]);

 const stockMap = {};
const stockDetailMap = {};

stockDocs.forEach(doc => {
  (doc.stock || []).forEach(entry => {
    const key = `${entry.productId}_${entry.variantId}`;
    stockMap[key] = entry.quantity;
    stockDetailMap[key] = {
      ...entry,
      storeId: doc.storeId   // ✅ attach parent storeId here
    };
  });
});


    const cartMap = {};
    cartDocs.forEach(item => {
      const key = `${item.productId}_${item.varientId}`;
      cartMap[key] = item.quantity;
    });

products.forEach(product => {
  product.inventory = [];
  product.inCart = { status: false, qty: 0, variantIds: [] };
  product.soldBy = {};
  let hasStock = false; 
  product.variants?.forEach(variant => {
    const key = `${product._id}_${variant._id}`;
    const quantity = stockMap[key] || 0;
    const cartQty = cartMap[key] || 0;

    // ✅ Override price and mrp from stockMapDetail if available
const stockEntry = stockDetailMap[key]; 

    if (stockEntry?.price != null) {
      variant.sell_price = stockEntry.price;
    }

    if (stockEntry?.mrp != null) {
      variant.mrp = stockEntry.mrp;
    }
    // 🧾 Add quantity to inventory
    product.inventory.push({ variantId: variant._id, quantity });

    if (quantity > 0) {
      hasStock = true; // ✅ mark product as in stock
    }
    // 🛒 Cart info
    if (cartQty > 0) {
      product.inCart.status = true;
      product.inCart.qty += cartQty;
      product.inCart.variantIds.push(variant._id);
    }
 if (hasStock && stockEntry?.storeId) {
      const store = allowedStores.find(
        s => s._id.toString() === stockEntry.storeId.toString()
      );
      if (store) {
        product.soldBy = store.soldBy;
      }
    }
  });

  // ✅ If product had no stock at all → keep empty {}
  if (!hasStock) {
    product.soldBy = {};
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
      count: products.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalProducts / limit)
    });

  } catch (error) {
    console.error("❌ getProduct error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


exports.bestSelling = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("🔐 Authenticated User ID:", userId);

    const user = await User.findById(userId).lean();
    if (!user || !user.location?.latitude || !user.location?.longitude) {
      return res.status(400).json({ message: "User location not found" });
    }

    const userLat = user.location.latitude;
    const userLng = user.location.longitude;

    const [activeCities, zoneDocs, stores, cartDocs] = await Promise.all([
      CityData.find({ status: true }, 'city').lean(),
      ZoneData.find({}, 'zones').lean(),
      getStoresWithinRadius(userLat, userLng),
      Cart.find({ userId }).lean(),
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
    stockDetailMap[key] = {
      quantity: item.quantity,
      price: item.price,
      mrp: item.mrp,
      storeId: stockDoc.storeId   // ✅ include storeId here
    }; // 👈 Store full stock item
  }
}

    const best = await Products.find({
      $or: [
        { "category._id": { $in: categoryArray } },
        { "subCategory._id": { $in: categoryArray } },
        { "subSubCategory._id": { $in: categoryArray } }
      ]
    }).sort({ purchases: -1 }).limit(10).lean();

    // ✅ Build cart map from user cart
    const cartMap = {};
    for (const item of cartDocs) {
      const key = `${item.productId}_${item.varientId}`;
      cartMap[key] = item.quantity;
    }
    // ✅ Map inventory and cart into products
  for (const product of best) {
  product.inventory = [];
  product.inCart = { status: false, qty: 0, variantIds: [] };

  product.soldBy = {};
  let hasStock = false; 

  if (Array.isArray(product.variants)) {
    for (const variant of product.variants) {
   const key = `${product._id}_${variant._id}`;
   const stockEntry = stockDetailMap[key];
const quantity = stockEntry?.quantity || 0;
const cartQty = cartMap[key] || 0;

if (stockEntry?.price != null) {
  variant.sell_price = stockEntry.price;
}
if (stockEntry?.mrp != null) {
  variant.mrp = stockEntry.mrp;
}

product.inventory.push({ variantId: variant._id, quantity });

 if (quantity > 0) {
      hasStock = true; // ✅ mark product as in stock
    }

      if (cartQty > 0) {
        product.inCart.status = true;
        product.inCart.qty += cartQty;
        product.inCart.variantIds.push(variant._id); // 👈 store the variantId in cart
      }
          if (quantity > 0 && stockEntry?.storeId) {
        const store = allowedStores.find(
          s => s._id.toString() === stockEntry.storeId.toString()
        );
        if (store) {
          product.soldBy = store.soldBy;
        }
      }
    }
  }

  // ✅ If no stock at all → force empty {}
  if (!hasStock) {
    product.soldBy = {};
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

exports.searchProduct = async (req, res) => {
  try {
    const { name } = req.query;
    const userId = req.user._id || req.user;

    // 1. Get user location
    const user = await User.findById(userId).lean();
    if (!user || !user.location?.latitude || !user.location?.longitude) {
      return res.status(400).json({ message: "User location not found" });
    }

    const userLat = user.location.latitude;
    const userLng = user.location.longitude;

    // 2. Get nearby stores and user cart
    const [stores, cartDocs] = await Promise.all([
      getStoresWithinRadius(userLat, userLng),
      Cart.find({ userId }).lean()
    ]);

    const allowedStores = Array.isArray(stores?.matchedStores) ? stores.matchedStores : [];
    const allowedStoreIds = allowedStores.map(s => s._id.toString());

    // 3. Build search filter
    const searchFilter = {};
    if (name) {
      searchFilter.productName = { $regex: name, $options: 'i' };
    }

    // 4. Collect allowed category/subcategory/subsub from stores
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

    // 5. Get filtered products
    const products = await Products.find({
      ...searchFilter,
      $or: [
        { "category._id": { $in: categoryArray } },
        { subCategoryId: { $in: categoryArray } },
        { subSubCategoryId: { $in: categoryArray } }
      ]
    }).lean();

    // 6. Get stock from nearby stores
    const stockDocs = await Stock.find({ storeId: { $in: allowedStoreIds } }).lean();

    const stockMap = {};
    const stockDetailMap = {};
    for (const doc of stockDocs) {
      for (const item of doc.stock || []) {
        const key = `${item.productId}_${item.variantId}`;
        stockMap[key] = item.quantity;
        stockDetailMap[key] = {
      quantity: item.quantity,
      price: item.price,
      mrp: item.mrp,
      storeId: doc.storeId,   // ✅ attach storeId here
    };
      }
    }

    // 7. Create cart map
    const cartMap = {};
    for (const item of cartDocs) {
      const key = `${item.productId}_${item.varientId}`;
      cartMap[key] = item.quantity;
    }

    // 8. Append inventory, price, mrp, cart data
    for (const product of products) {
      product.inventory = [];
      product.inCart = { status: false, qty: 0, variantIds: [] };
      product.soldBy = {};
      let hasStock = false; 
      for (const variant of product.variants || []) {
        const key = `${product._id}_${variant._id}`;
        const quantity = stockMap[key] || 0;
        const cartQty = cartMap[key] || 0;

        // Override price and mrp from stock entry
        const stockEntry = stockDetailMap[key];
        if (stockEntry?.price != null) {
          variant.sell_price = stockEntry.price;
        }
        if (stockEntry?.mrp != null) {
          variant.mrp = stockEntry.mrp;
        }

        product.inventory.push({ variantId: variant._id, quantity });

        if (quantity > 0) {
        hasStock = true; // ✅ mark product as in stock
        }

        if (cartQty > 0) {
          product.inCart.status = true;
          product.inCart.qty += cartQty;
          product.inCart.variantIds.push(variant._id);
        }
 if (hasStock && stockEntry?.storeId) {
      const store = allowedStores.find(
        s => s._id.toString() === stockEntry.storeId.toString()
      );
      if (store) {
        product.soldBy = store.soldBy;
      }
    }
  };

  // ✅ If product had no stock at all → keep empty {}
  if (!hasStock) {
    product.soldBy = {};
  }
};

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


exports.getFeatureProduct = async (req, res) => {
  try {
    const userId = req.user;
    const {page = 1, limit = 80} = req.query;
    const skip = (page - 1) * limit;
    const user = await User.findById(userId).lean();
    if (!user || !user.location?.latitude || !user.location?.longitude) {
      return res.status(400).json({ message: "User location not found" });
    }

    const userLat = user.location.latitude;
    const userLng = user.location.longitude;

    const [activeCities, zoneDocs, stores, cartDocs] = await Promise.all([
      CityData.find({ status: true }, 'city').lean(),
      ZoneData.find({}, 'zones').lean(),
      getStoresWithinRadius(userLat, userLng),
      Cart.find({ userId }).lean()
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

    // 🌍 Filter stores by location and zone
const allowedStores = Array.isArray(stores?.matchedStores) ? stores.matchedStores : [];
console.log(allowedStores)
    const allowedStoreIds = allowedStores.map(store => store._id.toString());

    // 📦 Build set of all category/sub/subsub IDs
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

    // 🧾 Build stock map
    const stockDocs = await Stock.find({ storeId: { $in: allowedStoreIds } }).lean();
    const stockMap = {};
    for (const doc of stockDocs) {
      for (const item of doc.stock || []) {
        const key = `${item.productId}_${item.variantId}`;
        stockMap[key] = {quantity: item.quantity,
      price: item.price,
      mrp: item.mrp,
      storeId: doc.storeId};
      }
    }

    // 🛒 Cart map
    const cartMap = {};
    for (const item of cartDocs) {
      const key = `${item.productId}_${item.varientId}`;
      cartMap[key] = item.quantity;
    }

    // 🛍 Fetch products with matching categories & feature flag
    const query = {
      feature_product: true,
      $or: [
        { "category._id": { $in: categoryArray } },
        { subCategoryId: { $in: categoryArray } },
        { subSubCategoryId: { $in: categoryArray } }
      ]
    }
    const [products, count] = await Promise.all([
      Products.find(query).skip(skip).limit(Number(limit)).lean(),
      Products.countDocuments(query)
    ]);

 for (const product of products) {
  product.inventory = [];
  product.inCart = { status: false, qty: 0, variantIds: [] };

  product.soldBy = {};
  let hasStock = false; 

  if (Array.isArray(product.variants)) {
    for (const variant of product.variants) {
      const key = `${product._id}_${variant._id}`;
      const stockEntry = stockMap[key];
      const quantity = stockEntry?.quantity || 0;
      const cartQty = cartMap[key] || 0;

      // ✅ Override variant's price and mrp if available
      if (stockEntry?.price != null) {
        variant.sell_price = stockEntry.price;
      }

      if (stockEntry?.mrp != null) {
        variant.mrp = stockEntry.mrp;
      }

      // 📦 Add to inventory
      product.inventory.push({ variantId: variant._id, quantity });

      if (quantity > 0) {
      hasStock = true; // ✅ mark product as in stock
      }
      // 🛒 Add to inCart
      if (cartQty > 0) {
        product.inCart.status = true;
        product.inCart.qty += cartQty;
        product.inCart.variantIds.push(variant._id);
      }
     if (hasStock && stockEntry?.storeId) {
      const store = allowedStores.find(
        s => s._id.toString() === stockEntry.storeId.toString()
      );
      if (store) {
        product.soldBy = store.soldBy;
      }
    }
  };

  // ✅ If product had no stock at all → keep empty {}
  if (!hasStock) {
    product.soldBy = {};
  }
};
}

    return res.status(200).json({
      message: 'It is feature product.',
      products,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      limit
    });

  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "An error occurred!", error: error.message });
  }
};


exports.unit=async (req,res) => {
  try {
  const {unitname}=req.body
  const newUnit=await Unit.create({unitname})
  return res.status(200).json({ message: 'Unit Created Successfully', newUnit });
  } catch (error) {
     console.error(error);
     return res.status(500).json({ message: "An error occured!", error: error.message });
  }
}
exports.getUnit=async (req,res) => {
  try {
  const Units=await Unit.find()
    return res.status(200).json({Result:Units});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occured!", error: error.message });
  }
}

exports.getVarients = async (req, res) => {
  try {
    const { id } = req.params;

    const attribute = await Attribute.findById(id, 'varient');

    if (!attribute) {
      return res.status(404).json({ message: "Attribute not found" });
    }

    return res.status(200).json({ varient: attribute.varient });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred", error: error.message });
  }
};

exports.filter = async (req, res) => {
  try {
    const {
      id,
      color,
      price,
      discount,
      brand,
      weight,
      ratings,
      bestSeller,
      size,
      productName,
      material,
      gender
    } = req.body;

    const filters = {};

    if (id) {
      filters.$or = [
        { 'category._id': id },
        { 'subCategory._id': id },
        { 'subSubCategory._id': id }
      ];
    }

   if (brand) {
  if (mongoose.Types.ObjectId.isValid(brand)) {
    filters['brand_Name._id'] = new mongoose.Types.ObjectId(brand);
  } else {
    filters['brand_Name.name'] = { $regex: brand, $options: 'i' };
  }
}

    if (bestSeller !== undefined) {
      filters.bestSeller = bestSeller === true || bestSeller === 'true';
    }

    if (productName) {
      filters.productName = { $regex: productName, $options: 'i' };
    }

    if (material) {
      filters.material = { $regex: material, $options: 'i' };
    }

    if (gender) {
      filters.gender = { $regex: gender, $options: 'i' };
    }

    if (weight) {
      const [min, max] = weight.split('-').map(Number);
      filters.weight = {};
      if (!isNaN(min)) filters.weight.$gte = min;
      if (!isNaN(max)) filters.weight.$lte = max;
    }

    // Variant filters
    const variantMatch = {};

    if (color) {
      variantMatch.color = { $regex: color, $options: 'i' };
    }

    if (size) {
      variantMatch.Size = { $regex: size, $options: 'i' };
    }

    if (price) {
      const [min, max] = price.split('-').map(Number);
      variantMatch.sell_price = {};
      if (!isNaN(min)) variantMatch.sell_price.$gte = min;
      if (!isNaN(max)) variantMatch.sell_price.$lte = max;
    }

    if (discount) {
      variantMatch.discountValue = { $gte: Number(discount) };
    }

    if (ratings) {
      variantMatch.ratings = { $gte: Number(ratings) };
    }

    // Add variant filter only if any variant field is applied
    if (Object.keys(variantMatch).length) {
      filters.variants = { $elemMatch: variantMatch };
    }

    const products = await Products.find(filters);
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error while filtering products' });
  }
};

exports.bulkProductUpload = async (req, res) => {
  try {
    const products = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({ message: "Invalid format: Expected an array of products" });
    }

    const createdProducts = await Products.insertMany(products);
    res.status(201).json({ message: "Products uploaded successfully", count: createdProducts.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Bulk upload failed", error: err.message });
  }
};
exports.deleteProduct=async (req,res) => {
  try {
  const {id} = req.params
  const deleted = await Products.findByIdAndDelete(id)
  res.status(200).json({ message: "Product deleted successfully", deleted});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Product Deleted", error });
  }
}

exports.updateProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      productName, description, category, subCategory, subSubCategory,
      ribbon, rating, filter, brand_Name, sold_by, type, location, online_visible,
      tax, feature_product, fulfilled_by, minQuantity,
      maxQuantity, ratings, unit, mrp, sell_price, status, returnProduct
    } = req.body;

 const MultipleImage = req.files?.MultipleImage?.map(file => `/${file.key}`) || [];

const imageKey = req.files?.image?.[0]?.key || "";
const image = imageKey ? `/${imageKey}` : "";

    // Fetch the existing product to get its variants
    const existingProduct = await Products.findById(id).select('variants');
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    console.log("🧾 Existing product variants:", JSON.stringify(existingProduct.variants, null, 2));

    const variantImageMap = {};

    if (req.files) {
      for (const key of Object.keys(req.files)) {
        if (!/^var\d+$/i.test(key)) continue;

        const file = req.files[key]?.[0];
        if (!file?.path) {
          console.warn(`❗ No file path found for ${key}`);
          continue;
        }
console.log("⛳ Uploading variant key:", key, "| Path:", file.path);
        try {
          const uploaded = await cloudinary.uploader.upload(file.path, {
            folder: "products/variants",
          });

          if (uploaded?.secure_url) {
            variantImageMap[key] = uploaded.secure_url;
            console.log(`✅ Uploaded ${key}: ${uploaded.secure_url}`);
          } else {
            console.warn(`❗ Cloudinary didn't return secure_url for ${key}`);
          }
        } catch (err) {
          console.error(`❌ Error uploading ${key} to Cloudinary:`, err.message);
        }
      }
    }

    let finalFilterArray = [];
    if (req.body.filter) {
      parsedFilter = [];

      if (typeof req.body.filter === 'string') {
        try {
          const firstParsed = JSON.parse(req.body.filter);
          if (Array.isArray(firstParsed)) {
            for (const str of firstParsed) {
              try {
                const obj = JSON.parse(str);
                if (Array.isArray(obj)) {
                  parsedFilter.push(...obj);
                } else {
                  parsedFilter.push(obj);
                }
              } catch (innerErr) {
                console.warn("❗ Error parsing filter inner string:", innerErr.message);
              }
            }
          }
        } catch (outerErr) {
          console.warn("❗ Error parsing filter outer string:", outerErr.message);
        }
      } else if (Array.isArray(req.body.filter)) {
        parsedFilter = req.body.filter;
      }

      for (let item of parsedFilter) {
        if (!item._id) {
          console.warn("❗ Filter item missing _id:", item);
          continue;
        }
        const filterDoc = await Filters.findById(item._id);
        if (!filterDoc) {
          console.warn(`❗ Filter not found for _id: ${item._id}`);
          continue;
        }

        console.log(`🧾 Filter doc for _id ${item._id}:`, JSON.stringify(filterDoc.Filter, null, 2));

        let selectedArray = [];
        const selectedIds = Array.isArray(item.selected) ? item.selected : [item.selected];

        for (const selId of selectedIds) {
          if (!selId) {
            console.warn("❗ Invalid selected ID:", selId);
            continue;
          }
          const selectedObj = filterDoc.Filter.find(f => f._id.toString() === selId.toString());
          if (selectedObj) {
            selectedArray.push({
              _id: selectedObj._id,
              name: selectedObj.name
            });
          } else {
            console.warn(`❗ Selected filter ID ${selId} not found in filter ${filterDoc.Filter_name}`);
          }
        }

        if (selectedArray.length > 0) {
          finalFilterArray.push({
            _id: filterDoc._id,
            Filter_name: filterDoc.Filter_name,
            selected: selectedArray
          });
        }
      }
      console.log("🧾 Final filter array:", JSON.stringify(finalFilterArray, null, 2));
    }

    const productLocation = [];
    if (location) {
      let parsedLocation;
      try {
        parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
      } catch (err) {
        console.warn('Invalid location format:', location);
        parsedLocation = [];
      }

      const splitLocations = (locs) => {
        const result = [];

        for (const loc of locs) {
          if (!Array.isArray(loc.city)) continue;
          if (!Array.isArray(loc.zone) && !Array.isArray(loc.zones)) continue;

          const zonesArray = loc.zone || loc.zones || [];

          for (const cityObj of loc.city) {
            const cityName = cityObj.name || cityObj.city || null;
            if (!cityName) continue;

            const filteredZones = zonesArray.filter(zoneObj => {
              const zoneName = zoneObj.name || zoneObj.address || '';
              return zoneName.toLowerCase().includes(cityName.toLowerCase());
            });

            if (filteredZones.length === 0) continue;

            result.push({
              city: cityName,
              zones: filteredZones
            });
          }
        }
        return result;
      };

      const normalizedLocations = splitLocations(parsedLocation);

      for (const loc of normalizedLocations) {
        try {
          const cityData = await ZoneData.findOne({ city: loc.city });
          if (!cityData) {
            console.log(`No city data found for city: ${loc.city}`);
            continue;
          }

          const zoneAddresses = loc.zones
            .map(z => (z.name || z.address || '').trim())
            .filter(z => z.length > 0);

          const matchedZones = cityData.zones.filter(z =>
            zoneAddresses.some(addr => addr.toLowerCase() === z.address.trim().toLowerCase())
          );

          if (matchedZones.length === 0) {
            console.log(`No matched zones found for city: ${loc.city}`);
            continue;
          }

          productLocation.push({
            city: { _id: cityData._id, name: cityData.city },
            zone: matchedZones.map(z => ({ _id: z._id, name: z.address }))
          });

        } catch (err) {
          console.error("Error processing location:", err);
        }
      }
    }

    let brandObj = null;
    if (brand_Name) {
      if (typeof brand_Name === "string") {
        if (/^[0-9a-fA-F]{24}$/.test(brand_Name)) {
          brandObj = await brand.findById(brand_Name);
        } else {
          brandObj = await brand.findOne({ brandName: brand_Name });
        }
      } else if (typeof brand_Name === "object" && brand_Name._id) {
        brandObj = await brand.findById(brand_Name._id);
      }
    }

    let unitObj = null;
    if (unit) {
      if (typeof unit === 'string' && /^[0-9a-fA-F]{24}$/.test(unit)) {
        unitObj = await Unit.findById(unit);
      } else if (typeof unit === 'object' && unit._id) {
        unitObj = await Unit.findById(unit._id);
      }

      if (!unitObj) {
        console.warn('Unit not found or invalid:', unit);
      }
    }

    let categories = [];
    if (category) {
      try {
        categories = typeof category === 'string' ? JSON.parse(category) : category;
      } catch {
        categories = [category];
      }
    }

    const categoryIds = categories.filter(c => /^[0-9a-fA-F]{24}$/.test(c));
    const categoryNames = categories.filter(c => !/^[0-9a-fA-F]{24}$/.test(c));

    const foundCategories = await Category.find({
      $or: [
        { _id: { $in: categoryIds } },
        { name: { $in: categoryNames } }
      ]
    }).lean();

    const productCategories = foundCategories.map(cat => ({
      _id: cat._id,
      name: cat.name
    }));

    let foundSubCategory = null;
    if (subCategory && foundCategories.length > 0) {
      foundSubCategory = foundCategories[0].subcat?.find(sub =>
        sub.name === subCategory || sub._id.toString() === subCategory
      );
    }

    let foundSubSubCategory = null;
    if (subSubCategory && foundSubCategory) {
      foundSubSubCategory = foundSubCategory.subsubcat?.find(subsub =>
        subsub.name === subSubCategory || subsub._id.toString() === subSubCategory
      );
    }

    let returnProductData = null;
    if (returnProduct) {
      try {
        const parsedReturn = typeof returnProduct === 'string'
          ? JSON.parse(returnProduct)
          : returnProduct;

        returnProductData = {
          _id: new mongoose.Types.ObjectId(),
          title: parsedReturn.title?.trim() || ""
        };

        const uploadedFile = req.files?.file?.[0];
if (uploadedFile && uploadedFile.key) {
  returnProductData.image = `/${uploadedFile.key}`;
}
 else {
          console.warn("❗ No file provided for returnProduct image");
        }
        console.log("🧾 Final returnProductData:", JSON.stringify(returnProductData, null, 2));
      } catch (err) {
        console.warn("❗ Failed to parse returnProduct:", err.message);
      }
    }

    let parsedVariantsArray = [];
    if (req.body.variants) {
      try {
        parsedVariantsArray = typeof req.body.variants === 'string'
          ? JSON.parse(req.body.variants)
          : req.body.variants;
      } catch (err) {
        console.error("❌ Failed to parse variants:", err.message);
      }
    }

    const parsedVariantsWithIds = parsedVariantsArray.map(v => ({
      ...v,
      _id: v._id || new mongoose.Types.ObjectId()
    }));

    const finalInventoryArray = parsedVariantsWithIds.map(variant => ({
      _id: new mongoose.Types.ObjectId(),
      variantId: variant._id,
      quantity: 0
    }));

    console.log("🧾 Final inventory:", JSON.stringify(finalInventoryArray, null, 2));
    console.log("🧾 variantImageMap keys:", Object.keys(variantImageMap));
    console.log("🧾 parsedVariantsWithIds:", parsedVariantsWithIds.map(v => v.imageKey));

// 👇 This replaces old logic: overwrite entire variants list based on what you send
const finalVariants = parsedVariantsWithIds.map(variant => {
  const imageKey = req.files?.[variant.imageKey]?.[0]?.key;
  const image = imageKey ? `/${imageKey}` : variant.image || "";
  const discountValue = variant.mrp && variant.sell_price
    ? Math.round(((variant.mrp - variant.sell_price) / variant.mrp) * 100)
    : 0;

  return {
    ...variant,
    _id: variant._id || new mongoose.Types.ObjectId(),
    image,
    discountValue
  };
});


    const updateData = {
      ...(productName && { productName }),
      ...(description && { description }),
      ...(rating && { rating }),
      ...(image && { productThumbnailUrl: image }),
      ...(MultipleImage.length && { productImageUrl: MultipleImage }),
      ...(productCategories.length && { category: productCategories }),
      ...(foundSubCategory && { subCategory: { _id: foundSubCategory._id, name: foundSubCategory.name } }),
      ...(foundSubSubCategory && { subSubCategory: { _id: foundSubSubCategory._id, name:        foundSubSubCategory.name } }),
      ...(ribbon && { ribbon }),
      ...(returnProductData && { returnProduct: returnProductData }),
      ...(unitObj && { unit: { _id: unitObj._id, name: unitObj.unitname } }),
      ...(brandObj && { brand_Name: { _id: brandObj._id, name: brandObj.brandName } }),
      ...(sold_by && { sold_by }),
      ...(type && { type }),
      ...(productLocation.length && { location: productLocation }),
      ...(online_visible !== undefined && { online_visible }),
      ...(finalInventoryArray.length && { inventory: finalInventoryArray }),
      ...(tax && { tax }),
      ...(feature_product && { feature_product }),
      ...(fulfilled_by && { fulfilled_by }),
      ...(minQuantity && { minQuantity }),
      ...(maxQuantity && { maxQuantity }),
      ...(finalFilterArray.length && { filter: finalFilterArray }),
      ...(finalVariants.length && { variants: finalVariants}),
      ...(ratings && { ratings }),
      ...(mrp && { mrp }),
      ...(status && { status }),
      ...(sell_price && { sell_price })
    };

    console.log("🧾 Update data:", JSON.stringify(updateData, null, 2));

    const updatedProduct = await Products.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ message: "Product updated successfully", updated: updatedProduct });

  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ message: "Error updating product", error: error.message });
  }
};

exports.getRelatedProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?._id;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const [product, cartDocs, stores] = await Promise.all([
      Products.findById(productId).lean(),
      userId ? Cart.find({ userId }).lean() : Promise.resolve([]),
      userId ? getStoresWithinRadius(req.user.location.latitude, req.user.location.longitude) : Promise.resolve({ matchedStores: [] })
    ]);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Determine which category level to use
    let relatedCategoryIds = [];
    if (Array.isArray(product.subSubCategory) && product.subSubCategory.length > 0) {
      relatedCategoryIds = product.subSubCategory.map(c => String(c._id));
    } else if (Array.isArray(product.subCategory) && product.subCategory.length > 0) {
      relatedCategoryIds = product.subCategory.map(c => String(c._id));
    } else if (Array.isArray(product.category) && product.category.length > 0) {
      relatedCategoryIds = product.category.map(c => String(c._id));
    }

    // If no categories at all, return empty array
    if (relatedCategoryIds.length === 0) {
      return res.status(200).json({ message: "Related Product", relatedProducts: [] });
    }

    // --- Build allowed stores list
    const allowedStores = Array.isArray(stores?.matchedStores) ? stores.matchedStores : [];
    const allowedStoreIds = allowedStores.map(store => store._id.toString());

    // --- Build stock map for those stores
    const stockDocs = await Stock.find({ storeId: { $in: allowedStoreIds } }).lean();
    const stockMap = {};
    for (const doc of stockDocs) {
      for (const item of doc.stock || []) {
        const key = `${item.productId}_${item.variantId}`;
        stockMap[key] = {
          quantity: item.quantity || 0,
          price: item.price ?? null,
          mrp: item.mrp ?? null,
          storeId: doc.storeId
        };
      }
    }

    // --- Build cart map
    const cartMap = {};
    for (const item of cartDocs) {
      const key = `${item.productId}_${item.varientId}`;
      cartMap[key] = item.quantity;
    }

    // --- Get related candidates
    const candidates = await Products.find({
      _id: { $ne: productId },
      $or: [
        { "subSubCategory._id": { $in: relatedCategoryIds } },
        { "subCategory._id": { $in: relatedCategoryIds } },
        { "category._id": { $in: relatedCategoryIds } }
      ]
    }).limit(20).lean();

    // --- Score & sort candidates
    const relatedProducts = candidates
      .map((p) => {
        let score = 0;
        if ((p.subSubCategory || []).some(c => relatedCategoryIds.includes(String(c._id)))) score = 3;
        else if ((p.subCategory || []).some(c => relatedCategoryIds.includes(String(c._id)))) score = 2;
        else if ((p.category || []).some(c => relatedCategoryIds.includes(String(c._id)))) score = 1;

        return { ...p, relevanceScore: score };
      })
      .filter(p => p.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);

    // --- Attach inventory and cart info
    for (const relProduct of relatedProducts) {
      relProduct.inventory = [];
      relProduct.inCart = { status: false, qty: 0, variantIds: [] };
      relProduct.soldBy = {};
      let hasStock = false; 
      if (Array.isArray(relProduct.variants)) {
        for (const variant of relProduct.variants) {
          const key = `${relProduct._id}_${variant._id}`;
          const stockEntry = stockMap[key];
          const cartQty = cartMap[key] || 0;

          if (stockEntry?.price != null) variant.sell_price = stockEntry.price;
          if (stockEntry?.mrp != null) variant.mrp = stockEntry.mrp;

          relProduct.inventory.push({
            variantId: variant._id,
            quantity: stockEntry?.quantity || 0
          });

    if ((stockEntry?.quantity || 0) > 0) {
            hasStock = true;
          }


          if (cartQty > 0) {
            relProduct.inCart.status = true;
            relProduct.inCart.qty += cartQty;
            relProduct.inCart.variantIds.push(variant._id);
          }
    if (stockEntry?.quantity > 0 && stockEntry?.storeId) {
            const store = allowedStores.find(
              s => s._id.toString() === stockEntry.storeId.toString()
            );
            if (store) {
              relProduct.soldBy = store.soldBy;
            }
          }
        }
      }

      // ✅ If product had no stock → soldBy stays empty
      if (!hasStock) {
        relProduct.soldBy = {};
      }
    }

    return res.status(200).json({
      message: "Related Product",
      relatedProducts,
    });

  } catch (err) {
    console.error("❌ Error fetching related products:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { storeId, stock } = req.body;

    if (
      !productId ||
      !storeId ||
      !Array.isArray(stock) ||
      stock.length === 0
    ) {
      return res.status(400).json({ message: "All fields are required and stock must be an array." });
    }

    let storeStock = await Stock.findOne({ storeId });

    if (!storeStock) {
      const newStock = await Stock.create({
          storeId,
          stock: stock.map(item => {
        const newItem = {
          productId,
          variantId: item.variantId,
          quantity: item.quantity,
        };
      
        if (item.price != null && item.price !== 0) {
          newItem.price = item.price;
        }
      
        if (item.mrp != null && item.mrp !== 0) {
          newItem.mrp = item.mrp;
        }
      
        return newItem;
      })

      });

      return res.status(201).json({
        message: "New stock document created",
        stock: newStock
      });
    }

  for (const item of stock) {
      const index = storeStock.stock.findIndex(
        s => s.productId.toString() === productId &&
             s.variantId.toString() === item.variantId
      );

      if (index !== -1) {
        storeStock.stock[index].quantity = item.quantity;

        if (item.price != null && item.price !== 0) {
          storeStock.stock[index].price = item.price;
        }
        if (item.mrp != null && item.mrp !== 0) {
          storeStock.stock[index].mrp = item.mrp;
        }
      } else {
        const newItem = {
          productId,
          variantId: item.variantId,
          quantity: item.quantity,
        };

        if (item.price != null && item.price !== 0) {
          newItem.price = item.price;
        }
        if (item.mrp != null && item.mrp !== 0) {
          newItem.mrp = item.mrp;
        }

        storeStock.stock.push(newItem);
      }
    }

    await storeStock.save();

    return res.status(200).json({
      message: "Stock updated successfully",
      stock: storeStock
    });

  } catch (error) {
    console.error("❌ Error in updateStock:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

exports.adminProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", city = "", category = "" } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build dynamic query
    const query = { status: true }; // Only active products

    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } }
      ];
    }

    if (city) {
      query["location.city.name"] = city;
    }

    if (category) {
      query["category.name"] = category;
    }

    // Get paginated products
    const [products, total] = await Promise.all([
      Products.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Products.countDocuments(query)
    ]);

    return res.status(200).json({
      message: "Products",
      Product: products,
      count: total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });

  } catch (error) {
    console.error("❌ Error in adminProducts:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.rating = async (req,res) => {
  try {
  const userId = req.user
  const {rating,Note,order_id} = req.body
  const userData = await User.findById(userId)
  console.log(userData);
  
  const newRating = await Rating.create({rating,Note,order_id,userInfo:{userId:userId,userName:userData.name}})
  return res.status(200).json({message:"Rating Created Successfully",newRating})
  } catch (error) {
    console.error(error);
    return res.status(500).json({message:"Server Error"})
  }
}

// exports.notification=async (req,res) => {
//   try {
//   const {title,description,time,city}=req.body
//   const image = req.files.image?.[0].path
//    const utcTime = moment.tz(time, "Asia/Kolkata").utc().toDate();
//   const newNotificaton = await Notification.create({title,description,image,time:utcTime,city})
//   res.status(200).json({message: "Notification Createded successfully",newNotificaton});
// } catch (error) {
//      console.error(error);
//     res.status(500).json({ message: "Notification Not Createded", error: error.message });
//   }
// }

// exports.getNotification = async (req, res) => {
//   try {
//     const user = req.user; 
//     let userCity = user.city;

//     if (user.Address?.length > 0) {
//       const latestAddress = user.Address[user.Address.length - 1];
//       if (latestAddress.city) {
//         userCity = latestAddress.city;
//       }
//     }

//     if (!userCity) {
//       return res.status(400).json({ message: "City not found in user profile or address" });
//     }

//     const matchingCities = await ZoneData.find({ city: userCity }).select('_id');
//     const cityIds = matchingCities.map(c => c._id);


//     const notifications = await Notification.find({
//       $or: [
//         { global: true },
//         { city: { $in: cityIds } }
//       ]
//     }).sort({ time: -1 });

//     return res.status(200).json({ message: "Notifications fetched", notifications });

//   } catch (error) {
//     console.error("Error fetching notifications:", error);
//     return res.status(500).json({ message: "Internal server error", error: error.message });
//   }
// };