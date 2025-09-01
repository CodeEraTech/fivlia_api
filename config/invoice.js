const { PutObjectCommand } = require('@aws-sdk/client-s3');
const PDFDocument = require('pdfkit');
const path = require('path');
const s3 = require('./aws'); // AWS S3 setup
const { v4: uuidv4 } = require('uuid');
const {SettingAdmin} = require('../modals/setting')
const {Order} = require('../modals/order');
const User = require("../modals/User");
const Product = require("../modals/Product"); // Add this line
const request = require('request'); // for msggo.in

// Generate PDF Thermal Invoice and upload to AWS
exports.generateThermalInvoice = async (orderId) => {
  try {
    const order = await Order.findOne({ orderId }).populate('addressId').populate('items.productId');
    if (!order) throw new Error('Order not found');

    const user = order.addressId;
    const store = await require('../modals/store').findById(order.storeId);
    
    // Calculate totals
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const gstTotal = order.items.reduce((sum, item) => {
      const gstRate = parseFloat(item.gst || 0);
      return sum + ((item.price * item.quantity * gstRate) / 100);
    }, 0);
    
    // Generate PDF invoice
    const pdfBuffer = await generatePDFInvoice(order, user, store, subtotal, gstTotal);
    
    // Upload to AWS S3
    const fileName = `thermal-invoices/thermal_invoice_${orderId}_${uuidv4()}.pdf`;
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    };

    await s3.send(new PutObjectCommand(uploadParams));
    
    // Generate the URL
    const pdfUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    
    // Save PDF URL to database
    await Order.findOneAndUpdate(
      { orderId },
      { $set: { thermalInvoice: pdfUrl } }
    );

    console.log('Thermal invoice PDF generated and uploaded for order:', orderId);
    return pdfUrl;

  } catch (err) {
    console.error('Thermal invoice generation error:', err);
    throw err;
  }
};

