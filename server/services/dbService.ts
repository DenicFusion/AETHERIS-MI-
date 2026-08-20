import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolves and returns the fully configured Firestore instance using the proper
 * custom databaseId specified in the firebase-applet-config.json file.
 */
export function getDb(): admin.firestore.Firestore {
  let config: any = {};
  try {
    config = JSON.parse(fs.readFileSync(path.resolve('./firebase-applet-config.json'), 'utf8'));
  } catch (e) {}

  if (config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)") {
    try {
      return getFirestore(admin.app(), config.firestoreDatabaseId) as any;
    } catch (e) {
      console.warn("[DB Helper] getFirestore custom databaseId failed, falling back to default.", e);
    }
  }
  return getFirestore() as any;
}
