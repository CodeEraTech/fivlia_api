const Store = require('../modals/store');
const Products = require('../modals/Product');
const CategoryModel = require('../modals/category'); // renamed to avoid name clash

exports.createStore = async (req, res) => {
  try {
    console.log('Incoming body:', req.body);

    const { storeName, city, zone, Latitude, Longitude, Description } = req.body;
    let { Category: categoryInput } = req.body;

    // ✅ Convert input to array if it's string
    if (typeof categoryInput === 'string') {
      categoryInput = [categoryInput]; // for single
    }

    // ✅ Normalize for Postman multiple field case
    if (!Array.isArray(categoryInput)) {
      categoryInput = [];
    }

    // ✅ Clean up each ID string
    categoryInput = categoryInput.map(id => id.trim());

    // ✅ Final category IDs array to store
    const finalCategoryIds = [];
    const allProductCategoryIds = [];

    for (const categoryId of categoryInput) {
      const category = await CategoryModel.findById(categoryId).lean();
      if (!category) continue;

      finalCategoryIds.push(category._id.toString());

      // Push main category ID
      allProductCategoryIds.push(category._id.toString());

      // Add subcategory and sub-subcategory IDs
      if (category.subcat?.length) {
        for (const sub of category.subcat) {
          allProductCategoryIds.push(sub._id.toString());
          sub.subsubcat?.forEach(subsub => allProductCategoryIds.push(subsub._id.toString()));
        }
      }
    }

    // ✅ Image path
    const image = req.files?.image?.[0]?.path || '';

    // ✅ Fetch matching products
    const products = await Products.find({
      $or: [
        { "category._id": { $in: allProductCategoryIds } },
        { subCategoryId: { $in: allProductCategoryIds } },
        { subSubCategoryId: { $in: allProductCategoryIds } }
      ]
    });

    // ✅ Save new store
    const newStore = await Store.create({
      storeName,
      city,
      zone,
      Latitude,
      Longitude,
      Description,
      Category: finalCategoryIds, // ✅ now it's full array
      image,
      products: products.map(p => p._id)
    });

    return res.status(201).json({
      message: "Store created successfully",
      store: newStore,
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
      // No id: Return all stores only
      const allStores = await Store.find().lean();
      return res.status(200).json({ stores: allStores });
    }

    // Find the store by id
    const store = await Store.findById(id).lean();
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    // Get the main category with subcats and subsubcats
    const category = await CategoryModel.findById(store.Category).lean();
    if (!category) {
      return res.status(404).json({ message: "Category linked with store not found" });
    }

    // Build all category IDs (main + sub + subsub)
    const allCategoryIds = [category._id.toString()];

    (category.subcat || []).forEach(sub => {
      allCategoryIds.push(sub._id.toString());
      (sub.subsubcat || []).forEach(subsub => {
        allCategoryIds.push(subsub._id.toString());
      });
    });

    // Get all products in these categories
    const products = await Products.find({
      $or: [
        { "category._id": { $in: allCategoryIds } },
        { subCategoryId: { $in: allCategoryIds } },
        { subSubCategoryId: { $in: allCategoryIds } }
      ]
    }).lean();

    return res.status(200).json({
      store,
      categoryTree: category,
      products
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
