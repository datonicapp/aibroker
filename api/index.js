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
