util
  sconst admin = require('firebase-admin');

// טעינה חד-פעמית של Firebase Admin SDK (מניעת שגיאות ב-Vercel)
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET, 
    });
  } catch (e) {
    console.error("Error initializing Firebase Admin SDK. Check FIREBASE_SERVICE_ACCOUNT variable.", e);
  }
}

const db = admin.firestore();
const storage = admin.storage();

// הייצוא לקובץ utils/firebaseAdmin.js
module.exports = { admin, db, storage };
