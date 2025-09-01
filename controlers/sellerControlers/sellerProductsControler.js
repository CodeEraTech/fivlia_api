const Products = require('../../modals/sellerModals/sellerProduct')
const seller = require('../../modals/store')
const mongoose = require('mongoose');
const axios = require('axios');
const Product = require('../../modals/Product');

exports.addSellerProduct=async(req,res) => {
    try{
        const {id} = req.params
     const {name,price,stock,approvalStatus,category,status}=req.body
     const image = `${req.files.image?.[0].key}`
     const newProduct = await Products.create({image,name,price,stock,approvalStatus,category,status,sellerId:id})
     return res.status(200).json({message:"Product request send to admin",newProduct})
    }catch(error){
     console.error(error);
     return res.status(500).json({ResponseMsg: "An Error Occured"});
    }
}

exports.editSellerProduct = async(req,res)=>{
  try{
    const {id} = req.params
const {name,price,stock,rating,approvalStatus,category,status}=req.body

 const updateData = { name, price, stock, rating, approvalStatus, category, status };

    // Add image only if provided
    if (req.files?.image?.[0]?.key) {
      updateData.image = req.files.image[0].key;
    }

const editProduct = await Products.findByIdAndUpdate(id,updateData)
return res.status(200).json({message:"Product Updated",editProduct})
  }catch(error){
   console.error(error);
   return res.status(500).json({ResponseMsg: "An Error Occured"});
  }
}

exports.deleteSellerProduct = async(req,res)=>{
  try{
    const {id} = req.params

const deleteProduct = await Products.findByIdAndDelete(id)
return res.status(200).json({message:"Product Deleted",deleteProduct})
  }catch(error){
   console.error(error);
   return res.status(500).json({ResponseMsg: "An Error Occured"});
  }
}

exports.updateSellerStock = async(req,res)=>{
  try{
    const {id} = req.params
    const {stock} = req.body
const updateStock = await Products.findByIdAndUpdate(id,{stock})
return res.status(200).json({message:"Stock Updated",updateStock})
  }catch(error){
   console.error(error);
   return res.status(500).json({ResponseMsg: "An Error Occured"});
  }
}

exports.addCategoryInSeller=async (req,res) => {
    try {
      const {id}=req.params
    const {Category}=req.body
    const CategoryId = await seller.findByIdAndUpdate(id, { $addToSet: { Category: Category } },{new:true})

     return res.status(200).json({message:"Category Updated", CategoryId})   
    } catch (error) {
      console.error(error);
      return res.status(500).json({message:"An error occured"})   
    }
}

exports.getDetailsGst = async (req, res) => {
  try {
    const { gst } = req.query; // Expect GST number in query param: /api/gst?gst=XXXX
    if (!gst) {
      return res.status(400).json({ message: "GST number is required" });
    }

    const API_KEY = "9205753778-gst-lil2";
    const url = `https://rappid.in/apis/gst.php?key=${API_KEY}&gst=${gst}`;

    // Make the API request
    const response = await axios.get(url);

    // Return the API response to client
    return res.status(200).json({
      success: true,
      gstDetails: response.data,
    });

  } catch (error) {
    console.error("Error fetching GST details:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch GST details",
      error: error.message,
    });
  }
};

exports.getCategoryProduct = async (req, res) => {
  try {
    let { categories, subCategories, subsubCategories } = req.query;

    // Split IDs from query params
    categories = categories ? categories.split('%') : [];
    subCategories = subCategories ? subCategories.split('%') : [];
    subsubCategories = subsubCategories ? subsubCategories.split('%') : [];

    // Helper to convert to ObjectIds
    const toObjectIdArray = (ids) =>
      ids
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    const categoryIds = toObjectIdArray(categories);
    const subCategoryIds = toObjectIdArray(subCategories);
    const subsubCategoryIds = toObjectIdArray(subsubCategories);

    // Build query
    const query = {
      $or: [
        { "category._id": { $in: categoryIds } },
        { "subCategory._id": { $in: subCategoryIds } },
        { "subSubCategory._id": { $in: subsubCategoryIds } }
      ]
    };

    const products = await Product.find(query).lean();

    res.status(200).json({ message: 'Products fetched successfully', products });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred", error: error.message });
  }
};


