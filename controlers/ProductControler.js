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
    const{productName,description,category,subCategory,subSubCategory,sku,ribbon,brand_Name,sold_by,type,location,online_visible,inventory,tax,feature_product,fulfilled_by,variants,minQuantity,maxQuantity,addVarient,selectVarientValue

    } = req.body;

const MultipleImage = req.files.MultipleImage?.[0].path
const image = req.files.image?.[0].path
const parsedVariants = JSON.parse(variants);
const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;

const productLocation = [];

for (let loc of parsedLocation) {
  const cityData = await ZoneData.findOne({ "city": loc.city.name });
  if (!cityData) {
    return res.status(400).json({ message: `City ${loc.city.name} is not available right now` });
  }

const zoneMatch = cityData.zones.find(zone =>
  zone.address === loc.zone.name
);

  if (!zoneMatch) {
    return res.status(400).json({ message: `Zone ${loc.zone.name} is not available right now` });
  }
   productLocation.push({
    city: { _id: cityData._id, name: cityData.city },
    zone: { _id: zoneMatch._id, name: zoneMatch.address }
  });
}

const brands = await brand.findOne({brandName:brand_Name})
if (!brands) {
  return res.status(400).json({ message: `Brand ${brand_Name} not found` });
}
    const foundCategory = await Category.findOne({ name: category }).lean();
    if (!foundCategory) return res.status(404).json({ message: `Category ${category} not found` });

 let foundSubCategory = null;
    let foundSubSubCategory = null;

    if (subCategory && subCategory.trim() !== "") {
      foundSubCategory = foundCategory.subcat.find(sub => sub.name === subCategory);
      if (!foundSubCategory) return res.status(404).json({ message: `SubCategory ${subCategory} not found` });

      if (subSubCategory && subSubCategory.trim() !== "") {
        foundSubSubCategory = foundSubCategory.subsubcat.find(subsub => subsub.name === subSubCategory);
        if (!foundSubSubCategory) return res.status(404).json({ message: `SubSubCategory ${subSubCategory} not found` });
      }
    } else {
      if (subSubCategory && subSubCategory.trim() !== "") {
        return res.status(400).json({ message: "Cannot provide subSubCategory without subCategory" });
      }
    }

    const finalVariants = parsedVariants.map(variant => {
      const discount = variant.mrp && variant.sell_price
        ? Math.round(((variant.mrp - variant.sell_price) / variant.mrp) * 100)
        : 0;
      return { ...variant, discountValue: discount };
    });

    const newProduct = await Products.create({productName,description,productThumbnailUrl:image,productImageUrl:MultipleImage,

category: {_id: foundCategory._id, name: foundCategory.name},
subCategory:foundSubCategory? { _id: foundSubCategory._id, name: foundSubCategory.name }: null,
subSubCategory: foundSubSubCategory? { _id: foundSubSubCategory._id, name: foundSubSubCategory.name }: null,

      
      sku,ribbon,
      brand_Name:{_id: brands._id, name: brands.brandName},
      sold_by,type, location:productLocation ,online_visible,inventory,tax,feature_product,minQuantity,maxQuantity,fulfilled_by,variants:finalVariants,addVarient,selectVarientValue
    });
    console.log("✅ Product Added");
return res.status(200).json({message:"Product Added"})
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
    const {id,color,price,discount,brand,size,weight,ratings,bestSeller} = req.body;

    const filters = {};

    if (color) filters.color = color;

    if (price) {
      const [min, max] = price.split('-').map(Number);
      filters.price = {};
      if (!isNaN(min)) filters.price.$gte = min;
      if (!isNaN(max)) filters.price.$lte = max;
    }

    if (discount) filters.discount = { $gte: Number(discount) };

if (brand) {
  filters['brand_Name._id'] = new mongoose.Types.ObjectId(brand);
}

    if (size) filters.size = size;

    if (weight) {
      const [min, max] = weight.split('-').map(Number);
      filters.weight = {};
      if (!isNaN(min)) filters.weight.$gte = min;
      if (!isNaN(max)) filters.weight.$lte = max;
    }

    if (ratings) filters.ratings = { $gte: Number(ratings) };

    if (bestSeller !== undefined) filters.bestSeller = bestSeller === true || bestSeller === 'true';

    if (id) {
      filters.$or = [
        { 'category._id': id },
        { 'subCategory._id': id },
        { 'subSubCategory._id': id }
      ];
    }

    const products = await Products.find(filters);

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error while filtering products' });
  }
};

