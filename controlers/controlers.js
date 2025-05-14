const Category = require('../modals/category');
const Intro = require('../modals/intro')
const Banner =require('../modals/banner');
exports.addSub=async (req,res) => {
    try {
    const{name,price,size,discount,category,city,zone}=req.body
    const image = req.file.path;
    const newItem =await Category.create({name,price,size,discount,category,image,city,zone})
    return res.status(200).json({message:'Product Added Sucessfully',data:newItem})
    } catch (error) {
        console.error(error);
        return res.status(500).json({message:'An Error Occured'})
    }
}


exports.intro=async (req,res) => {
    try{
        const{title,description}=req.body
     const image = req.file.path;
     const newItem =await Intro.create({title,description,image})
    return res.status(200).json({message:'intro Added Sucessfully',data:newItem})
    } catch (error) {
        console.error('error=>',error);
        return res.status(500).json({message:'An Error Occured'})
    }
}
exports.getIntro=async (req,res) => {
    try {
        const intro =await Intro.find()
        return res.json(intro)
    } catch (error) {
           console.error(error);
        return res.status(500).json({message:'An Error Occured'})
    }
}


exports.banner=async (req,res) => {
    try{
    const{title,description,location}=req.body
const image = req.file.path
const newBanner=await Banner.create({title,description,location,image})
 return res.status(200).json({message:'Banner Added Succesfully'})
 } catch (error) {
           console.error(error);
        return res.status(500).json({message:'An Error Occured'})
    }
}

exports.getBanner=async (req,res) => {
     try {
    const{location}=req.query

    const filters ={}
    if(location){
        filters.location={$regex:location,$options:'i'}
    }

        const data = await Banner.find(filters)
        res.json(data)
    } catch (error) {
        console.error(error);
        return res.status(500).json({message:'An Error Occured'}) 
    }
}