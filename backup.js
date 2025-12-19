exports.getSellerProducts = async (req, res) => {
  const { sellerId, page = 1, limit, search = "", category = "" } = req.query;

  try {
    if (!sellerId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing sellerId" });
    }

    let productMatch = {};
    if (search) {
      productMatch.productName = { $regex: search, $options: "i" };
    }

    if (category) {
      productMatch["category._id"] = new mongoose.Types.ObjectId(category);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const stockData = await Stock.findOne({ storeId: sellerId }).lean();
    const stockEntries = stockData?.stock || [];

    const productIds = stockEntries
      .map((s) => s.productId)
      .filter(Boolean)
      .map((id) => new mongoose.Types.ObjectId(id));

    // Count total seller products
    const total = await Product.countDocuments({ _id: { $in: productIds } });

    const sellerProducts = await Product.find({
      _id: { $in: productIds },
      ...productMatch, // your search filter
    })
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        "productName mrp sku sell_price productThumbnailUrl category subCategory subSubCategory variants sku"
      )
      .populate({ path: "category", model: "Category" })
      .lean();

    const products = await Promise.all(
      sellerProducts.map(async (sp) => {
        const prod = sp;

        const subCategoryId = prod.subCategory?.[0]?._id?.toString();
        const subSubCategoryId = prod.subSubCategory?.[0]?._id?.toString();
        const categoryId = prod.category?.[0]?._id;

        let commission = 0;
        let categoryName = "Uncategorized";

        if (categoryId) {
          // 🛠️ Manually fetch category with subcat
          const fullCategory = await Category.findById(categoryId).lean();
          categoryName = fullCategory?.name ?? "Uncategorized";

          if (fullCategory?.subcat && (subSubCategoryId || subCategoryId)) {
            const matchedSubcat = fullCategory.subcat.find(
              (sub) => sub._id.toString() === subCategoryId
            );

            if (matchedSubcat && Array.isArray(matchedSubcat.subsubcat)) {
              const matchedSubSubCat = matchedSubcat.subsubcat.find(
                (subsub) => subsub._id.toString() === subSubCategoryId
              );
              commission =
                matchedSubSubCat?.commison ?? matchedSubcat?.commison ?? 0;
            } else {
              commission = matchedSubcat?.commison ?? 0;
            }
          }
        }
        const firstStockEntry = stockEntries.find(
          (s) => s.productId.toString() === prod._id.toString()
        );

        const variantsWithStock = (prod.variants || []).map((variant) => {
          const key = `${prod._id.toString()}_${variant._id.toString()}`;
          const stockEntry =
            stockEntries.find(
              (s) =>
                s.productId.toString() === prod._id.toString() &&
                s.variantId.toString() === variant._id.toString()
            ) || null;
          return {
            ...variant,
            stock: stockEntry?.quantity ?? 0,
            mrp: stockEntry?.mrp || variant.mrp,
            sell_price: stockEntry?.price || variant.sell_price,
            status: stockEntry?.status ?? false,
          };
        });
        return {
          sellerProductId: sp._id,
          productId: prod._id,
          productName: prod.productName,
          sku:prod.sku,
          productThumbnailUrl: prod.productThumbnailUrl,
          category: categoryName,
          mrp: sp.mrp == 0 ? prod.mrp : sp.mrp,
          sell_price: sp.sell_price == 0 ? prod.sell_price : sp.sell_price,
          variants: variantsWithStock,
          status: firstStockEntry?.status ?? false,
          commission,
        };
      })
    );

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