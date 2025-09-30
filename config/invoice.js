const { PutObjectCommand } = require("@aws-sdk/client-s3");
const PDFDocument = require("pdfkit");
const path = require("path");
const s3 = require("./aws"); // AWS S3 setup
const { v4: uuidv4 } = require("uuid");
const { SettingAdmin } = require("../modals/setting");
const Store = require("../modals/store");
const { Order } = require("../modals/order");
const User = require("../modals/User");
const Product = require("../modals/Product"); // Add this line
const request = require("request"); // for msggo.in

// Generate PDF Thermal Invoice and upload to AWS
exports.generateThermalInvoice = async (orderId) => {
  try {
    const order = await Order.findOne({ orderId })
      .populate("addressId")
      .populate("items.productId");
    if (!order) throw new Error("Order not found");

    const user = order.addressId;
    const store = await require("../modals/store").findById(order.storeId);

    // Calculate totals
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const gstTotal = order.items.reduce((sum, item) => {
      const gstRate = parseFloat(item.gst || 0);
      return sum + (item.price * item.quantity * gstRate) / 100;
    }, 0);

    // Generate PDF invoice
    const pdfBuffer = await generatePDFInvoice(
      order,
      user,
      store,
      subtotal,
      gstTotal
    );

    // Upload to AWS S3
    const fileName = `thermal-invoices/thermal_invoice_${orderId}_${uuidv4()}.pdf`;
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    };

    await s3.send(new PutObjectCommand(uploadParams));

    // Generate the URL
    const pdfUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // Save PDF URL to database
    await Order.findOneAndUpdate(
      { orderId },
      { $set: { thermalInvoice: pdfUrl } }
    );

    console.log(
      "Thermal invoice PDF generated and uploaded for order:",
      orderId
    );
    return pdfUrl;
  } catch (err) {
    console.error("Thermal invoice generation error:", err);
    throw err;
  }
};

exports.generateStoreInvoiceId = async (storeId) => {
  const store = await Store.findById(storeId);
  if (!store) throw new Error("Store not found");

  let prefix = '';
  if (store.Authorized_Store) {      // field from store document
    return await FeeInvoiceId(true); 
  } else {
    prefix = store.invoicePrefix;
  }

  // Find the last order for this store
  const lastOrder = await Order.find({ storeId })
    .sort({ createdAt: -1 })
    .limit(1);

  let lastNumber = 0;
  if (lastOrder.length > 0 && lastOrder[0].storeInvoiceId) {
    const match = lastOrder[0].storeInvoiceId.match(/\d+$/);
    if (match) lastNumber = parseInt(match[0]);
  }

  const newNumber = lastNumber + 1;
  // Pad with leading zeros, e.g., 001, 002, ...
  const numberPadded = String(newNumber).padStart(3, "0");

  return `${prefix}${numberPadded}`;
};

