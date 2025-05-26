const mongoose = require('mongoose');
const Products = require('../modals/Product');
const Attribute = require('../modals/attribute');
const Category = require('../modals/category');
const Unit = require('../modals/unit');
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

    const newProduct = await Products.create({productName,description,productThumbnailUrl:image,productImageUrl:MultipleImage,category:{id:foundCategory._id,name:foundCategory.name},

      subCategory:foundSubCategory?{id:foundSubCategory._id,name:foundSubCategory.name}:null,

      subSubCategory:foundSubSubCategory?{id:foundSubSubCategory._id,name:foundSubSubCategory.name}:null,
      sku,ribbon,brand_Name,sold_by,type,location,online_visible,inventory,tax,feature_product,minQuantity,maxQuantity,fulfilled_by,variants:finalVariants,addVarient,selectVarientValue
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
    const { category, subCategory, subSubCategory } = req.query;

    const filters = [];

    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filters.push({ 'category._id': category });
      } else {
        filters.push({ 'category.name': { $regex: category, $options: 'i' } });
      }
    }

    if (subCategory) {
      if (mongoose.Types.ObjectId.isValid(subCategory)) {
        filters.push({ 'subCategory._id': subCategory });
      } else {
        filters.push({ 'subCategory.name': { $regex: subCategory, $options: 'i' } });
      }
    }

    if (subSubCategory) {
      if (mongoose.Types.ObjectId.isValid(subSubCategory)) {
        filters.push({ 'subSubCategory._id': subSubCategory });
      } else {
        filters.push({ 'subSubCategory.name': { $regex: subSubCategory, $options: 'i' } });
      }
    }

    const query = filters.length > 0 ? { $and: filters } : {};

    const products = await Products.find(query);

    if (!products.length) {
      return res.status(404).json({ message: 'No products found.' });
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