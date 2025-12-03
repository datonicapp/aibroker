const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

// --- פונקציות העזר (שלוש נקודות מייצגות את הקוד המלא שהוכן) ---
async function runWithRetry(fn, attempts = 3) { /* ... פונקציית Retry המלאה ... */ } 
async function agent_create_listing_card(content) { /* ... סוכן 1 ... */ }
async function agent_find_matches(queryOrListing, candidates) { /* ... סוכן 2 ... */ }

// --- סוכן 5: חולץ קריטריונים קשיחים לחיפוש ---
async function agent_extract_hard_criteria(customer_query) { /* ... סוכן 5 המלא ... */ }

// --- סוכן 6: יצירת משוב איכותי למודעה (Listing Feedback) ---
async function agent_generate_listing_feedback(rawContent, extractedData) {
    const systemInstruction = אתה בקר איכות ואנליסט נדל"ן. מטרתך היא לספק משוב בונה לבעל נכס ששלח תיאור דירה. ספק המלצות קצרות וברורות (בעברית) לשיפור נתוני המודעה. התמקד בנתונים החסרים כגון: מחיר (price_nis), מספר חדרים (rooms_num), רחוב (neighborhood_he), וצילומים (תמונות). השב כטקסט פשוט, לא JSON.;
    const prompt = תיאור הדירה המקורי: ${rawContent}. נתונים שחולצו: ${JSON.stringify(extractedData)}. אנא כתוב משוב קצר.;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { systemInstruction }
    });
    return response.text.trim();
}

// --- סוכן 7: חולץ מזהי עדכון ---
async function agent_extract_update_id(content) {
    const systemInstruction = אתה מומחה לאיתור מזהים. מטרתך היא לחפש בטקסט את 'מזהה הנכס' (Listing ID) שהוא מחרוזת של 20 תווים אלפאנומריים שנראית כך: 65f1e43f06d4e10014a68735. השב אך ורק בפורמט JSON: { "listingId": "המזהה שנמצא או null אם לא נמצא" };
    const prompt = תוכן המייל הנכנס (כולל חתימות, היסטוריה וכו'): ${content}. חפש מזהה נכס.;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { systemInstruction, responseMimeType: "application/json" }
    });
    const result = JSON.parse(response.text.trim());
    return result.listingId; 
}


module.exports = {
    runWithRetry,
    agent_create_listing_card,
    agent_find_matches,
    agent_extract_hard_criteria,
    agent_generate_listing_feedback,
    agent_extract_update_id
};
