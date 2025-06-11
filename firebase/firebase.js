// firebaseConfig.js
const admin = require('firebase-admin');
const serviceAccount = require('./fivlianotification-firebase-adminsdk-fbsvc-62ad3d58d3.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
