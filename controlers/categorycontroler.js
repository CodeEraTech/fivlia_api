const Category = require('../modals/category');
const Banner = require('../modals/banner');
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
   const {bannerId, title,type}=req.body
   const image = req.files.image?.[0].path;

  if (!bannerId || !title || !image) {
    console.log('banner=>',bannerId,'title=>',title,'image=>',image);
    
      return res.status(400).json({ message: 'All Fields are required.' });
    }

    const validTypes = ['normal', 'offer'];
    const bannerType = validTypes.includes(type) ? type : 'normal';

    if (!bannerType) {
      return res.status(400).json({ message: 'Invalid banner type. Must be "normal" or "offer".' });
    }

    const existingBanner = await Banner.findOne({ bannerId });
    if (existingBanner) {
      return res.status(409).json({ message: 'Banner with this ID already exists.' });
    }

   const newBanner = await Banner.create({bannerId,image,title,type:bannerType})
   return res.status(200).json({message:'Banner Added Succesfully',newBanner})
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
    const {Selection,CategoryHeading,ItemsNo,id,MainCategory,SubCategory,} = req.body;

    const image = req.files?.image?.[0]?.path;

    if (!Selection || !CategoryHeading) {
      return res.status(400).json({ message: "Selection and CategoryHeading are required!" });
    }

      if (!image || !ItemsNo || !id) {
        return res.status(400).json({ message: "For Main category, image, ItemsNo, and id are required." });
      }
 if (Selection === "Main") {
      const existingMain = await Category.findOne({ CategoryHeading });
      if (existingMain) {
        return res.status(400).json({ message: "Main category already exists." });
      }

      const newCategory = new Category({image,CategoryHeading,ItemsNo,id,Selection});

      await newCategory.save();
      return res.status(200).json({ message: "Main category added successfully!" });
    }

    if (Selection === "Sub") {
      if (!MainCategory) {
        return res.status(400).json({ message: "MainCategory is required for Sub category." });
      }

      const mainDoc = await Category.findOne({ CategoryHeading: MainCategory, Selection: "Main" });
      if (!mainDoc) {
        return res.status(404).json({ message: "Main category not found." });
      }

      if (!mainDoc.subCategory) {
        mainDoc.subCategory = new Map();
      }

      if (mainDoc.subCategory.has(CategoryHeading)) {
        return res.status(400).json({ message: "Sub category already exists under this main category." });
      }

      mainDoc.subCategory.set(CategoryHeading, new Map());
      await mainDoc.save();
      return res.status(200).json({ message: "Sub category added successfully!" });
    }

   if (Selection === "Sub-Sub") {
  if (!SubCategory) {
    return res.status(400).json({ message: "SubCategory is required for Sub-Sub category." });
  }

  const mainDoc = await Category.findOne({ [`subCategory.${SubCategory}`]: { $exists: true }, Selection: "Main"});
  if (!mainDoc) return res.status(404).json({ message: "Main category not found." });

  // Get the subCategory object for the SubCategory key
  const subCatObj = mainDoc.subCategory.get(SubCategory);

  if (!subCatObj) {
    return res.status(404).json({ message: "Sub category not found under main category." });
  }

  // Initialize subSubCategory object if not present
  if (!subCatObj.subSubCategory) {
    subCatObj.subSubCategory = {};
  }

  if (subCatObj.subSubCategory[CategoryHeading]) {
    return res.status(400).json({ message: "Sub-Sub category already exists." });
  }

  // Add new Sub-Sub category as empty array for products
  subCatObj.subSubCategory[CategoryHeading] = [];

  // Update the subCategory map with updated subCatObj
  mainDoc.subCategory.set(SubCategory, subCatObj);

  // Mark subCategory as modified so Mongoose saves changes
  mainDoc.markModified('subCategory');

  await mainDoc.save();

  return res.status(200).json({ message: "Sub-Sub category added successfully!" });
}


    return res.status(400).json({ message: "Invalid Selection value." });

  } catch (err) {
    return res.status(500).json({ message: "Server error!", error: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const mainCategories = await Category.find({ Selection: "Main" });

    const formattedCategories = mainCategories.map((main) => {
      const subCategories = [];

      // Convert Map to object and loop
      if (main.subCategory instanceof Map) {
        for (const [subCatName, subCatValue] of main.subCategory.entries()) {
          const subSubCategories = [];

          if (subCatValue?.subSubCategory) {
            for (const [subSubName, products] of Object.entries(subCatValue.subSubCategory)) {
              subSubCategories.push({
                name: subSubName,
                products: products || []
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






// if (req.file && req.file.path) {
//       updateData.image = req.file.path;
//     }
