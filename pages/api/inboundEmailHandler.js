if (results.length > 0) {
        const pdf = await generatePDFReport('Property Matches', results, true);
        await sendEmail(from, 'Your Search Results', 'Here are the best properties found.', pdf);
      }

      return res.status(200).json({ success: true, count: results.length });
    }

    // ==========================================
    // SCENARIO 2: NEW LISTING
    // ==========================================
    else {
      const listingData = await runWithRetry(() => agent_create_listing_card(content));
      listingData.owner_email = from;
      listingData.created_at = admin.firestore.FieldValue.serverTimestamp();
      
      const docRef = await db.collection('listings').add(listingData);
      const listingId = docRef.id;
      
      if (attachments && attachments.length > 0) {
        await handleAttachments(attachments, listingId, storage.bucket(), db); 
      }

      const buyersSnap = await db.collection('buyers')
        .where('preferences.preferredCities', 'array-contains', listingData.city_he || listingData.city)
        .get();
        
      const buyers = buyersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (buyers.length > 0) {
        const matchRes = await runWithRetry(() => agent_find_matches(listingData, buyers));
        
        const results = (matchRes.matches || [])
          .filter(m => m.isMatch)
          .map(m => {
             const buyer = buyers.find(b => b.id === m.id);
             return { ...buyer, ...m };
          });

        if (results.length > 0) {
          const pdf = await generatePDFReport('Potential Buyers', results, false);
          await sendEmail(process.env.EMAIL_USER, 'New Deal Opportunity', 'Found buyers for your new listing.', pdf);
        }
      }

      return res.status(200).json({ success: true, id: listingId });
    }

  } catch (error) {
    console.error('Fatal Handler Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
