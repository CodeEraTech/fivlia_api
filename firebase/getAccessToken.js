// getAccessToken.js
const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

const keyPath =
  process.env.NODE_ENV === "production"
    ? require("/etc/secrets/fivlia.json")
    : path.join(__dirname, "fivlia.json");

const keyFile = JSON.parse(fs.readFileSync(keyPath, "utf8"));

const SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"];

const jwtClient = new google.auth.JWT({
  email: keyFile.client_email,
  key: keyFile.private_key,
  scopes: SCOPES,
});

const getAccessToken = async () => {
  try {
    const tokens = await jwtClient.authorize();
    console.log(tokens.access_token);
    return tokens.access_token;
  } catch (err) {
    console.error("❌ Failed to get access token:", err.message);
    return null;
  }
};

module.exports = getAccessToken;
