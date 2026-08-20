const admin = require('firebase-admin');
const fs = require('fs');

let cert;
try { cert = require('./firebase-service-account.json'); } catch(e) {}

if (!admin.apps.length) {
   if (cert) {
      admin.initializeApp({ credential: admin.credential.cert(cert) });
   } else {
      admin.initializeApp();
   }
}

const db = admin.firestore();

async function fixProfits() {
    console.log("Fixing investment total_profit_earned...");
    const invs = await db.collection('investments').get();
    let fixed = 0;

    for (const inv of invs.docs) {
        const invData = inv.data();
        const intervals = await inv.ref.collection('intervals').get();
        let earnedSum = 0;
        
        intervals.docs.forEach(intDoc => {
            if (intDoc.data().prev_profit_paid === true) {
                earnedSum += (invData.expected_total_profit || 0) / (invData.total_intervals || 1);
            }
        });

        if (earnedSum > 0 && Math.abs((invData.total_profit_earned || 0) - earnedSum) > 0.01) {
            console.log(`Fixing Inv ${inv.id}: ${invData.total_profit_earned} -> ${earnedSum}`);
            await inv.ref.update({ total_profit_earned: earnedSum });
            fixed++;
        }
    }
    console.log(`Fixed ${fixed} investments.`);
    process.exit(0);
}
fixProfits();
