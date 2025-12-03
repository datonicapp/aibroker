const PDFDocument = require('pdfkit');

// --- סוכן 3: יצירת דו"ח PDF (מעוצב) ---
async function generatePDFReport(reportTitle, matchedData, isSearchQuery) {
  return new Promise((resolve, reject) => {
    // הגדרות PDF ל-A4
    const doc = new PDFDocument({ size: 'A4', autoFirstPage: false, bufferPages: true });
    let buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    doc.addPage();
    
    // כותרת ראשית (הדגשה על יישור לימין לעברית)
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#003366')
       .text(reportTitle, { align: 'right' }); 
    
    doc.fontSize(10).fillColor('#444444')
       .text(דו"ח נוצר על ידי AI Broker | ${new Date().toLocaleDateString('he-IL')}, { align: 'right' });
    doc.moveDown(1.5);

    matchedData.forEach((match, index) => {
      // בקרת עמוד
      if (index > 0 && doc.y > 680) {
          doc.addPage();
          doc.moveDown();
      }
      
      const listing = match; 
      
      doc.fillColor('#003366').fontSize(14).font('Helvetica-Bold')
         .text(${index + 1}. ${listing.title || listing.id}, { align: 'right' });

      // ציון התאמה (מוצג משמאל)
      doc.fillColor('#CC0000').fontSize(16).font('Helvetica-Bold')
         .text(התאמה: ${Math.round(match.score * 100)}%, 450, doc.y - 18, { align: 'left' }); 
      
      // ... (לוגיקת עיצוב טבלה RLT נוספת)
         
      // קו הפרדה
      doc.moveDown(1);
      doc.strokeColor('#CCCCCC').lineWidth(1)
         .moveTo(30, doc.y).lineTo(565, doc.y).stroke();
      doc.moveDown(1);
    });

    doc.end();
  });
}

// הייצוא לקובץ utils/pdfGenerator.js
module.exports = { generatePDFReport };
