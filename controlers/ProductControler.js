const mongoose = require('mongoose');
const admin = require("../firebase/firebase");
const Products = require('../modals/Product');
const Attribute = require('../modals/attribute');
const Filters = require('../modals/filter')
const Category = require('../modals/category');
const Unit = require('../modals/unit');
const {CityData, ZoneData } = require('../modals/cityZone');
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
      productName, description, category, subCategory, subSubCategory,rating,
      sku, ribbon, brand_Name, sold_by, type, location, online_visible,
      inventory, tax, feature_product, fulfilled_by, variants, minQuantity,
      maxQuantity, ratings, unit, mrp, sell_price,filter
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
      selectedArray.push({
        _id: selectedObj._id,
        name: selectedObj.name
      });
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
    if (!loc.city || !Array.isArray(loc.city)) continue;

    for (let cityObj of loc.city) {
      const cityName = cityObj.name;
      if (!cityName) continue;

      const cityData = await ZoneData.findOne({ city: cityName });
      if (!cityData) continue;

      let matchedZones = [];
      if (loc.zone && Array.isArray(loc.zone) && loc.zone.length > 0) {
        for (let zoneObj of loc.zone) {
          const zoneName = zoneObj.name;
          const zoneMatch = cityData.zones.find(zone => zone.address === zoneName);
          if (zoneMatch) {
            matchedZones.push({ _id: zoneMatch._id, name: zoneMatch.address });
          }
        }
      }

      // Push one location per city, with all matched zones
      productLocation.push({
        city: [{ _id: cityData._id, name: cityData.city }],
        zone: matchedZones
      });
    }
  } catch (err) {
    continue;
  }
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
      ...(rating && {rating}),
      ...(image && { productThumbnailUrl: image }),
      ...(MultipleImage.length && { productImageUrl: MultipleImage }),
      ...(productCategories.length && { category: productCategories }),
      ...(foundSubCategory && { subCategory: { _id: foundSubCategory._id, name: foundSubCategory.name } }),
      ...(foundSubSubCategory && { subSubCategory: { _id: foundSubSubCategory._id, name: foundSubSubCategory.name } }),
      ...(sku && { sku }),
      ...(ribbon && { ribbon }),
      ...(unit && typeof unit === 'string' && {unit: { name: unit }}),
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
      ...(finalFilterArray.length && { filter: finalFilterArray }),
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

    // Get active city & zone IDs
    const activeCities = await CityData.find({ status: true }, 'city').lean();
    const activeCityNames = activeCities.map(c =>c.city ? c.city.toString():null);

    const zoneDocs = await ZoneData.find({}, 'zones').lean();
    const activeZoneIds = [];

