const storeRegistrationTemplate = (firstName, lastName, storeName) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Welcome to Fivlia, ${firstName} ${lastName}!</h2>
    <p>Thank you for registering your store <strong>${storeName}</strong> with Fivlia.</p>
    <p>Your account is under verification. You will be notified once it's approved by our team.</p>
    <br/>
    <p style="font-size: 14px; color: gray;">This is an automated message. Please do not reply.</p>
  </div>
`;

const otpTemplate = (otp) => `
<html>
  <body style="margin:0; padding:20px; background-color:#ffffff; font-family: Arial, Helvetica, sans-serif; color:#333; text-align:center;">
    
    <!-- Logo / Brand -->
    <h1 style="color:#30574e; font-weight:bold; font-size:28px; letter-spacing:0.15em; margin-bottom:10px;">
      FIVLIA
    </h1>

    <!-- Title -->
    <h2 style="font-size:22px; color:#222; margin-top:0;">
      Confirm your email address
    </h2>

    <!-- Message -->
    <p style="font-size:16px; color:#555; max-width:500px; margin:10px auto;">
      Your confirmation code is below. Enter it in your browser window to complete the sign-in process.
    </p>

    <!-- OTP Box -->
    <div style="background:#f5f4f5; padding:20px; font-size:24px; font-weight:bold; margin:20px auto; border-radius:8px; width:220px; letter-spacing:4px; color:#000;">
      ${otp}
    </div>

    <!-- Ignore message -->
    <p style="font-size:14px; color:#888; margin:15px auto; max-width:500px;">
      If you didn’t request this code, you can safely ignore this email.
    </p>

    <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

    <!-- Footer Links -->
    <p style="font-size:12px; color:#777; margin:10px 0;">
      <a style="color:#30574e; text-decoration:none; margin:0 8px;" href="https://fivlia.in/about-us">About Us</a> | 
      <a style="color:#30574e; text-decoration:none; margin:0 8px;" href="https://fivlia.in/privacy">Policies</a> | 
      <a style="color:#30574e; text-decoration:none; margin:0 8px;" href="https://fivlia.in/terms">Terms & Conditions</a> | 
      <a style="color:#30574e; text-decoration:none; margin:0 8px;" href="https://fivlia.in/contact-us">Contact Us</a>
    </p>

    <!-- Social Icons -->
    <p style="margin:15px 0;">
      <a style="margin:0 5px;" href="https://www.facebook.com/profile.php?id=100090157863841">
        <img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" alt="Facebook" width="24" height="24" style="display:inline-block;" />
      </a>
      <a style="margin:0 5px;" href="https://www.instagram.com/fivliaindia">
        <img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" alt="Instagram" width="24" height="24" style="display:inline-block;" />
      </a>
      <a style="margin:0 5px;" href="/">
        <img src="https://cdn-icons-png.flaticon.com/32/733/733579.png" alt="Twitter" width="24" height="24" style="display:inline-block;" />
      </a>
      <a style="margin:0 5px;" href="/">
        <img src="https://cdn-icons-png.flaticon.com/32/174/174857.png" alt="LinkedIn" width="24" height="24" style="display:inline-block;" />
      </a>
    </p>

    <!-- Footer -->
    <p style="font-size:12px; color:#aaa; margin-top:10px; line-height:1.5;">
      © ${new Date().getFullYear()} Fivlia, Inc. All rights reserved.<br />
      Hisar, Haryana
    </p>

  </body>
</html>
`;


module.exports = { storeRegistrationTemplate, otpTemplate };