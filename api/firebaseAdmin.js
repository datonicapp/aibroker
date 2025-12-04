const admin = require('firebase-admin');

if (!admin.apps.length) {
    // 1. אנחנו משתמשים בשיטת פירוק למשתני סביבה כדי לעקוף את חסימת ה-JSON
    const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        // חשוב: ה-private_key חייב להכיל את כל ה-"\n" כתווי מעבר שורה
        private_key: process.env.FIREBASE_PRIVATE_KEY,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // 2. הגדרת Firebase Storage באמצעות ה-PROJECT_ID בלבד (תיקון אחרון)
        storageBucket: process.env.FIREBASE_PROJECT_ID + '.appspot.com', 
    });
}

const db = admin.firestore();
const storage = admin.storage();

module.exports = {
    admin,
    db,
    storage
};
