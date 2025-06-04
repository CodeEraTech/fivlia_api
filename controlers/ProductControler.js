const mongoose = require('mongoose');
const Products = require('../modals/Product');
const Attribute = require('../modals/attribute');
const Category = require('../modals/category');
const Unit = require('../modals/unit');
const { ZoneData } = require('../modals/cityZone');
const brand = require('../modals/brand')
const Notification = require('../modals/Notification');
const moment = require('moment-timezone');

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



exports.addProduct = async (req, res) => {
  try {
    const {
      productName, description, category, subCategory, subSubCategory,
      sku, ribbon, brand_Name, sold_by, type, location, online_visible,
      inventory, tax, feature_product, fulfilled_by, variants, minQuantity,
      maxQuantity, ratings, unit, mrp, sell_price
    } = req.body;

    const MultipleImage = req.files?.MultipleImage?.map(file => file.path) || [];
    const image = req.files?.image?.[0]?.path || "";

    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (e) {
        parsedVariants = [];
      }
    }

    let parsedLocation = [];
    if (location) {
      try {
        parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
      } catch (e) {
        parsedLocation = [];
      }
    }

    const productLocation = [];
    for (let loc of parsedLocation) {
      try {
        const cityData = await ZoneData.findOne({ "city": loc.city.name });
        const zoneMatch = cityData?.zones?.find(zone => zone.address === loc.zone.name);

        if (cityData && zoneMatch) {
          productLocation.push({
            city: { _id: cityData._id, name: cityData.city },
            zone: { _id: zoneMatch._id, name: zoneMatch.address }
          });
        }
      } catch { continue; }
    }

    let brandObj = null;
    if (brand_Name) {
      brandObj = await brand.findOne({ brandName: brand_Name });
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

    const finalVariants = parsedVariants.map(variant => {
      const discount = variant.mrp && variant.sell_price
        ? Math.round(((variant.mrp - variant.sell_price) / variant.mrp) * 100)
        : 0;
      return { ...variant, discountValue: discount };
    });

    const newProduct = await Products.create({
      ...(productName && { productName }),
      ...(description && { description }),
      ...(image && { productThumbnailUrl: image }),
      ...(MultipleImage.length && { productImageUrl: MultipleImage }),
      ...(productCategories.length && { category: productCategories }),
      ...(foundSubCategory && { subCategory: { _id: foundSubCategory._id, name: foundSubCategory.name } }),
      ...(foundSubSubCategory && { subSubCategory: { _id: foundSubSubCategory._id, name: foundSubSubCategory.name } }),
      ...(sku && { sku }),
      ...(ribbon && { ribbon }),
      ...(unit && { unit }),
      ...(brandObj && { brand_Name: { _id: brandObj._id, name: brandObj.brandName } }),
      ...(sold_by && { sold_by }),
      ...(type && { type }),
      ...(productLocation.length && { location: productLocation }),
      ...(online_visible !== undefined && { online_visible }),
      ...(inventory && { inventory }),
      ...(tax && { tax }),
      ...(feature_product && { feature_product }),
      ...(fulfilled_by && { fulfilled_by }),
      ...(minQuantity && { minQuantity }),
      ...(maxQuantity && { maxQuantity }),
      ...(finalVariants.length && { variants: finalVariants }),
      ...(ratings && { ratings }),
      ...(mrp && { mrp }),
      ...(sell_price && { sell_price }),
    });

    console.log("✅ Product Added");
    return res.status(200).json({ message: "Product Added" });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "An error occurred!", error: error.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const { id } = req.query;

    const products = await Products.find({
      $or: [
        { 'category._id': id },
        { 'subCategory._id': id },
        { 'subSubCategory._id': id }
      ]
    });

    if (!products.length) {
      return res.status(404).json({ message: 'No products found for this ID.' });
    }

    return res.status(200).json({ message: 'Products fetched successfully.', products });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

exports.bestSelling=async (req,res) => {
  try {
  const best = await Products.find().sort({purchases: -1}).limit(10);
   return res.status(200).json({ message: "Jai Baba ki", best });
  } catch (error) {
     return res.status(500).json({ message: "An error occured!", error: error.message });
  }
}

exports.searchProduct=async (req,res) => {
  try {
    const {name}=req.query
    const filter = {}
    if(name){
      filter.productName = {$regex:name,$options:'i'}
    }
const product=await Products.find(filter)

res.json(product)

  } catch (error) {
      console.error("Server error:", error);
    return res.status(500).json({ message: "An error occured!", error: error.message });
  }
}

exports.getFeatureProduct=async (req,res) => {
  try {
     const product=await Products.find({feature_product:true})
   return res.status(200).json({ message: 'It is feature product.', product });
  } catch (error) {
      console.error("Server error:", error);
    return res.status(500).json({ message: "An error occured!", error: error.message });
  }
}

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
      sku, ribbon, brand_Name, sold_by, type, location, online_visible,
      inventory, tax, feature_product, fulfilled_by, variants, minQuantity,
      maxQuantity, ratings, unit, mrp, sell_price
    } = req.body;

    // Images (if you update them)
    const MultipleImage = req.files?.MultipleImage?.map(file => file.path) || [];
    const image = req.files?.image?.[0]?.path || "";

    // Parse variants
    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants = JSON.parse(variants);
      } catch {
        parsedVariants = [];
      }
    }

      let parsedLocation = [];
    if (location) {
      try {
        parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
      } catch (e) {
        parsedLocation = [];
      }
    }
    const productLocation = [];
    for (let loc of parsedLocation) {
      try {
        const cityData = await ZoneData.findOne({ "city": loc.city });
        if (!cityData) continue;
        const zoneMatch = cityData.zones.find(zone => zone.address === loc.zone);
        if (!zoneMatch) continue;

        productLocation.push({
          city: { _id: cityData._id, name: cityData.city },
          zone: { _id: zoneMatch._id, name: zoneMatch.address }
        });
      } catch (err) {
        continue;
      }
    }

    // Resolve brand object (if needed)
    let brandObj = null;
    if (brand_Name) {
      brandObj = await brand.findOne({ brandName: brand_Name });
    }

    // Parse category array from request
    let categories = [];
    if (category) {
      try {
        categories = typeof category === 'string' ? JSON.parse(category) : category;
      } catch {
        categories = [category];
      }
    }

    // Separate category _id's and names to find them
    const categoryIds = categories.filter(c => /^[0-9a-fA-F]{24}$/.test(c));
    const categoryNames = categories.filter(c => !/^[0-9a-fA-F]{24}$/.test(c));

    // Fetch categories from DB
    const foundCategories = await Category.find({
      $or: [
        { _id: { $in: categoryIds } },
        { name: { $in: categoryNames } }
      ]
    }).lean();

    // Prepare final category objects with needed fields
    const productCategories = foundCategories.map(cat => ({
      _id: cat._id,
      name: cat.name,
      brand_Name: cat.brand_Name || "undefined" // optional
    }));

    // Handle subCategory & subSubCategory similarly to addProduct
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

    // Calculate discounts in variants like addProduct
    const finalVariants = parsedVariants.map(variant => {
      const discount = variant.mrp && variant.sell_price
        ? Math.round(((variant.mrp - variant.sell_price) / variant.mrp) * 100)
        : 0;
      return { ...variant, discountValue: discount };
    });

    // Prepare update object
    const updateData = {
      ...(productName && { productName }),
      ...(description && { description }),
      ...(image && { productThumbnailUrl: image }),
      ...(MultipleImage.length && { productImageUrl: MultipleImage }),
      ...(productCategories.length && { category: productCategories }),
      ...(foundSubCategory && { subCategory: { _id: foundSubCategory._id, name: foundSubCategory.name } }),
      ...(foundSubSubCategory && { subSubCategory: { _id: foundSubSubCategory._id, name: foundSubSubCategory.name } }),
      ...(sku && { sku }),
      ...(ribbon && { ribbon }),
      ...(unit && { unit }),
      ...(brandObj && { brand_Name: { _id: brandObj._id, name: brandObj.brandName } }),
      ...(sold_by && { sold_by }),
      ...(type && { type }),
      ...(productLocation.length && { location: productLocation }),
      ...(online_visible !== undefined && { online_visible }),
      ...(inventory && { inventory }),
      ...(tax && { tax }),
      ...(feature_product && { feature_product }),
      ...(fulfilled_by && { fulfilled_by }),
      ...(minQuantity && { minQuantity }),
      ...(maxQuantity && { maxQuantity }),
      ...(finalVariants.length && { variants: finalVariants }),
      ...(ratings && { ratings }),
      ...(mrp && { mrp }),
      ...(sell_price && { sell_price }),
    };

    // Perform the update
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


exports.notification=async (req,res) => {
  try {
  const {title,description,time,zone}=req.body
  const image = req.files.image?.[0].path
   const utcTime = moment.tz(time, "Asia/Kolkata").utc().toDate();
  const newNotificaton = await Notification.create({title,description,image,time:utcTime,zone})
  res.status(200).json({message: "Product updated successfully",newNotificaton});
} catch (error) {
     console.error(error);
    res.status(500).json({ message: "Notification Not Created", error: error.message });
  }
}

exports.getNotification=async (req,res) => {
  try {
    const notification = await Notification.find()
    return res.status(200).json({message:"New Notification",notification})
  } catch (error) {
     console.error(error);
    res.status(500).json({ message: "Notification Not Found", error: error.message }); 
  }
}