const seller = require('../../modals/sellerModals/seller')

exports.addSeller = async (req,res) => {
    try {
        const {storeName,ownerName,mobileNumber,password,email,address,businessDetails,bankDetails,city,zone,storeLicense,gst,panCard,addressProof} = req.body

//     const rawImagePath = req.files?.image?.[0]?.key || "";
//     const image = rawImagePath ? `/${rawImagePath}` : ""; 
// const storeImages = req.files?.image?.

        const newSeller = await seller.create({storeName,ownerName,mobileNumber,password,email,address,businessDetails,bankDetails,storeImages,city,zone,storeLicense,gst,panCard,addressProof})
        
        return res.status(200).json({message:"Seller Created",newSeller})
    } catch (error) {
    console.error(error);
    return res.status(500).json({ResponseMsg: "An Error Occured"});
    }
}