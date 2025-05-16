const Category = require('../modals/category');
const Banner = require('../modals/banner');
exports.update = async (req, res) => {
  try {
    const { name, description, subcat } = req.body;

    let updateData = {};

    if (name) updateData.name = name;
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
   const {bannerId, title}=req.body
   const image = req.file.path;
   const newBanner = await Banner.create({bannerId,image,title})
   return res.status(200).json({message:'Course Added Succesfully',newBanner})
} catch (error) {
  console.error(error);
  
    return res.status(500).json({message:'An Error Occured'})
  }
}
exports.getBanner=async (req,res) => {
     try {
    const{bannerId}=req.query

    const filters ={}
    if(bannerId){
        filters.bannerId={$regex:bannerId,$options:'i'}
    }

        const data = await Banner.find(filters)
        res.json(data)
    } catch (error) {
        console.error(error);
        return res.status(500).json({message:'An Error Occured'}) 
    }
}
// if (req.file && req.file.path) {
//       updateData.image = req.file.path;
//     }
