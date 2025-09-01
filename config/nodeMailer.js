const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "mail.fivlia.in", // Or use the server IP if given: 172.93.223.239
  port: 465,              // Use 465 for SSL (recommended)
  secure: true,           // true for port 465, false for 587
  auth: {
    user: "no-reply@fivlia.in",   // Your no-reply email
    pass: "gx4dBAaGRJ", 
  },
  tls: {
    rejectUnauthorized: false, // ⚠️ Only for testing
  },

});

const sendVerificationEmail = async (to, subject, html) => {

  await transporter.sendMail({
    from: "Fivlia <no-reply@fivlia.in>",
    to,
    subject,
    html,
  });
};

module.exports = sendVerificationEmail;
