const { GoogleGenAI } = require('@google/genai');

// יש לוודא ש-ai מוכן.
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY); 

// --- פונקציית Utility לטיפול בכשלים (Retry Logic) ---
async function runWithRetry(fn, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) {
        console.error(Retry failed after ${attempts} attempts., error);
        throw error;
      }
      console.warn(Attempt ${i + 1} failed, retrying in 2 seconds...);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// --- סוכן 1: חילוץ נתוני דירה (Listing Card) ---
async function agent_create_listing_card(content) {
  const systemInstruction = אתה מומחה נדל"ן. חלץ את כל המידע הרלוונטי והקריטי מתיאור הדירה. השב אך ורק בפורמט JSON.;
  const prompt = תיאור דירה: ${content}. חלץ נתונים קשיחים כגון: city_he, neighborhood_he, rooms_num, price_nis, size_sqm, floor, max_floors, listing_type (למכירה/להשכרה).;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash', 
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { systemInstruction, responseMimeType: "application/json" }
  });
  return JSON.parse(response.text.trim()); 
}

// --- סוכן 2: מדרג סמנטי (Semantic Matcher) ---
async function agent_find_matches(queryOrListing, candidates) {
  const systemInstruction = אתה מנוע התאמה סמנטית. קבל שאילתה או נכס, ודרג את רשימת המועמדים על בסיס התאמה (ציון 0.0 עד 1.0). השב אך ורק בפורמט JSON עם מערך matches שמכיל id, score ו-reason.;
  const prompt = שאילתת לקוח/דירה: ${JSON.stringify(queryOrListing)}. רשימת מועמדים (דירות/קונים): ${JSON.stringify(candidates)}. החזר רשימה מדורגת של התאמות מדויקות (isMatch: true/false, score: 0-1) ונימוק קצר (reason).;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash', 
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { systemInstruction, responseMimeType: "application/json" }
  });
  return JSON.parse(response.text.trim()); 
}

// --- סוכן 5: חולץ קריטריונים קשיחים (Hard Criteria Extractor) ---
async function agent_extract_hard_criteria(customer_query) {
  const systemInstruction = אתה מומחה לניתוח שאילתות נדל"ן. חלץ את הקריטריונים הקשיחים ביותר הנדרשים לבניית שאילתת מסד נתונים. השב אך ורק בפורמט JSON הבא: 
    { "listing_type": "string (למכירה/להשכרה)", "city_he": "string (שם העיר - חובה, אם לא נמצא השאר ריק)", "neighborhood_he": "string (שכונה - null אם לא צוין)", "min_rooms": "number (מינימום חדרים - 0 אם לא צוין)", "max_price_nis": "number (מקסימום מחיר - 99999999 אם לא צוין)" };
  const prompt = שאילתת חיפוש: ${customer_query}. חלץ את הקריטריונים.;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash', 
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { systemInstruction, responseMimeType: "application/json" }
  });
  return JSON.parse(response.text.trim());
}

// הייצוא לקובץ utils/geminiAgents.js
module.exports = {
  runWithRetry,
  agent_create_listing_card,
  agent_find_matches,
  agent_extract_hard_criteria
};
