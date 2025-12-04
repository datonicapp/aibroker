// ===============================================
// 1. הגדרות ו-Dependencies (חלק מקובץ FirebaseAdmin.js)
// ===============================================
const admin = require('firebase-admin');
const { GoogleGenAI } = require('@google/genai');
const sgMail = require('@sendgrid/mail');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// --- אתחול Firebase Admin (השתמש רק ב-process.env.FIREBASE_SERVICE_ACCOUNT) ---
if (!admin.apps.length) {
    try {
        // ב-Vercel/Google Cloud, ניתן להכניס את כל ה-JSON כמשתנה סביבה יחיד
        const serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
       
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountJson),
            storageBucket: serviceAccountJson.project_id + '.appspot.com',
        });
    } catch (e) {
        // זה יעזור בניפוי שגיאות אם ה-JSON לא תקין
        console.error("Error initializing Firebase:", e.message);
    }
}

// --- אתחול Gemini ו-SendGrid ---
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const db = admin.firestore();
const storage = admin.storage();

// ===============================================
// 2. פונקציות עזר (חלק מקובץ GeminiAgents.js, PDFGenerator.js והמייל)
// ===============================================

// --- PDF Generator (מתוך קובץ pdfGenerator.js) ---
async function generatePDFReport(title, data, isSearchQuery) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', layout: 'portrait' });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
       
        // נניח שיש פונט עברי בנתיב הראשי של הפרויקט
        const HebrewFont = path.join(process.cwd(), 'assets', 'fonts', 'Arial.ttf');
        if (fs.existsSync(HebrewFont)) {
            doc.font(HebrewFont);
        } else {
            doc.font('Helvetica'); // פונט ברירת מחדל
        }
       
        doc.text(title, { align: 'center', fontSize: 18 });
        doc.moveDown();

        data.forEach((item, index) => {
            // לוגיקת עיצוב ה-PDF כפי ששלחת...
            doc.fontSize(14).text(`${index + 1}. ${item.city_he || item.owner_email}`, { underline: true });
            doc.fontSize(10);
           
            if (isSearchQuery) {
                doc.text(`מחיר: ${item.price_nis.toLocaleString()} ₪`);
                doc.text(`חדרים: ${item.rooms_num}`);
                doc.text(`תיאור: ${item.description_raw.substring(0, 150)}...`);
                doc.text(`פרטי קשר: ${item.owner_email}`);
                if (item.imageUrls && item.imageUrls.length > 0) {
                    doc.text(`צפייה בתמונות: ${item.imageUrls[0]}`);
                }
            } else {
                doc.text(`מחיר: ${item.price_nis ? item.price_nis.toLocaleString() + ' ₪' : 'לא צוין'}`);
                doc.text(`חדרים: ${item.rooms_num || 'לא צוין'}`);
                doc.text(`תיאור: ${item.description_raw.substring(0, 150)}...`);
                doc.text(`פרטי קשר: ${item.owner_email}`);
            }
            doc.moveDown();
        });

        doc.end();
    });
}

// --- פונקציות טיפול ברשת ומייל (מתוך קובץ FirebaseAdmin.js) ---
async function sendEmail(to, subject, text, pdfBuffer = null) {
    const msg = {
        to: to,
        from: process.env.EMAIL_FROM,
        subject: subject,
        text: text,
        attachments: [],
    };

    if (pdfBuffer) {
        msg.attachments.push({
            content: pdfBuffer.toString('base64'),
            filename: 'Report.pdf',
            type: 'application/pdf',
            disposition: 'attachment',
        });
    }

    try {
        await sgMail.send(msg);
    } catch (error) {
        console.error('SendGrid Error:', error);
        throw new Error('Failed to send email.');
    }
}

async function handleAttachments(attachments, listingId, bucket, firestoreDb) {
    // לוגיקת שמירת תמונות ל-Firebase Storage...
    // דורש פונקציה פנימית שתשתמש ב-storage.bucket().file(...)...
}

// --- Agent Functions (מתוך קובץ GeminiAgents.js) ---
// פונקציות ריקות מייצגות את הקוד המלא שלך.
async function runWithRetry(fn, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
        try { return await fn(); }
        catch (e) { console.warn(`Retry attempt ${i + 1} failed.`); }
    }
    throw new Error('All retry attempts failed.');
}
async function agent_create_listing_card(content) { /* ... סוכן 1 - קוד מלא ... */ }
async function agent_find_matches(queryOrListing, candidates) { /* ... סוכן 2 - קוד מלא ... */ }
async function agent_extract_buyer_id(content) { /* ... סוכן 6 - קוד מלא ... */ }

