const Intro = require('../modals/intro')

exports.intro=async (req,res) => {
    try{
        const{title,description}=req.body
const imageFile = req.files?.image?.[0]; 
    const imageUrl = imageFile?.path;
     const newItem =await Intro.create({title,description,image:imageUrl})
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