// Generate PDF invoice
async function generatePDFInvoice(
  order,
  user,
  store,
  subtotal,
  gstTotal,
  { dType = "admin" }
) {
  const setting = await SettingAdmin.find().lean();

  // Fetch signature image buffer from AWS URL
  let signatureBuffer;
  let adminSignatreBuffer;
  if (store.sellerSignature) {
    const signatureUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com${store.sellerSignature}`;
    try {
      const signatureResponse = await fetch(signatureUrl);
      if (!signatureResponse.ok) {
        throw new Error(
          `Failed to fetch signature image: ${signatureResponse.statusText}`
        );
      }
      signatureBuffer = await signatureResponse.arrayBuffer();
    } catch (error) {
      //console.error("Error fetching signature image:", error);
      signatureBuffer = null;
    }
  }

  if (setting[0]?.adminSignature) {
    const signatureUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com${setting[0]?.adminSignature}`;
    try {
      const signatureResponse = await fetch(signatureUrl);
      if (!signatureResponse.ok) {
        throw new Error(
          `Failed to fetch signature image: ${signatureResponse.statusText}`
        );
      }
      adminSignatreBuffer = await signatureResponse.arrayBuffer();
    } catch (error) {
      //console.error("Error fetching signature image:", error);
      adminSignatreBuffer = null;
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [226, 800],
        margins: {
          top: 20,
          bottom: 20,
          left: 10,
          right: 10,
        },
      });

      let buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Function to create the common header for both invoices
      const createHeader = (headerText) => {
        doc
          .fontSize(16)
          .font("Helvetica-Bold")
          .text(headerText, { align: "center" });
      };

      const createStoreAndCustomerInfo = (isSecondInvoice) => {
        doc.fontSize(8).font("Helvetica");
        if (isSecondInvoice) {
          doc.text(`Service Provider: ${setting[0]?.Owner_Name || "FIVLIA"}`);
        } else {
          doc.text(`Sold By: ${store.storeName || "FIVLIA"}`);
        }
        if (isSecondInvoice) {
          doc.text(`Invoice Id: ${order.feeInvoiceId}`);
        } else {
          doc.text(`Invoice Id: ${order.storeInvoiceId}`);
        }
        if (isSecondInvoice) {
          doc.text(`GST ID: ${setting[0]?.GST_Number || "N/A"}`);
        } else {
          doc.text(`GST ID: ${store.gstNumber || "N/A"}`);
        }
        if (isSecondInvoice) {
          doc.text(`Phone: ${setting[0]?.Owner_Number || "+91-XXXXXXXXXX"}`);
        } else {
          doc.text(`Phone: ${store.PhoneNumber || "+91-XXXXXXXXXX"}`);
        }
        if (!isSecondInvoice) {
          doc.text(`Address: ${store.fullAddress || store.city.name || "N/A"}`);
        }
        doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`);
        doc.text(`Time: ${new Date().toLocaleTimeString("en-IN")}`);
        doc.text(`Order ID: ${order.orderId}`);
        doc.moveDown(0.5);

        // Line separator
        doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
        doc.moveDown(0.5);

        // Customer Info
        doc.fontSize(9).font("Helvetica-Bold").text("CUSTOMER DETAILS:");
        doc.fontSize(8).font("Helvetica");
        doc.text(`Name: ${user.fullName || "N/A"}`);
        doc.text(
          `Mobile: ${user.mobileNumber || user.alternateNumber || "N/A"}`
        );
        doc.text(`Email: ${user.email || "N/A"}`);
        doc.text(`Address: ${user.address || "N/A"}`);
        doc.moveDown(0.5);

        // Line separator
        doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
        doc.moveDown(0.5);
      };

      // Create the first invoice: Items + details
      const createItemsInvoice = (signatureBuffer) => {
        createHeader("BILLING INVOICE");
        createStoreAndCustomerInfo(false);
        doc.fontSize(9).font("Helvetica-Bold").text("ITEMS:");
        doc.fontSize(7).font("Helvetica");

        // Items table header (with additional columns for GST(%) and IGST)
        const itemHeader =
          "Name".padEnd(30) +
          "Qty".padStart(10) +
          "GST(%)".padStart(10) +
          "IGST".padStart(10) +
          "Price".padStart(11);
        doc.text(itemHeader);
        doc.moveDown(0.3);
        // Line separator
        doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
        doc.moveDown(0.3);

        // Items total calculation
        let itemsTotal = 0;
        let itemsTotalGst = 0;
        // Items
        order.items.forEach((item) => {
          const itemName = (item.name || "Product").substring(0, 20);
          const quantity = item.quantity.toString();
          const price = (item.price * item.quantity).toFixed(2);
          const gstPercent = parseFloat(item.gst) || 0.0;
          const igst = (
            item.price *
            item.quantity *
            (gstPercent / 100)
          ).toFixed(2);

          itemsTotal += parseFloat(price);
          itemsTotalGst += parseFloat(igst);
          const itemLine =
            itemName.padEnd(22) +
            quantity.padStart(5) +
            `${gstPercent.toString().padStart(10)}%` +
            igst.padStart(16) +
            price.padStart(12);
          doc.text(itemLine);
          doc.moveDown(0.2);
        });

        // Line separator
        doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
        doc.moveDown(0.3);

        // **Total** (not subtotal) for items
        const totalLine =
          "TOTAL:".padEnd(30) + itemsTotal.toFixed(2).padStart(15);
        doc.fontSize(9).font("Helvetica-Bold").text(totalLine);
        doc.moveDown(0.3);

        // **Total GST**  for items
        const totalLineGST =
          "TOTAL GST:".padEnd(30) + itemsTotalGst.toFixed(2).padStart(10);
        doc.fontSize(9).font("Helvetica-Bold").text(totalLineGST);
        doc.moveDown(0.5);

        // Signature image (if available)
        if (signatureBuffer) {
          doc.image(signatureBuffer, doc.page.width / 2 - 50, doc.y, {
            fit: [100, 50],
            align: "center",
          });

          doc.moveDown();
          doc.y += 40;
          // "Authorized Signatory" label
          doc.fontSize(9).font("Helvetica-Bold").text("Authorized Signatory", {
            align: "center",
          });
        }
        doc.moveDown(1);
        doc.fontSize(9).font("Helvetica-Bold").text("DECLARATION");

        doc.moveDown(0.3);
        // Declaration text
        doc
          .fontSize(8)
          .font("Helvetica")
          .text(
            "The goods sold as part of this shipment are intended for end-user consumption and are not for sale."
          );

        doc.moveDown(0.5);
      };

      // Create the second invoice: Delivery & Platform Fees
      const createFeesInvoice = (deliveryGstPer, adminSignatreBuffer) => {
        createHeader("FIVLIA INVOICE");
        createStoreAndCustomerInfo(true);
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .text("DELIVERY & PLATFORM FEES", { continued: true })
          .font("Helvetica")
          .fontSize(7)
          .text(` (GST : ${deliveryGstPer}% included)`);
        doc.moveDown(0.5);
        doc.fontSize(7).font("Helvetica");
        let platformTotal = 0;
        let deliveryTotal = 0;

        // Delivery Charges
        if (order.deliveryCharges > 0) {
          const deliveryLine =
            "Delivery Charges:".padEnd(30) +
            order.deliveryCharges.toFixed(2).padStart(13);
          doc.text(deliveryLine);
          deliveryTotal = order.deliveryCharges;
        }

        // Platform Fee
        if (order.platformFee > 0) {
          const platformLine =
            "Platform Fee:".padEnd(30) +
            order.platformFee.toFixed(2).padStart(15);
          doc.text(platformLine);
          platformTotal = order.platformFee;
        }

        doc.moveDown(0.3);

        // **Total** for Delivery & Platform Fees
        const totalFeesLine =
          "TOTAL FEES:".padEnd(27) +
          (deliveryTotal + platformTotal).toFixed(2).padStart(5);
        doc.fontSize(9).font("Helvetica-Bold").text(totalFeesLine);

        // **Total GST** for Delivery & Platform Fees
        const deliveryGst = (deliveryTotal * (deliveryGstPer / 100)).toFixed(2);
        const platformGst = (platformTotal * (deliveryGstPer / 100)).toFixed(2);
        const feeigst = (
          parseFloat(deliveryGst) + parseFloat(platformGst)
        ).toFixed(2);
        const totalFeesGSTLine = "TOTAL GST:".padEnd(27) + feeigst.padStart(5);
        doc.fontSize(9).font("Helvetica-Bold").text(totalFeesGSTLine);
        doc.moveDown(1.5);
        // Signature image (if available)
        if (adminSignatreBuffer) {
          doc.fontSize(7).text("FIVLIA Authorized Signature", {
            align: "right",
          });
          doc.image(adminSignatreBuffer, doc.page.width - 110, doc.y, {
            fit: [100, 50],
            align: "right",
          });
          doc.moveDown();
          doc.y += 30;
        }
      };

      // Footer for both invoices (same footer in both invoices)
      const footer = () => {
        doc.moveDown(1);
        doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
        doc.moveDown(0.5);
        doc
          .fontSize(8)
          .font("Helvetica")
          .text("Thank you for shopping", { align: "center" });
        doc.text("with FIVLIA!", { align: "center" });
        doc.text("www.fivlia.com", { align: "center" });
        doc.moveDown(0.5);
        doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
      };

      // Check dType and generate invoices accordingly
      if (dType === "admin") {
        // Admin generates both invoices
        createItemsInvoice(signatureBuffer);
        footer();

        // Add page break to separate the two invoices
        doc.addPage();
        createFeesInvoice(
          setting[0]?.Delivery_Charges_Gst || 18,
          adminSignatreBuffer
        );
        footer();
      } else if (dType === "seller") {
        // Seller generates only the first invoice
        createItemsInvoice(signatureBuffer);
        footer();
      }

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
    const order = await Order.findOne({ orderId }).populate("userId");
    const user = order.userId;

    const setting = await SettingAdmin.findOne();
    const authSettings = setting?.Auth?.[0] || {};

    const message = `🎉 Your Fivlia order #${orderId} has been delivered!\n\n📋 INVOICE:\nDownload your invoice: ${pdfUrl}\n\nThank you for choosing Fivlia! 🌟\n\nOrder Details:\n- Total: Rs. ${order.totalPrice}\n- Payment: ${order.paymentStatus}\n\nRate your experience on our app! ⭐`;

    const options = {
      method: "POST",
      url: "https://msggo.in/wapp/public/api/create-message",
      headers: {},
      formData: {
        appkey: authSettings.whatsApp.appKey,
        authkey: authSettings.whatsApp.authKey,
        to: user.mobileNumber,
        message: message,
      },
    };

    request(options, (error, response) => {
      if (error) {
        console.error("WhatsApp delivery notification failed:", error);
      } else {
        console.log(
          `WhatsApp delivery notification sent with PDF invoice to ${user.mobileNumber}`
        );
      }
    });

    return {
      success: true,
      message: "Thermal invoice PDF generated and sent via WhatsApp",
      pdfUrl: pdfUrl,
    };
  } catch (err) {
    console.error("Error in generateAndSendThermalInvoice:", err);
    throw err;
  }
};

exports.generatePDFBuffer = async (orderId, dType) => {
  const order = await Order.findOne({ orderId })
    .populate("addressId")
    .populate("items.productId")
    .lean();

  if (!order) throw new Error("Order not found");

  const user = order.addressId;
  const store = await require("../modals/store").findById(order.storeId).lean();

  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const gstTotal = order.items.reduce((sum, item) => {
    const gstRate = parseFloat(item.gst || 0);
    return sum + (item.price * item.quantity * gstRate) / 100;
  }, 0);

  // Use existing generatePDFInvoice but return buffer
  return await generatePDFInvoice(order, user, store, subtotal, gstTotal, {
    dType: dType,
  });
};

exports.generateThermalInvoiceController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { dType } = req.query;
    const pdfBuffer = await exports.generatePDFBuffer(orderId, dType);

    // Send PDF as a download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=thermal_invoice_${orderId}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating thermal invoice:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate thermal invoice",
    });
  }
};
