import admin from 'firebase-admin';

function test() {
    console.log(typeof admin.firestore.Timestamp);
}

test();
