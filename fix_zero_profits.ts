import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
}
const db = admin.firestore();

async function fixZeroProfits() {
    console.log("Starting zero-profit repair...");
    
    // 1. Find all transactions with 0 amount that are "PROFIT_PAYOUT", "profit_release", "MATURITY_PROFIT"
    const txSnapshot = await db.collection('transactions')
        .where('type', 'in', ['profit_release', 'PROFIT_PAYOUT', 'MATURITY_PROFIT'])
        .where('amount', '==', 0)
        .get();
        
    console.log(`Found ${txSnapshot.size} zero-amount profit transactions.`);
    
    for (const doc of txSnapshot.docs) {
        const txData = doc.data();
        const userId = txData.user_id;
        
        // We need to figure out which investment it was. Let's find active investments for this user
        const invSnapshot = await db.collection('investments')
            .where('user_id', '==', userId)
            .get();
            
        let matchedInv: any = null;
        let matchedInvId = null;
        
        for (const invDoc of invSnapshot.docs) {
            const data = invDoc.data();
            // Match against plan name if it's there
            if (data.plan === txData.plan || data.plan_name === txData.plan) {
                matchedInv = data;
                matchedInvId = invDoc.id;
                break;
            }
        }
        
        if (!matchedInv) {
            console.log(`Could not find investment for transaction ${doc.id}`);
            continue;
        }
        
        // Calculate the real profit per interval
        let expectedTotalProfit = matchedInv.expected_total_profit;
        if (!expectedTotalProfit) {
             const payoutAmount = (matchedInv.total_amount || 0) * ((matchedInv.final_roi || 150) / 100);
             expectedTotalProfit = payoutAmount;
        }
        const totalIntervals = matchedInv.total_intervals || 1;
        const correctProfit = expectedTotalProfit / totalIntervals;
        
        if (correctProfit > 0) {
            console.log(`Fixing transaction ${doc.id}: Setting amount to $${correctProfit} and crediting user ${userId}`);
            
            await db.runTransaction(async (t) => {
                const userRef = db.collection('users').doc(userId);
                const invRef = db.collection('investments').doc(matchedInvId);
                const txRef = db.collection('transactions').doc(doc.id);
                
                const userDoc = await t.get(userRef);
                const invDoc = await t.get(invRef);
                if (!userDoc.exists || !invDoc.exists) return;
                
                const uData = userDoc.data()!;
                const iData = invDoc.data()!;
                
                // Credit user
                t.update(userRef, {
                    profit_balance: (uData.profit_balance || 0) + correctProfit,
                    total_profit_earned: (uData.total_profit_earned || 0) + correctProfit
                });
                
                // Credit investment
                t.update(invRef, {
                    total_profit_earned: (iData.total_profit_earned || 0) + correctProfit
                });
                
                // Fix transaction
                t.update(txRef, {
                    amount: correctProfit
                });
            });
            console.log(`Successfully fixed transaction ${doc.id}`);
        }
    }
}

fixZeroProfits().then(() => {
    console.log("Done.");
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
