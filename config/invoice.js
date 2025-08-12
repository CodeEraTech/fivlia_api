const { PutObjectCommand } = require('@aws-sdk/client-s3');
const PDFDocument = require('pdfkit');
const path = require('path');
const s3 = require('./aws'); // AWS S3 setup
const { v4: uuidv4 } = require('uuid');
const {SettingAdmin} = require('../modals/setting')
const {Order} = require('../modals/order');
const User = require("../modals/User");
const request = require('request'); // for msggo.in

exports.generateAndSendInvoice = async (orderId) => {
  try {
    const order = await Order.findOne({ orderId });
    const user = await User.findById(order.userId); 
    if (!order) throw new Error('Order not found');

    const doc = new PDFDocument();
    let buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfData = Buffer.concat(buffers);
      const fileName = `invoices/invoice_${uuidv4()}.pdf`;

      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: pdfData,
        ContentType: 'application/pdf',
      };

      try {
       await s3.send(new PutObjectCommand(uploadParams));

        const invoiceUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

        // Save the URL in DB
        await Order.findOneAndUpdate(
          { orderId },
          { $set: { invoiceUrl } }
        );

        // === Send WhatsApp Message ===
        const setting = await SettingAdmin.findOne();
        const authSettings = setting?.Auth?.[0] || {};

        const options = {
          method: 'POST',
          url: 'https://msggo.in/wapp/public/api/create-message',
          headers: {},
          formData: {
            appkey: authSettings.whatsApp.appKey,
            authkey: authSettings.whatsApp.authKey,
            to: user.mobileNumber,
          message: `Your Fivlia order invoice is ready.\n\nDownload your invoice:\n${invoiceUrl}\n\nThank you for choosing Fivlia!`
          },
        };

        request(options, (error, response) => {
          if (error) {
            console.error('WhatsApp sending failed:', error);
          } else {
            console.log('WhatsApp message sent');
          }
        });

      } catch (err) {
        console.error('S3 upload or WhatsApp error:', err);
      }
    });

const fileName = `invoices/invoice_${uuidv4()}.pdf`;
const invoiceUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
doc.fontSize(26).fillColor('#333').text('FIVLIA INVOICE', { align: 'center' });
doc.moveDown(1);

doc.font('Helvetica').fontSize(14).fillColor('#000');
doc.text(` Customer: ${user.name}`, { continued: true }).text(`    ${user.mobileNumber}`);
doc.text(` Order ID: ${order.orderId}`);
doc.text(` Amount: Rs. ${order.totalPrice}`);
doc.text(` Date: ${new Date().toLocaleString()}`);
doc.moveDown(1);

// Draw a line
doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#aaa').stroke();
doc.moveDown(1);

// Clickable Link
doc.fontSize(14).fillColor('blue')
   .text('Click here to download this invoice', {
     link: invoiceUrl,
     underline: true,
   });
doc.moveDown(1);

// Footer
doc.fillColor('#666').fontSize(10).text('Thank you for shopping with Fivlia!', { align: 'center' });
doc.end();


  } catch (err) {
    console.error('Invoice generation error:', err);
  }
};
