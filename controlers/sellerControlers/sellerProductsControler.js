const Products = require('../../modals/sellerModals/sellerProduct')
const Store = require('../../modals/store')
const mongoose = require('mongoose');
const axios = require('axios');
const Product = require('../../modals/Product');
const Category = require('../../modals/category');

exports.addSellerProduct = async (req, res) => {
  try {
    const { id } = req.params
    const { name, price, stock, approvalStatus, category, status } = req.body
    const image = `${req.files.image?.[0].key}`
    const newProduct = await Products.create({ image, name, price, stock, approvalStatus, category, status, sellerId: id })
    return res.status(200).json({ message: "Product request send to admin", newProduct })
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ResponseMsg: "An Error Occured" });
  }
}

exports.editSellerProduct = async (req, res) => {
  try {
    const { id } = req.params
    const { name, price, stock, rating, approvalStatus, category, status } = req.body

    const updateData = { name, price, stock, rating, approvalStatus, category, status };

    // Add image only if provided
    if (req.files?.image?.[0]?.key) {
      updateData.image = req.files.image[0].key;
    }

    const editProduct = await Products.findByIdAndUpdate(id, updateData)
    return res.status(200).json({ message: "Product Updated", editProduct })
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ResponseMsg: "An Error Occured" });
  }
}

exports.deleteSellerProduct = async (req, res) => {
  try {
    const { id } = req.params

    const deleteProduct = await Products.findByIdAndDelete(id)
    return res.status(200).json({ message: "Product Deleted", deleteProduct })
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ResponseMsg: "An Error Occured" });
  }
}

exports.updateSellerStock = async (req, res) => {
  try {
    const { id } = req.params
    const { stock } = req.body
    const updateStock = await Products.findByIdAndUpdate(id, { stock })
    return res.status(200).json({ message: "Stock Updated", updateStock })
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ResponseMsg: "An Error Occured" });
  }
}

