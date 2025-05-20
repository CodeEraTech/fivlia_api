const Products = require('../modals/Product');
const Attribute = require('../modals/attribute');

exports.addAtribute=async (req,res) => {
    try {
    const {name}=req.body
    const newAttribute = await Attribute.create({name})
     return res.json(200).json({message:"Attribute Created",newAttribute})   
    } catch (error) {
      console.error(error);
      return res.json(500).json({message:"An error occured"})   
    }
}
exports.getAttributes=async (req,res) => {
  try {
  const Attributes=await Attribute.find()
  res.json(Attributes)
} catch (error) {
  console.error(error);
  return res.json(500).json({message:"An error occured"})   
  }
}

exports.addProduct = async (req, res) => {
  try {
    const{productName,description,category,subCategory,subSubCategory,sku,ribbon,brand_Name,sold_by,type,location,online_visible,inventory,tax,feature_product,fulfilled_by,variants
    } = req.body;

const image = req.files.image?.[0].path
const parsedVariants = JSON.parse(variants); // coming as string from frontend/Postman
    const finalVariants = parsedVariants.map(variant => {
      const discount = variant.mrp && variant.sell_price
        ? Math.round(((variant.mrp - variant.sell_price) / variant.mrp) * 100)
        : 0;
      return { ...variant, discountValue: discount };
    });

    const newProduct = await Products.create({productName,description,productImageUrl:image,category,subCategory,subSubCategory,sku,ribbon,brand_Name,sold_by,type,location,online_visible,inventory,tax,feature_product,fulfilled_by,variants:finalVariants,
    });

    console.log("✅ Product Added");

  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "An error occured!", error: error.message });
  }
};

exports.getProduct=async (req,res) => {
  try {
  const product=await Products.find()
   return res.status(200).json({ message: 'Product fetched successfully.', product });
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

// if(subCategory && !category){
//   return res.status(400).json({ message: `Please provide parent category not found` });
// }

// if(subSubCategory && !subCategory){
//   return res.status(400).json({ message: `Please provide parent category not found` });
// }
//     const mainCategory = await Category.findOne({ CategoryHeading: category,Selection:
// "Main"});
//     console.log("subCategory type:", typeof mainCategory.subCategory);
// console.log("subCategory value:", mainCategory.subCategory);
//     if (!mainCategory) {
//       return res.status(404).json({ message: `${category} category not found` });
//     }

//     if (subSubCategory && subCategory) {
//       const subCat = mainCategory.subCategory.get(subCategory);
//       if (!subCat) {
//         return res.status(404).json({ message: `${subCategory} sub-category not found` });
//       }

//       const subSubCat = subCat.subSubCategory?.get(subSubCategory);
//       if (!subSubCat) {
//         return res.status(404).json({ message: `${subSubCategory} sub-sub-category not found` });
//       }

//       subSubCat.Products.push(newProduct._id);
//       subCat.subSubCategory.set(subSubCategory, subSubCat);
//       mainCategory.subCategory.set(subCategory, subCat);
//     }

//     else if (subCategory) {
//       const subCat = mainCategory.subCategory.get(subCategory);
//       if (!subCat) {
//         return res.status(404).json({ message: `${subCategory} sub-category not found` });
//       }

//       subCat.Products.push(newProduct._id);
//       mainCategory.subCategory.set(subCategory, subCat);
//     }

//     else {
//       mainCategory.Products.push(newProduct._id);
//     }

//     await mainCategory.save();

//     return res.status(200).json({ message: "✅ Product added and categorized successfully." });
