import fs from 'fs';

const files = [
    'engine/walletEngine.ts',
    'engine/transactionLogger.ts',
    'engine/profitEngine.ts',
    'engine/deductionEngine.ts',
    'engine/overdueEngine.ts',
    'engine/intervalProcessor.ts',
    'engine/schedulerEngine.ts',
    'engine/activationEngine.ts'
];

files.forEach(f => {
    let code = fs.readFileSync(f, 'utf8');
    code = code.replace(/import \* as admin from 'firebase-admin';/g, "import admin from 'firebase-admin';");
    fs.writeFileSync(f, code);
});
console.log('Fixed imports.');