// Generate PDF invoice
async function generatePDFInvoice(order, user, store, subtotal, gstTotal) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [226, 800], // Thermal printer width (80mm = 226pt) with fixed height
        margins: {
          top: 20,
          bottom: 20,
          left: 10,
          right: 10
        }
      });

      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc.fontSize(16).font('Helvetica-Bold').text('FIVLIA', { align: 'center' });
      doc.fontSize(12).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
      doc.moveDown(0.5);
      
      // Line separator
      doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
      doc.moveDown(0.5);

      // Store Info
      doc.fontSize(8).font('Helvetica');
      if (store) {
        doc.text(`Sold By: ${store.storeName || 'FIVLIA'}`);
        doc.text(`Address: ${store.address || 'NA'}`);
      } else {
        doc.text('Store: FIVLIA');
        doc.text('Address: Your Store Address');
      }
      doc.text('Phone: +91-XXXXXXXXXX');
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`);
      doc.text(`Time: ${new Date().toLocaleTimeString('en-IN')}`);
      doc.text(`Order ID: ${order.orderId}`);
      doc.moveDown(0.5);

      // Line separator
      doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
      doc.moveDown(0.5);

      // Customer Info
      doc.fontSize(9).font('Helvetica-Bold').text('CUSTOMER DETAILS:');
      doc.fontSize(8).font('Helvetica');
      doc.text(`Name: ${user.fullName || 'N/A'}`);
      doc.text(`Mobile: ${user.mobileNumber || user.alternateNumber || 'N/A'}`);
      doc.text(`Email: ${user.email || 'N/A'}`);
      doc.moveDown(0.5);

      // Line separator
      doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
      doc.moveDown(0.5);

      // Items Header
      doc.fontSize(9).font('Helvetica-Bold').text('ITEMS:');
      doc.fontSize(7).font('Helvetica');
      
      // Items table header
      const itemHeader = 'Name'.padEnd(25) + 'Qty'.padStart(5) + 'Price'.padStart(15);
      doc.text(itemHeader);
      doc.moveDown(0.3);

      // Line separator
      doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
      doc.moveDown(0.3);

      // Items
      order.items.forEach(item => {
        const itemName = (item.name || 'Product').substring(0, 23);
        const quantity = item.quantity.toString();
        const price = (item.price * item.quantity).toFixed(2);
        
        const itemLine = itemName.padEnd(25) + quantity.padStart(5) + price.padStart(15);
        doc.text(itemLine);
        
        if (item.gst) {
          doc.fontSize(6).text(`  GST: ${item.gst}`);
        }
        doc.moveDown(0.2);
      });

      doc.moveDown(0.3);
      // Line separator
      doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
      doc.moveDown(0.3);

      // Totals
      doc.fontSize(8).font('Helvetica');
      const subtotalLine = 'Subtotal:'.padEnd(30) + subtotal.toFixed(2).padStart(15);
      doc.text(subtotalLine);
      
      if (gstTotal > 0) {
        const gstLine = 'GST:'.padEnd(30) + gstTotal.toFixed(2).padStart(15);
        doc.text(gstLine);
      }
      
      if (order.deliveryCharges > 0) {
        const deliveryLine = 'Delivery:'.padEnd(30) + order.deliveryCharges.toFixed(2).padStart(15);
        doc.text(deliveryLine);
      }
      
      if (order.platformFee > 0) {
        const platformLine = 'Platform Fee:'.padEnd(30) + order.platformFee.toFixed(2).padStart(15);
        doc.text(platformLine);
      }

      doc.moveDown(0.3);
      // Double line for total
      doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
      doc.moveTo(10, doc.y + 1).lineTo(216, doc.y + 1).stroke();
      doc.moveDown(0.3);

      const totalLine = 'TOTAL:'.padEnd(30) + order.totalPrice.toFixed(2).padStart(15);
      doc.fontSize(9).font('Helvetica-Bold').text(totalLine);
      
      doc.moveDown(0.3);
      // Double line
      doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
      doc.moveTo(10, doc.y + 1).lineTo(216, doc.y + 1).stroke();
      doc.moveDown(0.5);

      // Payment Info
      doc.fontSize(8).font('Helvetica');
      doc.text(`Payment: ${order.paymentStatus || 'Pending'}`);
      if (order.cashOnDelivery) {
        doc.text('Cash on Delivery');
      }
      if (order.transactionId) {
        doc.text(`Txn ID: ${order.transactionId}`);
      }

      // Driver Info
      if (order.driver) {
        doc.moveDown(0.5);
        doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica-Bold').text('DELIVERED BY:');
        doc.fontSize(8).font('Helvetica');
        doc.text(`Name: ${order.driver.name || 'N/A'}`);
        doc.text(`Mobile: ${order.driver.mobileNumber || 'N/A'}`);
      }

      // Footer
      doc.moveDown(1);
      doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica').text('Thank you for shopping', { align: 'center' });
      doc.text('with FIVLIA!', { align: 'center' });
      doc.text('www.fivlia.com', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Function to be called when order is delivered - simplified version
exports.generateAndSendThermalInvoice = async (orderId) => {
  try {
    // Generate PDF invoice and get URL
    const pdfUrl = await exports.generateThermalInvoice(orderId);
    
    // Send WhatsApp notification with PDF link
    const order = await Order.findOne({ orderId }).populate('userId');
    const user = order.userId;

    const setting = await SettingAdmin.findOne();
    const authSettings = setting?.Auth?.[0] || {};

    const message = `🎉 Your Fivlia order #${orderId} has been delivered!\n\n📋 INVOICE:\nDownload your invoice: ${pdfUrl}\n\nThank you for choosing Fivlia! 🌟\n\nOrder Details:\n- Total: Rs. ${order.totalPrice}\n- Payment: ${order.paymentStatus}\n\nRate your experience on our app! ⭐`;

    const options = {
      method: 'POST',
      url: 'https://msggo.in/wapp/public/api/create-message',
      headers: {},
      formData: {
        appkey: authSettings.whatsApp.appKey,
        authkey: authSettings.whatsApp.authKey,
        to: user.mobileNumber,
        message: message
      },
    };

    request(options, (error, response) => {
      if (error) {
        console.error('WhatsApp delivery notification failed:', error);
      } else {
        console.log(`WhatsApp delivery notification sent with PDF invoice to ${user.mobileNumber}`);
      }
    });

    return {
      success: true,
      message: 'Thermal invoice PDF generated and sent via WhatsApp',
      pdfUrl: pdfUrl
    };
    
  } catch (err) {
    console.error('Error in generateAndSendThermalInvoice:', err);
    throw err;
  }
};

exports.generatePDFBuffer = async (orderId) => {
  const order = await Order.findOne({ orderId })
    .populate('addressId')
    .populate('items.productId');

  if (!order) throw new Error('Order not found');

  const user = order.addressId;
  const store = await require('../modals/store').findById(order.storeId);

  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const gstTotal = order.items.reduce((sum, item) => {
    const gstRate = parseFloat(item.gst || 0);
    return sum + ((item.price * item.quantity * gstRate) / 100);
  }, 0);

  // Use existing generatePDFInvoice but return buffer
  return await generatePDFInvoice(order, user, store, subtotal, gstTotal);
};



exports.generateThermalInvoiceController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const pdfBuffer = await exports.generatePDFBuffer(orderId);

    // Send PDF as a download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=thermal_invoice_${orderId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating thermal invoice:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate thermal invoice",
    });
  }
};