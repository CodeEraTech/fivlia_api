const Store = require('../modals/store');
const Stock = require('../modals/StoreStock')
const Products = require('../modals/Product');
const CategoryModel = require('../modals/category');
const {ZoneData} = require('../modals/cityZone'); // your Locations model

exports.createStore = async (req, res) => {
  try {
    console.log('Incoming body:', req.body);

    let {
      storeName,
      city,         // <-- e.g. "683eb89e207e54373548fa4f"
      zone,         // <-- e.g. '["683ec5b9bda160427cb853ba","683ec601bda160427cb853bb"]'
      Latitude,
      Longitude,
      ownerName,
      PhoneNumber,
      Description,
      Category: categoryInput
    } = req.body;

    //
    // 1️⃣ Parse `Category` string → array
    //
    if (typeof categoryInput === 'string') {
      try {
        const parsed = JSON.parse(categoryInput);
        categoryInput = Array.isArray(parsed) ? parsed : [categoryInput];
      } catch {
        categoryInput = [categoryInput];
      }
    }

    //
    // 2️⃣ Parse `zone` string → array
    //
    if (typeof zone === 'string') {
      try {
        const parsedZone = JSON.parse(zone);
        zone = Array.isArray(parsedZone) ? parsedZone : [zone];
      } catch {
        zone = [zone];
      }
    }

    //
    // 3️⃣ Resolve `city` → { _id, name }
    //
    const cityDoc = await ZoneData.findById(city).lean();
    if (!cityDoc) {
      return res.status(400).json({ message: `City not found: ${city}` });
    }
    const cityObj = { _id: cityDoc._id, name: cityDoc.city };

    //
    // 4️⃣ Resolve each `zone` ID → { _id, name }
    //
    const zoneObjs = [];
    for (let zones of zone) {
      zones = zones.toString().trim();
      const zdoc =cityDoc.zones.find(z => z._id.toString() === zones) ;
      if (zdoc) zoneObjs.push({ _id: zdoc._id, name: zdoc.address,title: zdoc.zoneTitle });
    }
console.log('city',cityObj);
console.log('zone',zoneObjs);

    //
    // 5️⃣ Category → full list + sub/subsub for product lookup
    //
    categoryInput = categoryInput.map(id => id.trim());
    const finalCategoryIds    = [];
    const allProductCategoryIds = [];

    for (const cid of categoryInput) {
      const cat = await CategoryModel.findById(cid).lean();
      if (!cat) continue;
      finalCategoryIds.push(cat._id);
      allProductCategoryIds.push(cat._id);
      if (cat.subcat?.length) {
        cat.subcat.forEach(sub => {
          allProductCategoryIds.push(sub._id);
          sub.subsubcat?.forEach(ss => allProductCategoryIds.push(ss._id));
        });
      }
    }

    //
    // 6️⃣ Image upload
    //
    const image = req.files?.image?.[0]?.path || '';

    //
    // 7️⃣ Find matching products
    //
    const products = await Products.find({
      $or: [
        { "category._id":   { $in: allProductCategoryIds } },
        { subCategoryId:     { $in: allProductCategoryIds } },
        { subSubCategoryId:  { $in: allProductCategoryIds } }
      ]
    });

    //
    // 8️⃣ Create store
    //
    const newStore = await Store.create({
      storeName,
      city:       cityObj,
      zone:       zoneObjs,
      Latitude:   parseFloat(Latitude),
      Longitude:  parseFloat(Longitude),
      ownerName,
      PhoneNumber,
      Description,
      Category:   finalCategoryIds,
      image,
      products:   products.map(p => p._id)
    });

    return res.status(201).json({
      message: "Store created successfully",
      store:   newStore,
      products
    });

  } catch (err) {
    console.error("Error creating store:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getStore = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      const allStores = await Store.find().lean();
      return res.status(200).json({ stores: allStores });
    }

    const store = await Store.findById(id).lean();
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    const categoryIds = Array.isArray(store.Category)
      ? store.Category
      : [store.Category];

    const allCategoryTrees = [];
    const allCategoryIds = [];

    for (const catId of categoryIds) {
      const category = await CategoryModel.findById(catId).lean();
      if (!category) continue;

      allCategoryTrees.push(category);
      allCategoryIds.push(category._id.toString());

      (category.subcat || []).forEach(sub => {
        allCategoryIds.push(sub._id.toString());
        (sub.subsubcat || []).forEach(subsub => {
          allCategoryIds.push(subsub._id.toString());
        });
      });
    }

    const products = await Products.find({
      $or: [
        { "category._id": { $in: allCategoryIds } },
        { subCategoryId: { $in: allCategoryIds } },
        { subSubCategoryId: { $in: allCategoryIds } }
      ]
    }).lean();

    // ✅ Fetch stock doc for this store
    const storeStockDoc = await Stock.findOne({ storeId: id }).lean();
    const stockEntries = storeStockDoc?.stock || [];

    // 🔁 Build a quick lookup map
    const stockMap = {};
    for (const item of stockEntries) {
      const key = `${item.productId}_${item.varientId}`;
      stockMap[key] = item.quantity;
    }

    // 🔁 Replace inventory array in each product
    for (const product of products) {
      product.inventory = [];

      if (Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          const key = `${product._id}_${variant._id}`;
          const quantity = stockMap[key] || 0;

          product.inventory.push({
            variantId: variant._id,
            quantity
          });
        }
      }
    }

    return res.status(200).json({
      store,
      categories: allCategoryTrees,
      products
    });

  } catch (err) {
    console.error("Error in getStore:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.addCategoryInStore=async (req,res) => {
    try {
      const {id}=req.params
    const {Category}=req.body
    const CategoryId = await Store.findByIdAndUpdate(id, { $addToSet: { Category: Category } },{new:true})

     return res.status(200).json({message:"Category Updated", CategoryId})   
    } catch (error) {
      console.error(error);
      return res.status(500).json({message:"An error occured"})   
    }
}

exports.removeCategoryInStore=async (req,res) => {
   try {
    const {id} = req.params
    const {Category}=req.body
    const deleted = await Store.findOneAndUpdate({_id:id},{$pull:{ Category:  Category }},{new:true})
    res.status(200).json({ message: "Category removed successfuly", deleted});
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error", error });
    }
}
