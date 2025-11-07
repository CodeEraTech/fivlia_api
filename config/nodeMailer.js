const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // Or use the server IP if given: 172.93.223.239
  port: 465, // Use 465 for SSL (recommended)
  secure: true, // true for port 465, false for 587
  auth: {
    user: "fivliaindia@gmail.com", // Your no-reply email
    pass: "xybmyypjxwyeldgl",
  },
});

const sendVerificationEmail = async (to, firstName, lastName, storeName) => {
  await transporter.sendMail({
    from: "Fivlia <fivliaindia@gmail.com>",
    to,
    subject: "Fivlia Seller Registration",
    html: `
        <h3>Hello ${firstName} ${lastName},</h3>
        <p>Thank you for registering your store <strong>${storeName}</strong> with Fivlia.</p>
        <p>Your account is under verification. You will be notified once it's approved by our team.</p>
        <p>Regards,<br/>Fivlia Team</p>
      `,
  });
};

const sendVerificationEmailLink = async (
  to,
  firstName,
  lastName,
  verifyUrl
) => {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 40px; color: #111;">
      <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <div style="text-align: center;">
              <h1 style="color:#30574e; font-weight:bold; font-size:28px; letter-spacing:0.15em; margin-bottom:10px;">
      FIVLIA
    </h1>
        </div>

        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p style="font-size: 15px; color: #555;">Hi <strong>${firstName} ${lastName}</strong>,</p>
        <p style="font-size: 15px; color: #555;">
          Thanks for registering your store on <strong>Fivlia Seller Portal</strong>. Please confirm your email address by clicking the button below.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" target="_blank"
            style="background-color: #4F46E5; color: white; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            Verify My Email
          </a>
        </div>

        <p style="font-size: 14px; color: #777;">
          If you didn’t create this account, please ignore this email.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
        <p style="font-size: 13px; color: #888; text-align: center;">
          This link will expire in <strong>1 hours</strong>.<br>
          &copy; ${new Date().getFullYear()} Fivlia India. All rights reserved.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: "Fivlia <fivliaindia@gmail.com>",
    to,
    subject: "Verify Your Fivlia Seller Email",
    html: emailHtml,
  });
};

const sendMailContact = async (to, subject, userEmail, htmlContent) => {
  await transporter.sendMail({
    from: "Fivlia <fivliaindia@gmail.com>",
    replyTo: userEmail,
    to,
    subject,
    html: htmlContent,
  });
};

module.exports = {
  sendVerificationEmail,
  sendMailContact,
  sendVerificationEmailLink,
};
