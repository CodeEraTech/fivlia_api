const Intro = require('../modals/intro')

exports.intro=async (req,res) => {
    try{
        const{title,description}=req.body
 const rawImagePath = req.files?.image?.[0]?.key || "";
    const image = rawImagePath ? `/${rawImagePath}` : "";
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

exports.getEvent = async (req, res) =>{
    try{
    const {lat,long} = req.body
    return res.status(200).json({eventStatus:true,eventDetails:{fontColor:"0xFF575454",eventTitle:"Happy Navratri",eventImage:"/image/1758628917707-image.jpg"}})
    }catch(error){
        console.error(error);
        return res.status(500).json({message:'An Error Occured'})
    }
}