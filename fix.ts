import fs from 'fs';

let content = fs.readFileSync('server/routes/auth.routes.ts', 'utf8');

content = content.replace(/admin\.firestore\(\)/g, 'getFirestore()');
content = content.replace(/admin\.firestore\.Timestamp/g, 'Timestamp');
content = content.replace(/admin\.firestore\.FieldValue/g, 'FieldValue');
content = content.replace(/admin\.firestore\.DocumentReference/g, 'DocumentReference');
content = content.replace(/admin\.firestore\.DocumentSnapshot/g, 'DocumentSnapshot');
content = content.replace(/admin\.auth\(\)/g, 'getAuth()');

fs.writeFileSync('server/routes/auth.routes.ts', content, 'utf8');
console.log('Fixed auth.routes.ts');
