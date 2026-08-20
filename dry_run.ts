import express from 'express';
import multer from 'multer';
import { ActivationEngine } from './engine/activationEngine';
import { SchedulerEngine } from './engine/schedulerEngine';
import { IntervalProcessor } from './engine/intervalProcessor';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import cron from 'node-cron';
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Resend } from 'resend';
import { GoogleGenAI } from "@google/genai";

console.log("Imports succeeded!");

try {
  const upload = multer();
  console.log("Multer initialized!");
} catch (e: any) {
  console.error("Multer failed:", e.message);
}

try {
  const apiKey = process.env.GEMINI_API_KEY || "dummy-key";
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
  console.log("GoogleGenAI initialized successfully!");
} catch (e: any) {
  console.error("GoogleGenAI failed:", e.message);
}

process.exit(0);
