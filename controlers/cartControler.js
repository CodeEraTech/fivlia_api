const {Cart,Discount} = require('../modals/cart');

exports.addCart=async (req,res) => {
  try {
  const{name,quantity,price}=req.body
  const image = req.files.image?.[0].path
  const items = await Cart.create({image,name,quantity,price})
  return res.status(200).json({ message: 'Item Added To Database', items });
} catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occured!", error: error.message });
  }
}

exports.getCart=async (req,res) => {
  try {
    const items = await Cart.find()
    return res.status(200).json({ message: 'Cart Items:', items });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occured!", error: error.message });
  }
}
exports.discount=async (req,res) => {
  try {
 const{description,value,head}=req.body
  const newDiscount=await Discount.create({description,value,head})
   return res.status(200).json({ message: 'New Discount:', newDiscount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occured!", error: error.message });
  }
}
exports.getDicount=async (req,res) => {
  try {
  const discount = await Discount.find()
  return res.status(200).json({ message: 'New Discounts:', discount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occured!", error: error.message });
  }
}
exports.quantity=async (req,res) => {
    try {
    const{id}=req.params
    const {quantity}=req.body

const updated_cart=await Cart.findByIdAndUpdate(  id,{ quantity },{ new: true })

  return res.status(200).json({ message: 'New Quantity:', updated_cart });
} catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occured!", error: error.message });   
    }
}

exports.deleteCart=async (req,res) => {
    try {
    const{id}=req.params
    const cart = await Cart.findByIdAndDelete(id)

    return res.status(200).json({ message: 'Cart Item Removed:', cart });
    } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occured!", error: error.message });   
    }
}