zoneDocs.forEach(doc => {
  if (Array.isArray(doc.zones)) {
    doc.zones.forEach(zone => {
      if (zone.status === true && zone._id) {
        activeZoneIds.push(zone._id.toString());
      }
    });
  }
});
    // Fetch products filtered by category ID or get all
    let products;
    if (id) {
      products = await Products.find({
        $or: [
          { 'category._id': id },
          { 'subCategory._id': id },
          { 'subSubCategory._id': id }
        ]
      }).lean();
    } else {
      products = await Products.find({}).lean();
    }

   const filteredProducts = products.filter(product => {
  if (!Array.isArray(product.location)) return false;

  return product.location.some(loc => {
    const cityName = Array.isArray(loc.city)
      ? loc.city[0]?.name
      : loc.city?.name;

    const zoneId = Array.isArray(loc.zone)
      ? loc.zone[0]?._id?.toString()
      : loc.zone?._id?.toString();

    return (
      cityName &&
      zoneId &&
      activeCityNames.includes(cityName) &&
      activeZoneIds.includes(zoneId)
    );
  });
});

    if (filteredProducts.length === 0) {
      return res.status(404).json({ message: 'No active products found.' });
    }

    return res.status(200).json({
      message: 'Products fetched successfully.',
      products: filteredProducts,
    });

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
     const product=await Products.find({feature_product:true}).lean()
   return res.status(200).json({ message: 'It is feature product.', product  });
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
      sku, ribbon,rating,filter, brand_Name, sold_by, type, location, online_visible,
      inventory, tax, feature_product, fulfilled_by, variants, minQuantity,
      maxQuantity, ratings, unit, mrp, sell_price,status
    } = req.body;

    const MultipleImage = req.files?.MultipleImage?.map(file => file.path) || [];
    const image = req.files?.image?.[0]?.path || "";

    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants = JSON.parse(variants);
      } catch {
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
      selectedArray.push({
        _id: selectedObj._id,
        name: selectedObj.name
      });
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


console.log('Final productLocation:', JSON.stringify(productLocation, null, 2));


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

    const finalVariants = parsedVariants.map(variant => {
      const discount = variant.mrp && variant.sell_price
        ? Math.round(((variant.mrp - variant.sell_price) / variant.mrp) * 100)
        : 0;
      return { ...variant, discountValue: discount };
    });

    const updateData = {
      ...(productName && { productName }),
      ...(description && { description }),
      ...(rating && {rating}),
      ...(image && { productThumbnailUrl: image }),
      ...(MultipleImage.length && { productImageUrl: MultipleImage }),
      ...(productCategories.length && { category: productCategories }),
      ...(foundSubCategory && { subCategory: { _id: foundSubCategory._id, name: foundSubCategory.name } }),
      ...(foundSubSubCategory && { subSubCategory: { _id: foundSubSubCategory._id, name: foundSubSubCategory.name } }),
      ...(sku && { sku }),
      ...(ribbon && { ribbon }),
      ...(unitObj && { unit: { _id: unitObj._id, name: unitObj.unitname } }),
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
      ...(finalFilterArray.length && { filter: finalFilterArray }),
      ...(finalVariants.length && { variants: finalVariants }),
      ...(ratings && { ratings }),
      ...(mrp && { mrp }),
      ...(status && {status}),
      ...(sell_price && { sell_price }),
    };

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

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const product = await Products.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const allProducts = await Products.find({ _id: { $ne: product._id } }).lean();

    const scoredProducts = allProducts.map((p) => {
      let score = 0;

      if (String(p.category) === String(product.category)) score += 1;
      if (String(p.brand) === String(product.brand_Name)) score += 1;

      // Check if type is array and has intersection
      if (Array.isArray(p.type) && Array.isArray(product.type)) {
        const matchedTypes = p.type.filter((t) => product.type.includes(t));
        if (matchedTypes.length > 0) score += 2;
      }

      return { ...p, relevanceScore: score };
    });

    // Sort by highest score first
    const sorted = scoredProducts
      .filter(p => p.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10); // limit to 10

    return res.status(200).json({message:"Related Product", relatedProducts: sorted });

  } catch (err) {
    console.error("Error fetching related products:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.notification=async (req,res) => {
  try {
  const {title,description,time,city}=req.body
  const image = req.files.image?.[0].path
   const utcTime = moment.tz(time, "Asia/Kolkata").utc().toDate();
  const newNotificaton = await Notification.create({title,description,image,time:utcTime,city})
  res.status(200).json({message: "Notification Createded successfully",newNotificaton});
} catch (error) {
     console.error(error);
    res.status(500).json({ message: "Notification Not Createded", error: error.message });
  }
}

exports.getNotification = async (req, res) => {
  try {
    const user = req.user; 
    let userCity = user.city;

    if (user.Address?.length > 0) {
      const latestAddress = user.Address[user.Address.length - 1];
      if (latestAddress.city) {
        userCity = latestAddress.city;
      }
    }

    if (!userCity) {
      return res.status(400).json({ message: "City not found in user profile or address" });
    }

    const matchingCities = await ZoneData.find({ city: userCity }).select('_id');
    const cityIds = matchingCities.map(c => c._id);


    const notifications = await Notification.find({
      $or: [
        { global: true },
        { city: { $in: cityIds } }
      ]
    }).sort({ time: -1 });

    return res.status(200).json({ message: "Notifications fetched", notifications });

  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
