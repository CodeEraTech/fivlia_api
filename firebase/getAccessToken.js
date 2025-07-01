const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

// Load your service account key from the JSON file
const keyPath = path.join(__dirname, "fivlia.json");
const keyFile = JSON.parse(fs.readFileSync(keyPath, "utf8"));

const SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"];

const jwtClient = new google.auth.JWT({
  email: keyFile.client_email,
  key: keyFile.private_key,
  scopes: SCOPES,
});

jwtClient.authorize((err, tokens) => {
  if (err) return console.error("❌ Auth Error:", err);
  console.log("✅ Access Token:", tokens.access_token);
});
