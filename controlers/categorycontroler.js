const Category = require('../modals/category');
const Banner = require('../modals/banner');
const Products = require('../modals/Product');
const brand = require('../modals/brand')
exports.update = async (req, res) => {
  try {
    const { name, description, subcat } = req.body;

    let updateData = {};

    if (name) updateData.name = nameJ;
    if (description) updateData.description = description;
    if (subcat) updateData.subcat = JSON.parse(subcat); 

      if (req.files?.file?.[0]?.path) {
      updateData.file = req.files.file[0].path;
      }
console.log("req.files:", req.files);
    const updatedCategory = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
console.log("updateData:", updatedCategory);

    return res.json(updatedCategory);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while updating the category' });
  }
};

exports.banner = async (req,res) => {
  try {  
   const {bannerId, title,type,zone,mainCategory,subCategory,subSubCategory}=req.body
   const image = req.files.image?.[0].path;

  if (!bannerId || !title || !image) {
    console.log('banner=>',bannerId,'title=>',title,'image=>',image);
    
      return res.status(400).json({ message: 'All Fields are required.' });
    }

    const validTypes = ['normal', 'offer'];
    const bannerType = validTypes.includes(type) ? type : 'normal';

if(subCategory && !mainCategory){
    return res.status(401).json({ message: 'Please select parent category' });
}
if(subSubCategory && !subCategory){
    return res.status(401).json({ message: 'Please select parent category' });
}

    if (!bannerType) {
      return res.status(402).json({ message: 'Invalid banner type. Must be "normal" or "offer".' });
    }
    const existingBanner = await Banner.findOne({ bannerId });
    if (existingBanner) {
      return res.status(409).json({ message: 'Banner with this ID already exists.' });
    }

   const newBanner = await Banner.create({bannerId,image,title,type:bannerType,mainCategory,subCategory,subSubCategory})
   return res.status(200).json({message:'Banner Added Successfully',newBanner})
} catch (error) {
  console.error(error);
  
    return res.status(500).json({message:'An Error Occured'})
  }
}
exports.getBanner = async (req, res) => {
  try {
    const {type } = req.query;

    const filters = {};

    // if (bannerId) {
    //   filters.bannerId = { $regex: bannerId, $options: 'i' };
    // }

    if (type) {
      const validTypes = ['offer', 'normal'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: 'Invalid banner type. Must be "offer" or "normal".' });
      }
      filters.type = type;
    }

    const data = await Banner.find(filters);

    if (data.length === 0) {
      return res.status(404).json({ message: 'No banners found matching the criteria.' });
    }

    return res.status(200).json({ message: 'Banners fetched successfully.', count: data.length, data });
    
  } catch (error) {
    console.error('Error fetching banners:', error.message);
    return res.status(500).json({ message: 'An error occurred while fetching banners.', error: error.message });
  }
};


