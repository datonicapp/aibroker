util
 const admin = require('firebase-admin');

if (!admin.apps.length) {
    // ב-Vercel, משתנה הסביבה מגיע כמחרוזת JSON
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // הגדרת Firebase Storage עבור העלאת תמונות
        storageBucket: serviceAccount.project_id + '.appspot.com' 
    });
}

const db = admin.firestore();
const storage = admin.storage();

module.exports = {
    admin,
    db,
    storage
};

