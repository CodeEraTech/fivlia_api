const Store = require('../modals/store');
const Products = require('../modals/Product');
const Category = require('../modals/category');

exports.createStore = async (req, res) => {
  try {
    console.log(req.body);

    const { storeName, city, zone, Latitude, Longitude, Description, Category: mainCategoryId } = req.body;

    // Get image path if uploaded
    const image = req.files?.image?.[0]?.path || '';

    // Find main category with subcategories and sub-subcategories
    const mainCategory = await Category.findById(mainCategoryId).lean();
    console.log(mainCategory);
    
    if (!mainCategory) {
      return res.status(400).json({ message: "Selected main category not found" });
    }

    // Gather all IDs: main + sub + subsub
    const allCategoryIds = [mainCategory._id.toString()];

    // If subcategories exist, add their IDs + their subsub IDs
    if (mainCategory.subcat && mainCategory.subcat.length > 0) {
      for (const subcat of mainCategory.subcat) {
        allCategoryIds.push(subcat._id.toString());

        if (subcat.subsubcat && subcat.subsubcat.length > 0) {
          for (const subsubcat of subcat.subsubcat) {
            allCategoryIds.push(subsubcat._id.toString());
          }
        }
      }
    }

    // Find all products matching any of these category IDs
    const products = await Products.find({
      $or: [
        { "category._id": { $in: allCategoryIds } },
        { subCategoryId: { $in: allCategoryIds } },
        { subSubCategoryId: { $in: allCategoryIds } }
      ]
    });

    // Create the store, store only main category ID in Category field
    const newStore = await Store.create({
      storeName,
      city,
      zone,
      Latitude,
      Longitude,
      Description,
      Category: mainCategory._id,
      image,
      // optional: you can store product IDs in the store if you want
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
    const category = await Category.findById(store.Category).lean();
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
