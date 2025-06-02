const mongoose = require('mongoose');
const Products = require('../modals/Product');
const Attribute = require('../modals/attribute');
const Category = require('../modals/category');
const Unit = require('../modals/unit');
const { ZoneData } = require('../modals/cityZone');
const brand = require('../modals/brand')

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

exports.addProduct = async (req, res) => {
  try {
    const {
      productName, description, category, subCategory, subSubCategory,
      sku, ribbon, brand_Name, sold_by, type, location, online_visible,
      inventory, tax, feature_product, fulfilled_by, variants, minQuantity,
      maxQuantity, ratings, unit,mrp,sell_price
    } = req.body;

   const MultipleImage = req.files.MultipleImage?.map(file => file.path);

    const image = req.files.image?.[0].path;
    const parsedVariants = JSON.parse(variants);
    const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;

    // Process locations
    const productLocation = [];
    for (let loc of parsedLocation) {
      const cityData = await ZoneData.findOne({ "city": loc.city.name });
      if (!cityData) {
        return res.status(400).json({ message: `City ${loc.city.name} is not available right now` });
      }

      const zoneMatch = cityData.zones.find(zone => zone.address === loc.zone.name);
      if (!zoneMatch) {
        return res.status(400).json({ message: `Zone ${loc.zone.name} is not available right now` });
      }

      productLocation.push({
        city: { _id: cityData._id, name: cityData.city },
        zone: { _id: zoneMatch._id, name: zoneMatch.address }
      });
    }

    // Find brand
    const brands = await brand.findOne({ brandName: brand_Name });
    if (!brands) {
      return res.status(400).json({ message: `Brand ${brand_Name} not found` });
    }

    // Parse category input to array if needed
    let categories = category;
    if (typeof categories === 'string') {
      try {
        categories = JSON.parse(categories);
      } catch {
        categories = [categories];
      }
    }
    if (!Array.isArray(categories)) {
      categories = [categories];
    }

    // Separate categories into ObjectIds and names
    const categoryIds = categories.filter(c => /^[0-9a-fA-F]{24}$/.test(c));
    const categoryNames = categories.filter(c => !/^[0-9a-fA-F]{24}$/.test(c));

    // Find categories
    const foundCategories = await Category.find({
      $or: [
        { _id: { $in: categoryIds } },
        { name: { $in: categoryNames } }
      ]
    }).lean();

    if (foundCategories.length === 0) {
      return res.status(404).json({ message: `No matching categories found for ${categories}` });
    }

    // For now, assume product accepts multiple categories, so store them as array of {_id, name}
    const productCategories = foundCategories.map(cat => ({
      _id: cat._id,
      name: cat.name
    }));

    // Handle subCategory (if multiple are possible, adapt similar to category)
    let foundSubCategory = null;
    if (subCategory && subCategory.trim() !== "") {
      // For simplicity assuming single subCategory string (id or name)
      foundSubCategory = foundCategories[0].subcat.find(sub =>
        sub.name === subCategory || sub._id.toString() === subCategory
      );

      if (!foundSubCategory) {
        return res.status(404).json({ message: `SubCategory ${subCategory} not found` });
      }
    }

    // Handle subSubCategory similarly
    let foundSubSubCategory = null;
    if (foundSubCategory && subSubCategory && subSubCategory.trim() !== "") {
      foundSubSubCategory = foundSubCategory.subsubcat.find(subsub =>
        subsub.name === subSubCategory || subsub._id.toString() === subSubCategory
      );

      if (!foundSubSubCategory) {
        return res.status(404).json({ message: `SubSubCategory ${subSubCategory} not found` });
      }
    } else if (!foundSubCategory && subSubCategory && subSubCategory.trim() !== "") {
      return res.status(400).json({ message: "Cannot provide subSubCategory without subCategory" });
    }

    // Calculate discount on variants
    const finalVariants = parsedVariants.map(variant => {
      const discount = variant.mrp && variant.sell_price
        ? Math.round(((variant.mrp - variant.sell_price) / variant.mrp) * 100)
        : 0;
      return { ...variant, discountValue: discount };
    });

    // Create product
    const newProduct = await Products.create({
      productName,
      description,
      productThumbnailUrl: image,
      productImageUrl: MultipleImage,
      category: productCategories,  // **multiple categories as array here**
      subCategory: foundSubCategory ? { _id: foundSubCategory._id, name: foundSubCategory.name } : null,
      subSubCategory: foundSubSubCategory ? { _id: foundSubSubCategory._id, name: foundSubSubCategory.name } : null,
      sku,
      ribbon,
      unit,
      brand_Name: { _id: brands._id, name: brands.brandName },
      sold_by,
      type,
      location: productLocation,
      online_visible,
      inventory,
      tax,
      feature_product,
      minQuantity,
      maxQuantity,
      fulfilled_by,
      variants: finalVariants,
      ratings,
      sell_price,
      sku,
      mrp
    });

    console.log("✅ Product Added");
    return res.status(200).json({ message: "Product Added" });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "An error occured!", error: error.message });
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