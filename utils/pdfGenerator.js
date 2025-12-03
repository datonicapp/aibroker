const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

async function generatePDFReport(title, data, isSearchQuery) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', layout: 'portrait' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // --- הגדרות עיצוב ופונטים (מותאם לעברית) ---
        // הערה: נניח שאתה משתמש בפונט תומך עברית בפריסה, למשל 'arial.ttf'
        const HebrewFont = path.join(process.cwd(), 'assets', 'fonts', 'Arial.ttf'); 
        if (fs.existsSync(HebrewFont)) {
            doc.font(HebrewFont);
        } else {
            // שימוש בפונט ברירת מחדל אם אין פונט עברי מותקן
            doc.font('Helvetica');
        }
        
        doc.text(title, { align: 'center', fontSize: 18 });
        doc.moveDown();

        // --- לוגיקת הצגת נתונים ---
        data.forEach((item, index) => {
            doc.fontSize(14).text(${index + 1}. ${isSearchQuery ? item.city_he : item.buyer_email}, { underline: true });
            doc.fontSize(10);
            
            // תצוגת דירה לקונה (SCENARIO 1)
            if (isSearchQuery) {
                doc.text(מחיר: ${item.price_nis.toLocaleString()} ₪);
                doc.text(חדרים: ${item.rooms_num});
                doc.text(תיאור: ${item.description_raw.substring(0, 150)}...);
                // פרטי קשר של המוכר - קריטי לזרימה העסקית!
                doc.text(פרטי קשר: ${item.owner_email});
                if (item.imageUrls && item.imageUrls.length > 0) {
                    doc.text(צפייה בתמונות: ${item.imageUrls[0]}); 
                }
            } 
            // תצוגת הכרטיסייה העצמית למוכר (SCENARIO 2 - Feedback)
            else { 
                doc.text(מחיר: ${item.price_nis ? item.price_nis.toLocaleString() + ' ₪' : 'לא צוין'});
                doc.text(חדרים: ${item.rooms_num || 'לא צוין'});
                doc.text(תיאור: ${item.description_raw.substring(0, 150)}...);
                // פרטי קשר של המוכר
                doc.text(פרטי קשר: ${item.owner_email}); 
            }
            doc.moveDown();
        });

        doc.end();
    });
}

module.exports = {
    generatePDFReport
};