exports.addCategoryInSeller = async (req, res) => {

  try {
    const { id } = req.params;
    const { sellerCategories, sellerProducts } = req.body;

    // ✅ Validation
    if (!sellerCategories || sellerCategories.length === 0) {
      return res.status(400).json({ message: "At least one main category must be selected." });
    }

    if (!sellerProducts || sellerProducts.length === 0) {
      return res.status(400).json({ message: "At least one product must be selected." });
    }

    // Extra validation (optional): ensure categoryId and productId are ObjectIds
    const invalidCategories = sellerCategories.filter(c => !c.categoryId);
    if (invalidCategories.length > 0) {
      return res.status(400).json({ message: "Invalid category structure." });
    }

    const invalidProducts = sellerProducts.filter(p => !p);
    if (invalidProducts.length > 0) {
      return res.status(400).json({ message: "Invalid product IDs." });
    }

    // Save in store
    //console.log("Updating store with ID:", id);
    const updatedStore = await Store.findByIdAndUpdate(
      id,
      { $set: { sellerCategories } },
      { new: true }
    );

    // Replace seller products (clear old, insert new)
    await Products.deleteMany({ id });

    // Prepare new documents
    const productDocs = sellerProducts.map((productId) => ({
      sellerId: id,
      product_id: productId,
      sell_price: 0,
      mrp: 0,
    }));

    // Insert new seller products
    await Products.insertMany(productDocs);

    if (!updatedStore) {
      return res.status(404).json({ message: "Store not found" });
    }
    return res.status(200).json({
      message: "Seller categories and products updated successfully",
    });
  } catch (err) {
    console.error("Error updating seller categories/products:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getDetailsGst = async (req, res) => {
  try {
    const { gst } = req.query; // Expect GST number in query param: /api/gst?gst=XXXX
    if (!gst) {
      return res.status(400).json({ message: "GST number is required" });
    }

    const API_KEY = "9205753778-gst-lil2";
    const url = `https://rappid.in/apis/gst.php?key=${API_KEY}&gst=${gst}`;

    // Make the API request
    const response = await axios.get(url);

    // Return the API response to client
    return res.status(200).json({
      success: true,
      gstDetails: response.data,
    });

  } catch (error) {
    console.error("Error fetching GST details:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch GST details",
      error: error.message,
    });
  }
};

exports.getCategoryProduct = async (req, res) => {
  try {
    let { categories, subCategories, subsubCategories } = req.query;

    // Split IDs from query params
    categories = categories ? categories.split('%') : [];
    subCategories = subCategories ? subCategories.split('%') : [];
    subsubCategories = subsubCategories ? subsubCategories.split('%') : [];

    // Helper to convert to ObjectIds
    const toObjectIdArray = (ids) =>
      ids
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    const categoryIds = toObjectIdArray(categories);
    const subCategoryIds = toObjectIdArray(subCategories);
    const subsubCategoryIds = toObjectIdArray(subsubCategories);

    // Build query
    const query = {
      $or: [
        { "category._id": { $in: categoryIds } },
        { "subCategory._id": { $in: subCategoryIds } },
        { "subSubCategory._id": { $in: subsubCategoryIds } }
      ]
    };

    const products = await Product.find(query)
      .select(
        "_id productName productThumbnailUrl " +
        "category._id category.name " +
        "subCategory._id subCategory.name " +
        "subSubCategory._id subSubCategory.name "
      )
      .lean();


    res.status(200).json({ message: 'Products fetched successfully', products });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred", error: error.message });
  }
};

exports.getSellerCategoryMapping = async (req, res) => {
  const { id } = req.params;
  try {
    const store = await Store.findById(id).select("sellerCategories");
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }
    const products = await Products.find({ sellerId: id }).select("product_id");

    const sellerProducts = products.map((p) => p.product_id);

    // 3. Return both
    return res.status(200).json({
      sellerCategories: store.sellerCategories || [],
      sellerProducts: sellerProducts || [],
    });
  } catch (err) {
    console.error("Error fetching seller mapping:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

exports.getSellerCategories = async (req, res) => {
  const { id } = req.params;

  try {
    const store = await Store.findById(id).select("sellerCategories").lean();

    if (!store || !store.sellerCategories || store.sellerCategories.length === 0) {
      return res.status(404).json({ message: "No seller categories found for this store." });
    }

    // Get all category IDs to fetch from Category collection
    const categoryIds = store.sellerCategories.map(c => c.categoryId);
    const categories = await Category.find({ _id: { $in: categoryIds } }).lean();

    const result = store.sellerCategories.map(storeCat => {
      const fullCat = categories.find(c => c._id.toString() === storeCat.categoryId.toString());
      if (!fullCat) return null;

      const subCategories = storeCat.subCategories || [];
      let totalSubSubCategories = 0;

      subCategories.forEach(sub => {
        totalSubSubCategories += (sub.subSubCategories || []).length;
      });

      return {
        _id: storeCat.categoryId,
        name: fullCat.name || "Unknown",
        image: fullCat.image || null,
        subCategoryCount: subCategories.length,
        subSubCategoryCount: totalSubSubCategories,
      };
    }).filter(Boolean); // filter out nulls

    return res.status(200).json({ categories: result });

  } catch (error) {
    console.error("Error in getSellerCategories:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};

exports.getSellerProducts = async (req, res) => {
  const { sellerId, page = 1, limit = 10, search = "", category = "" } = req.query;

  try {
    if (!sellerId) {
      return res.status(400).json({ success: false, message: "Missing sellerId" });
    }

    const filter = { sellerId };

    // Optional: filter by category if provided
    if (category) {
      filter.category = new mongoose.Types.ObjectId(category);
    }

    // Optional: search by product name (case-insensitive)
    let searchFilter = {};
    if (search) {
      searchFilter = { productName: { $regex: search, $options: "i" } };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Count total seller products
    const total = await Products.countDocuments(filter);

    // Fetch paginated seller products and populate from Product
    const sellerProducts = await Products.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: "product_id",
        model: "Product",
        match: searchFilter,
        select: "productName productThumbnailUrl",
      })
      .lean();

    // Filter out sellerProducts where populate returned null (search mismatch)
    const products = sellerProducts
      .filter(sp => sp.product_id)
      .map(sp => {
        const prod = sp.product_id;
        return {
          sellerProductId: sp._id,
          productId: prod._id,
          productName: prod.productName,
          productThumbnailUrl: prod.productThumbnailUrl,
          mrp: sp.mrp,
          sell_price: sp.sell_price,
          stock: sp.stock,
          status: sp.status ?? false,
        };
      });

    res.json({
      success: true,
      products,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error in getSellerProducts:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};