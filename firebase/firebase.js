// firebaseConfig.js
const admin = require('firebase-admin');
const serviceAccount =  process.env.NODE_ENV === 'production'  ? require('/etc/secrets/fivlia-firebase-adminsdk-fbsvc-983c02ca3c.json')
  : require('./fivlia-firebase-adminsdk-fbsvc-983c02ca3c.json');


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
