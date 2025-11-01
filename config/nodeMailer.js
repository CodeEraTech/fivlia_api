const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "mail.fivlia.com", // Or use the server IP if given: 172.93.223.239
  port: 465,              // Use 465 for SSL (recommended)
  secure: true,           // true for port 465, false for 587
  auth: {
    user: "no-reply@fivlia.com",   // Your no-reply email
    pass: "2025@Fivlia!", 
  },
  
});

const sendVerificationEmail = async (to, firstName, lastName, storeName) => {

  await transporter.sendMail({
    from: "Fivlia <no-reply@fivlia.com>",
    to,
    subject: "Fivlia Seller Registration",
    html: `
        <h3>Hello ${firstName} ${lastName},</h3>
        <p>Thank you for registering your store <strong>${storeName}</strong> with Fivlia.</p>
        <p>Your account is under verification. You will be notified once it's approved by our team.</p>
        <p>Regards,<br/>Fivlia Team</p>
      `
  });
};

const sendMailContact = async (to, subject,userEmail, htmlContent) => {
  await transporter.sendMail({
    from: "Fivlia <no-reply@fivlia.com>",
    replyTo: userEmail,
    to,
    subject,
    html: htmlContent,
  });
};


module.exports = {sendVerificationEmail, sendMailContact};
