import admin from 'firebase-admin';

export class SupportTicketAutomation {
    static async runAutomation(db: admin.firestore.Firestore) {
        console.log('[SupportTicketAutomation] Evaluating active support pipelines...');
        const now = Date.now();
        const oneHourMs = 60 * 60 * 1000;
        const twoHoursMs = 2 * 60 * 60 * 1000;
        const twentyFourHoursMs = 24 * 60 * 60 * 1000;
        const seventyTwoHoursMs = 72 * 60 * 60 * 1000;

        try {
            // Fetch non-closed tickets
            const ticketsSnap = await db.collection('support_tickets')
                .where('status', 'in', ['open', 'assigned', 'ai_answering', 'pending_user'])
                .get();

            for (const ticketDoc of ticketsSnap.docs) {
                const ticketId = ticketDoc.id;
                const ticket = ticketDoc.data();
                
                const lastActivity = ticket.lastActivityAt?.toDate()?.getTime() || now;
                const age = now - lastActivity;

                // Tracking flags to prevent duplicate system broadcasts
                const automationState = ticket.automationState || {};
                
                // 1. Follow-up after 1 hour of inactivity
                if (age >= oneHourMs && age < twoHoursMs && !automationState.hourOneFollowup) {
                    await db.collection('support_messages').add({
                        ticketId,
                        senderId: 'system_automation',
                        senderType: 'ai',
                        text: "🔄 System Notice: No activity detected for over 1 hour. Your session remains open, and our quantitative agents are standing by.",
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    
                    automationState.hourOneFollowup = true;
                    await db.collection('support_tickets').doc(ticketId).update({
                        automationState,
                        lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                // 2. Reminder after 2 hours
                else if (age >= twoHoursMs && age < twentyFourHoursMs && !automationState.hourTwoReminder) {
                    await db.collection('support_messages').add({
                        ticketId,
                        senderId: 'system_automation',
                        senderType: 'ai',
                        text: "🔔 System Update: Gentle reminder that this terminal is awaiting your interaction. Send any response to update our system coordinates.",
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    
                    automationState.hourTwoReminder = true;
                    await db.collection('support_tickets').doc(ticketId).update({
                        automationState,
                        lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }

                // 3. Pending closure warnings after 24 hours
                else if (age >= twentyFourHoursMs && age < seventyTwoHoursMs && !automationState.dayOnePendingClosure) {
                    await db.collection('support_messages').add({
                        ticketId,
                        senderId: 'system_automation',
                        senderType: 'ai',
                        text: "⚠️ System Security Protocol: Session has been inactive for 24 hours. The portal remains active for another 48 hours before auto-settlement and closure.",
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    
                    automationState.dayOnePendingClosure = true;
                    await db.collection('support_tickets').doc(ticketId).update({
                        status: 'pending_user',
                        automationState,
                        lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }

                // 4. Automatic closure after 72 hours of inactivity
                else if (age >= seventyTwoHoursMs) {
                    await db.collection('support_messages').add({
                        ticketId,
                        senderId: 'system_automation',
                        senderType: 'ai',
                        text: "📋 Portfolio Notice: Session closed automatically due to 72 hours of inactivity. You may reopen this ticket at any time by sending a new layout message.",
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    await db.collection('support_tickets').doc(ticketId).update({
                        status: 'closed',
                        closedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        } catch (err) {
            console.error('[SupportTicketAutomation] Error in support ticket lifecycle scans:', err);
        }
    }
}
