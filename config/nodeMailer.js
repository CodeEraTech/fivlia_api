const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "goutamdeveloper123@gmail.com",           // Replace with your test email
    pass: "mhon wbvu wmzu kngz",       
  },
});

const sendVerificationEmail = async (to, token) => {
  const verificationLink = `https://api.fivlia.in/verify-email?token=${token}`;

  await transporter.sendMail({
    from: "Fivlia <your_email@gmail.com>",
    to,
    subject: "Verify your email for Fivlia Store",
    html: `
      <h3>Welcome to Fivlia!</h3>
      <p>Please click the link below to verify your email:</p>
      <a href="${verificationLink}">${verificationLink}</a>
    `,
  });
};

module.exports = sendVerificationEmail;