// סוכן 7 (היחיד ששלחת קוד מלא):
async function agent_extract_update_id(content) {
    const systemInstruction = 'אתה מומחה לאיתור מזהים. מטרתך היא לחפש בטקסט את "מזהה הנכס" (Listing ID) שהוא מחרוזת של 20 תווים אלפאנומריים שנראית כך: 65f1e43f06d4e10014a68735. השב אך ורק בפורמט JSON: { "listingId": "המזהה שנמצא או null אם לא נמצא" }';
    const prompt = `תוכן המייל הנכנס (כולל חתימות, היסטוריה וכו'): ${content}. חפש מזהה נכס.`;
   
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { systemInstruction, responseMimeType: "application/json" }
    });
    const result = JSON.parse(response.text.trim());
    return result.listingId;
}
// ------------------------------------------------------------------

// ===============================================
// 3. הפונקציה הראשית (index.js - עטופה נכון ל-Vercel)
// ===============================================

export default async (req, res) => { // מבנה ה-export החיוני ל-Vercel
    // רק בקשות POST צריכות להתקבל מ-SendGrid
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { from_email, text, attachments } = req.body;
        const from = from_email || 'unknown@example.com';
        const content = text || '';
       
        // 1. נסה לחלץ ID של מחפש (Agent 6)
        const buyerDocId = await runWithRetry(() => agent_extract_buyer_id(content));

        // ==========================================
        // SCENARIO 1: BUYER SEARCH (המשך הלוגיקה שלך)
        // ==========================================
        if (buyerDocId) {
            const candidates = await db.collection('listings').where('is_active', '==', true).get();

            if (candidates.length > 0) {
                // ... (הקוד שלך לביצוע התאמות ושליחת PDF למוכר) ...
                return res.status(200).json({ success: true, count: 0 }); // Placeholder
            }
            return res.status(200).json({ success: true, count: 0, message: 'No properties found based on criteria.' });
        }

        // ==========================================
        // SCENARIO 2: NEW LISTING / UPDATE (הקוד ששלחת)
        // ==========================================
        else {
            // 1. נסה לחלץ ID של עדכון מתוך תוכן המייל (סוכן 7)
            const existingListingId = await runWithRetry(() => agent_extract_update_id(content));
            let docRef;

            // 2. חילוץ נתוני הדירה (Agent 1)
            const listingData = await runWithRetry(() => agent_create_listing_card(content));
            listingData.owner_email = from;
           
            // 3. לוגיקת שמירה: עדכון או יצירה
            if (existingListingId) {
                docRef = db.collection('listings').doc(existingListingId);
                await docRef.update({ ...listingData, updated_at: admin.firestore.FieldValue.serverTimestamp() });
            } else {
                listingData.created_at = admin.firestore.FieldValue.serverTimestamp();
                docRef = await db.collection('listings').add(listingData);
            }
           
            const listingId = docRef.id;

            // 4. יצירת משוב וכרטיסייה עצמית
            const feedbackText = await runWithRetry(() => agent_generate_listing_feedback(content, listingData));
            const pdfData = [{ ...listingData, owner_email: from }]; // יצירת מערך עבור ה-PDF
            const feedbackPdf = await generatePDFReport('כרטיס נכס לדוגמה', pdfData, false);

            // 5. שליחת מייל חוזר למוכר (כולל ה-ID להבא)
            const emailSubject = existingListingId
                ? `✅ הנכס שלך עודכן! מזהה: ${listingId}`
                : `✅ הנכס שלך נקלט! מזהה: ${listingId}`;
           
            const statusMessage = existingListingId ? 'המודעה עודכנה בהצלחה!' : 'המודעה נקלטה בהצלחה!';

            const emailBody = `שלום רב,\n\n${statusMessage}\n\n***\nמזהה נכס: ${listingId}\n***\n\nכדי למקסם את הסיכויים למכירה, להלן המשוב שלנו לשיפור המודעה:\n\n${feedbackText}\n\nמצורף PDF של הכרטיסייה כפי שהיא תופיע למחפשים. אנא שמור את המייל הזה, המזהה שמופיע למעלה משמש לעדכונים עתידיים.\n\nתודה, \nצוות AI Broker`;

            await sendEmail(from, emailSubject, emailBody, feedbackPdf);

            // 6. טיפול בתמונות (Agent 4)
            if (attachments && attachments.length > 0) {
              await handleAttachments(attachments, listingId, storage.bucket(), db);
            }

            return res.status(200).json({ success: true, id: listingId, updated: !!existingListingId });
        }

    } catch (error) {
        console.error('Fatal Handler Error:', error);
        return res.status(500).json({ error: error.message });
    }
}; 

