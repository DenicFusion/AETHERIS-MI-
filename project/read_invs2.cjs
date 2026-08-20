const admin = require('firebase-admin');

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

async function check() {
    const users = await db.collection('users').where('email', '==', 'admin@aetheris.com').get();
    if (users.empty) {
        console.log('User not found by email');
        process.exit(1);
    }
    const uid = users.docs[0].id;
    console.log(`User ID: ${uid}`);

    const invs = await db.collection('investments').where('user_id', '==', uid).get();
    for (const doc of invs.docs) {
        const data = doc.data();
        console.log(`\nINV ${doc.id}`);
        console.log(`Plan: ${data.plan}`);
        console.log(`Status: ${data.status}`);
        console.log(`Interval Days: ${data.interval_days}`);
        console.log(`Total Intervals: ${data.total_intervals}`);
        console.log(`Expected Profit: ${data.expected_total_profit}`);
        console.log(`Profit Earned: ${data.total_profit_earned}`);
        if (data.next_execution_time) {
            console.log(`Next Execute Time: ${data.next_execution_time.toDate()}`);
        }
        
        const intervals = await doc.ref.collection('intervals').orderBy('sequence', 'asc').get();
        console.log('Intervals:');
        intervals.forEach(iDoc => {
             const iData = iDoc.data();
             console.log(` - Seq ${iData.sequence} | Status: ${iData.status} | Due: ${iData.due_date ? iData.due_date.toDate() : 'none'} | PaidAt: ${iData.paid_at ? iData.paid_at.toDate() : 'none'}`);
        });
    }

    process.exit(0);
}
check();
