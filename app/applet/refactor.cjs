const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// The imports
const newImports = `
import { ActivationEngine } from './engine/activationEngine';
import { SchedulerEngine } from './engine/schedulerEngine';
`;

if (!serverCode.includes('import { ActivationEngine }')) {
    serverCode = serverCode.replace('import express from "express";', `import express from "express";\n${newImports}`);
}

// Replace checkAndActivatePlans body
const caStr = "async function checkAndActivatePlans(userId: string, transaction?: admin.firestore.Transaction) {";
const endCaIndex = serverCode.indexOf("apiRouter.post('/start-investment', async (req, res) => {");
if (serverCode.includes(caStr) && endCaIndex !== -1) {
    const startIndex = serverCode.indexOf(caStr);
    
    // We replace from startIndex to endCaIndex - 1 with our new function wrapper
    const newCaStr = `async function checkAndActivatePlans(userId: string, transaction?: admin.firestore.Transaction) {
    if (!db) return;
    try {
        await ActivationEngine.processPendingActivations(db, userId, transaction);
    } catch (e) {
        console.error("activation error: ", e);
    }
  }

  // 0. Start Investment (Generates Intervals)
  apiRouter.post('/start-investment', async (req, res) => {`;
  
    // perform replacing using substrings!
    const beforePart = serverCode.substring(0, startIndex);
    const afterPart = serverCode.substring(endCaIndex + "apiRouter.post('/start-investment', async (req, res) => {".length);
    serverCode = beforePart + newCaStr + afterPart;
}

// Replace cron.schedule
const cronStartStr = "cron.schedule('* * * * *', async () => {";
const cronEndStr = `  // Vite Integration (Frontend)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {`;

if (serverCode.includes(cronStartStr) && serverCode.includes(cronEndStr)) {
    const startIdx = serverCode.indexOf(cronStartStr);
    const endIdx = serverCode.indexOf(cronEndStr);
    
    const newCronStr = `cron.schedule('* * * * *', async () => {
    if (!db) return;
    await SchedulerEngine.runCycle(db);
  });

  // ==========================================
  // Vite Integration (Frontend)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {`;
  
    const part1 = serverCode.substring(0, startIdx);
    const part2 = serverCode.substring(endIdx + cronEndStr.length);
    serverCode = part1 + newCronStr + part2;
}

fs.writeFileSync('server.ts', serverCode);
console.log("Refactored successfully.");
