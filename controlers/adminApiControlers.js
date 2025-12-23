const Franchise = require("../modals/franchise");

exports.getFrenchise = async (req, res) => {
  try{
    const franchise =  await Franchise.find()

    return res.status(200).json(franchise)
  }catch(error){
    console.error(error)
    return res.status(500).json({message: "Server error"})
  }
}