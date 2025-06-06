const Category = require('../modals/category');
const Banner = require('../modals/banner');
const brand = require('../modals/brand')
const Products = require('../modals/Product')
const slugify = require('slugify');
const { ZoneData } = require('../modals/cityZone');
const { error } = require('zod/v4/locales/ar.js');
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
   let {title,type,city,zones,mainCategory,subCategory,subSubCategory,status,type2}=req.body
   const image = req.files.image?.[0].path;

   if (typeof zones === 'string') {
      try {
        zones = JSON.parse(zones);
      } catch (err) {
        console.error(err)
        return res.status(400).json({ message: 'Invalid zones format' });
      }
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

   const foundCategory = await Category.findOne({ _id: mainCategory })
      if (!foundCategory) return res.status(404).json({ message: `Category ${mainCategory} not found` });
  
   let foundSubCategory = null;
      let foundSubSubCategory = null;
  
      if (subCategory && subCategory.trim() !== "") {
        foundSubCategory = foundCategory.subcat.find(sub => sub._id.toString().toLowerCase() === subCategory.toLowerCase());

        
        if (!foundSubCategory){
         return res.status(404).json({ message: `SubCategory ${subCategory} not found` });
        }

        if (subSubCategory && subSubCategory.trim() !== "") {
        foundSubSubCategory = foundSubCategory.subsubcat.find(subsub => subsub._id.toString() === subSubCategory);

          if (!foundSubSubCategory) return res.status(404).json({ message: `SubSubCategory ${subSubCategory} not found` });
        }
      } else {
        if (subSubCategory && subSubCategory.trim() !== "") {
          return res.status(400).json({ message: "Cannot provide subSubCategory without subCategory" });
        }
      }
      const cityDoc = await ZoneData.findOne({_id:city});
      console.log(cityDoc);
    
 let slug = `/category/${foundCategory._id}`;
    if (foundSubCategory) slug += `/${foundSubCategory._id}`;
    if (foundSubSubCategory) slug += `/${foundSubSubCategory._id}`;

   const newBanner = await Banner.create({image,type2,
    city: { _id: cityDoc._id, name: cityDoc.city } ,title,type:bannerType,
    mainCategory:{_id:foundCategory._id,name:foundCategory.name,slug: slugify(foundCategory.name, { lower: true })},
    subCategory:foundSubCategory? { _id: foundSubCategory._id, name: foundSubCategory.name, slug: slugify(foundSubCategory.name, { lower: true }) }: null,
    subSubCategory: foundSubSubCategory? { _id: foundSubSubCategory._id, name: foundSubSubCategory.name,slug: slugify(foundSubSubCategory.name, { lower: true }) }: null,
    status,zones
  })
   return res.status(200).json({message:'Banner Added Successfully',newBanner})
} catch (error) {
  console.error(error);
    return res.status(500).json({message:'An Error Occured',error:error.message})
  }
}
exports.getBanner = async (req, res) => {
  try {
    const {type } = req.query;

    const filters = {status:true};

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

exports.updateBannerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status,title,city,zones,type2,address,latitude,longitude,mainCategory,subCategory,subSubCategory} = req.body;

 const image = req.files?.image?.[0].path

const cityDoc = await ZoneData.findById(city).lean();


    const updatedBanner = await Banner.updateOne(
      {_id:id},
      {$set:{ status,title,image,...(cityDoc?{city: { _id: cityDoc._id, name: cityDoc.city }}:{}),mainCategory,subCategory,type2,subSubCategory,'zones.$.address':address,'zones.$.latitude':latitude,'zones.$.longitude':longitude }}
    );
console.log(updatedBanner);

    if (updatedBanner.modifiedCount === 0) {
  return res.status(404).json({ message: 'No matching banner or zone found, or data unchanged.' });
}

    return res.status(200).json({ message: 'Banner status updated.', banner: updatedBanner });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error updating banner status.', error: err.message });
  }
};

exports.getAllBanner=async (req,res) => {
  const allBanner = await Banner.find()
  res.json(allBanner)
}


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
      // 1. Try to find as top-level category
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

      // 2. If not found as top-level, search sub and sub-sub categories
      const allCategories = await Category.find().lean();

      for (const category of allCategories) {
        for (const sub of category.subcat || []) {
          if (sub._id.toString() === id) {
            // Found as subcategory
            const formatted = {
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
            };
            return res.status(200).json({ subCategory: formatted });
          }

          for (const subsub of sub.subsubcat || []) {
            if (subsub._id.toString() === id) {
              // Found as sub-subcategory
              const formatted = {
                id: subsub._id,
                name: subsub.name,
                description: subsub.description,
                image: subsub.image
              };
              return res.status(200).json({ subSubCategory: formatted });
            }
          }
        }
      }

      return res.status(404).json({ message: "Category not found at any level" });
    }

    // If no id is provided, return full list
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

exports.getBrand = async (req, res) => {
  try {
    const { id } = req.query;

    if (id) {
      const b = await brand.findById(id);
      if (!b) return res.status(404).json({ message: "Brand not found" });

      const products = await Products.find({ 'brand_Name._id': b._id });

      return res.json({
        ...b.toObject(),
        products,
      });
    }

    const brands = await brand.find({});

    const brandsWithProducts = await Promise.all(
      brands.map(async (b) => {
        const products = await Products.find({ 'brand_Name._id': b._id });

        return {
          ...b.toObject(),
          products,
        };
      })
    );

    res.json(brandsWithProducts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred!", error: error.message });
  }
};

exports.editBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { brandName, description } = req.body;

const image = req.files.image?.[0].path    

    const edit = await brand.updateOne(  { _id: id }, {brandName, description, brandLogo:image}, { new: true });

    return res.status(200).json({ message: "Done", edit });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred!", error: error.message });
  }
};


exports.editCat = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const mainCat = await Category.findOne({
      $or: [
        { _id: id },
        { "subcat._id": id },
        { "subcat.subsubcat._id": id }
      ]
    });

    if (!mainCat) {
      return res.status(404).json({ message: "Category not found" });
    }

    let updated = false;

    if (mainCat._id.toString() === id) {
      mainCat.status = status;
      updated = true;
    } else {
      for (let sub of mainCat.subcat) {
        if (sub._id.toString() === id) {
          sub.status = status;
          updated = true;
          break;
        }

        for (let subsub of sub.subsubcat || []) {
          if (subsub._id.toString() === id) {
            subsub.status = status;
            updated = true;
            break;
          }
        }

        if (updated) break;
      }
    }

    if (updated) {
      await mainCat.save();
      return res.status(200).json({ message: "Category status updated successfully" });
    } else {
      return res.status(404).json({ message: "ID not found in any level" });
    }
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ message: "An error occurred", error: error.message });
  }
};

exports.updateAt = async (req,res) => {
  try {
    const {id} = req.params
  const {attribute} = req.body
  const attrArray = Array.isArray(attribute) ? attribute : [attribute];

const newUpdate = await Category.findByIdAndUpdate(
  id,
  { $addToSet: { attribute: { $each: attrArray } } },
  { new: true }
);
  return res.status(200).json({ message: "Category status updated successfully",newUpdate });
  } catch (error) {
     console.error("Update error:", error);
    return res.status(500).json({ message: "An error occurred", error: error.message }); 
  }
}

// if (req.file && req.file.path) {
//       updateData.image = req.file.path;
//     }
