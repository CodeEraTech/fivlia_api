const Category = require('../modals/category');
const Banner = require('../modals/banner');
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
   const {title,type,zone,mainCategory,subCategory,subSubCategory,status}=req.body
   const image = req.files.image?.[0].path;

  if (!bannerId || !title || !image || !status) {
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

   const newBanner = await Banner.create({bannerId,image,title,type:bannerType,mainCategory,subCategory,subSubCategory,status,zone})
   return res.status(200).json({message:'Banner Added Successfully',newBanner})
} catch (error) {
  console.error(error);
  
    return res.status(500).json({message:'An Error Occured'})
  }
}
exports.getBanner = async (req, res) => {
  try {
    const {type } = req.query;

    const filters = {status:'Active'};

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
    const { id } = req.query;

    if (id) {
      // Try to find as top-level category
      const singleCategory = await Category.findById(id).lean();

      if (singleCategory) {
        const formatted = {
          id: singleCategory._id,
          name: singleCategory.name,
          description: singleCategory.description,
          image: singleCategory.image,
          subCategories: (singleCategory.subcat || []).map(sub => ({
            id: sub._id,
            name: sub.name,
            description: sub.description,
            image: sub.image,
            subSubCategories: (sub.subsubcat || []).map(subsub => ({
              id: subsub._id,
              name: subsub.name,
              description: subsub.description,
              image: subsub.image
            }))
          }))
        };

        return res.status(200).json({ category: formatted });
      }

      const allCategories = await Category.find().lean();

      for (const category of allCategories) {
        const subCategory = (category.subcat || []).find(
          sub => sub._id.toString() === id
        );

        if (subCategory) {
          const formatted = {
            id: subCategory._id,
            name: subCategory.name,
            description: subCategory.description,
            image: subCategory.image,
            subSubCategories: (subCategory.subsubcat || []).map(subsub => ({
              id: subsub._id,
              name: subsub.name,
              description: subsub.description,
              image: subsub.image
            }))
          };

          return res.status(200).json({ subCategory: formatted });
        }
      }

      return res.status(404).json({ message: "Category or sub-category not found" });
    }

    const allCategories = await Category.find().lean();

    const formatted = allCategories.map(cat => ({
      id: cat._id,
      name: cat.name,
      description: cat.description,
      image: cat.image,
      subCategories: (cat.subcat || []).map(sub => ({
        id: sub._id,
        name: sub.name,
        description: sub.description,
        image: sub.image,
        subSubCategories: (sub.subsubcat || []).map(subsub => ({
          id: subsub._id,
          name: subsub.name,
          description: subsub.description,
          image: subsub.image
        }))
      }))
    }));

    return res.status(200).json({ categories: formatted });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
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