exports.addCategory = async (req, res) => {
  try {
    const {
      id,
      CategoryHeading,
      Selection,
      ItemsNo,
      MainCategory,
      SubCategory,
      Products = []
    } = req.body;

    const image = req.files.image?.[0].path
    if (!image) return res.status(400).json({ error: "Image is required" });

    const categoryData = {
      id: Number(id),
      CategoryHeading,
      Selection,
      image,
      ItemsNo: Number(ItemsNo),
      Products: []
    };

    if (Selection === "Main") {
      const newMain = new Category({
        ...categoryData,
        subCategory: new Map()
      });
      await newMain.save();
  
      return res.status(201).json({ message: "Main category saved", data: newMain });
    }

    if (Selection === "Sub") {
      const mainCategory = await Category.findOne({ CategoryHeading: MainCategory, Selection: "Main" });
      if (!mainCategory) return res.status(404).json({ error: "Main Category not found" });

      mainCategory.subCategory.set(CategoryHeading, {
        ...categoryData,
        subSubCategory: new Map()
      });

      await mainCategory.save();
      return res.status(201).json({ message: "Sub category added", data: mainCategory.subCategory.get(CategoryHeading) });
    }

     if (Selection === "Sub-Sub") {
      const allMainCats = await Category.find({ Selection: "Main" });

      let subInserted = false;

      for (const mainCat of allMainCats) {
        if (mainCat.subCategory && mainCat.subCategory.has(SubCategory)) {
          const subCat = mainCat.subCategory.get(SubCategory);
          if (!subCat.subSubCategory) subCat.subSubCategory = new Map();

          subCat.subSubCategory.set(CategoryHeading, categoryData);
          mainCat.subCategory.set(SubCategory, subCat);

          await mainCat.save();
          subInserted = true;

          return res.status(201).json({
            message: "Sub-Sub category added",
            data: subCat.subSubCategory.get(CategoryHeading)
          });
        }
      }

      if (!subInserted) {
        return res.status(404).json({ error: "Sub category not found under any Main Category" });
      }
    }

    return res.status(400).json({ error: "Invalid Selection value" });

  } catch (err) {
    console.error("Add Category Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};



exports.getCategories = async (req, res) => {
  try {
    const mainCategories = await Category.find({ Selection: "Main" }).lean();

    const formattedCategories = mainCategories.map((main) => {
      const subCategories = [];

      if (main.subCategory && typeof main.subCategory === 'object') {
        for (const [subCatName, subCatValue] of Object.entries(main.subCategory)) {
          const subSubCategories = [];

          if (subCatValue?.subSubCategory && typeof subCatValue.subSubCategory === 'object') {
            for (const [subSubName, products] of Object.entries(subCatValue.subSubCategory)) {
              // Ensure "products" is an array
              subSubCategories.push({
                name: subSubName,
                products: Array.isArray(products) ? products : []
              });
            }
          }

          subCategories.push({
            name: subCatName,
            subSubCategories
          });
        }
      }

      return {
        id: main.id,
        heading: main.CategoryHeading,
        itemsNo: main.ItemsNo,
        image: main.image,
        subCategories
      };
    });

    return res.status(200).json({ categories: formattedCategories });

  } catch (err) {
    return res.status(500).json({ message: "Server error!", error: err.message });
  }
};
exports.addProduct = async (req, res) => {
  try {
    const{productName,description,category,subCategory,subSubCategory,sku,ribbon,mrp,brand_Name,sold_by,type,size,color,location,online_visible,discountMode,inventory,discountValue,
    } = req.body;

const image = req.files.image?.[0].path

    const newProduct = await Products.create({productName,description,productImage:image,category,subCategory,subSubCategory,sku,ribbon,mrp,brand_Name,sold_by,type,size,color,location,online_visible,discountMode,inventory,discountValue,
    });

    console.log("✅ Product Added");

if(subCategory && !category){
  return res.status(400).json({ message: `Please provide parent category not found` });
}

if(subSubCategory && !subCategory){
  return res.status(400).json({ message: `Please provide parent category not found` });
}
    const mainCategory = await Category.findOne({ name: category });
    if (!mainCategory) {
      return res.status(404).json({ message: `${category} category not found` });
    }

    if (subSubCategory && subCategory) {
      const subCat = mainCategory.subCategory.get(subCategory);
      if (!subCat) {
        return res.status(404).json({ message: `${subCategory} sub-category not found` });
      }

      const subSubCat = subCat.subSubCategory?.get(subSubCategory);
      if (!subSubCat) {
        return res.status(404).json({ message: `${subSubCategory} sub-sub-category not found` });
      }

      subSubCat.Products.push(newProduct._id);
      subCat.subSubCategory.set(subSubCategory, subSubCat);
      mainCategory.subCategory.set(subCategory, subCat);
    }

    else if (subCategory) {
      const subCat = mainCategory.subCategory.get(subCategory);
      if (!subCat) {
        return res.status(404).json({ message: `${subCategory} sub-category not found` });
      }

      subCat.Products.push(newProduct._id);
      mainCategory.subCategory.set(subCategory, subCat);
    }

    else {
      mainCategory.Products.push(newProduct._id);
    }

    await mainCategory.save();

    return res.status(200).json({ message: "✅ Product added and categorized successfully." });

  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "An error occured!", error: error.message });
  }
};

exports.brand = async (req,res) => {
  try {
  const{brandName,description}=req.body
  const image=req.files.image?.[0].path
    if (!image) {
      console.log(image);
      
      return res.status(400).json({ message: "Image is required" });
    }
  const newBrand = await brand.create({brandName,brandLogo:image,description})
    return res.status(200).json({ message: "sucess",newBrand});
    } catch (error) {
    console.error(error);
  return res.status(500).json({ message: "An error occured!", error: error.message });
    }
}

exports.getBrand = async (req,res) => {
  try {
 const brands = await brand.find({})
    res.json(brands)
    } catch (error) {
    console.error(error);
  return res.status(500).json({ message: "An error occured!", error: error.message });
    }
}


// if (req.file && req.file.path) {
//       updateData.image = req.file.path;
//     }
