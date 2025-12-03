if (candidates.length > 0) {
                const matchRes = await runWithRetry(() => agent_find_matches(content, candidates));
                
                const results = (matchRes.matches || [])
                    .filter(m => m.isMatch)
                    .map(m => {
                         const listing = candidates.find(c => c.id === m.id);
                         // שמירת היסטוריית התאמות ללמידה
                         db.collection('matches_history').add({
                             query_id: buyerDocId,
                             listing_id: listing.id,
                             match_score: m.score,
                             match_reason: m.reason,
                             created_at: admin.firestore.FieldValue.serverTimestamp()
                         });
                         return { ...listing, ...m };
                    });

                if (results.length > 0) {
                    const pdf = await generatePDFReport('Property Matches', results, true);
                    await sendEmail(from, 'Your Search Results', 'Here are the best properties found.', pdf);
                }
                
                return res.status(200).json({ success: true, count: results.length });
            }

            return res.status(200).json({ success: true, count: 0, message: 'No properties found based on criteria.' });
        }

        // ==========================================
        // SCENARIO 2: NEW LISTING / UPDATE
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
                ? ✅ הנכס שלך עודכן! מזהה: ${listingId}
                : ✅ הנכס שלך נקלט! מזהה: ${listingId};
            
            const statusMessage = existingListingId ? 'המודעה עודכנה בהצלחה!' : 'המודעה נקלטה בהצלחה!';

            const emailBody = שלום רב,\n\n${statusMessage}\n\n***\nמזהה נכס: ${listingId}\n***\n\nכדי למקסם את הסיכויים למכירה, להלן המשוב שלנו לשיפור המודעה:\n\n${feedbackText}\n\nמצורף PDF של הכרטיסייה כפי שהיא תופיע למחפשים. אנא שמור את המייל הזה, המזהה שמופיע למעלה משמש לעדכונים עתידיים.\n\nתודה, \nצוות AI Broker;

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
