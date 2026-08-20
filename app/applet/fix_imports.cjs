const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const newImports = `
import { ActivationEngine } from './engine/activationEngine';
import { SchedulerEngine } from './engine/schedulerEngine';
`;

if (!serverCode.includes('import { ActivationEngine }')) {
    serverCode = serverCode.replace("import express from 'express';", `import express from 'express';\n${newImports}`);
}

fs.writeFileSync('server.ts', serverCode);
console.log("Imports added successfully.");
