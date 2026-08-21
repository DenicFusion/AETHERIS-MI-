import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function sanitizeErrorMessage(rawError: unknown): string {
  if (!rawError) return "An unexpected error occurred. Please try again.";
  const msg = rawError instanceof Error ? rawError.message : String(rawError);

  if (msg.includes("auth/network-request-failed") || msg.toLowerCase().includes("network error")) {
    return "Unable to connect to security server. Please verify your internet connection and try again.";
  }
  if (msg.includes("auth/too-many-requests")) {
    return "Too many requests. Please wait a few moments before trying again.";
  }
  if (msg.includes("auth/user-disabled")) {
    return "This account has been suspended or deactivated. Please contact support.";
  }
  if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password") || msg.includes("auth/user-not-found")) {
    return "Invalid email address or password. Please verify your credentials.";
  }
  if (msg.includes("auth/email-already-in-use")) {
    return "This email address is already registered. Please sign in instead.";
  }
  if (msg.includes("auth/weak-password")) {
    return "Password is too weak. Please choose a stronger password with at least 8 characters.";
  }
  if (msg.includes("auth/invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (msg.includes("auth/popup-closed-by-user") || msg.includes("auth/cancelled-popup-request")) {
    return "Authentication was cancelled.";
  }
  if (msg.includes("insufficient-permission") || msg.includes("permission-denied")) {
    return "You do not have permission to perform this action.";
  }

  // Strip technical prefixes if present
  let clean = msg
    .replace(/^FirebaseError:\s*/i, "")
    .replace(/^Firebase:\s*Error\s*\([^)]*\):?\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .trim();

  // If the clean string still looks like an internal identifier or json, return generic friendly text
  if (clean.startsWith("{") || clean.includes("firestore") || clean.includes("RPC")) {
    return "Operation could not be completed. Please try again.";
  }

  return clean || "An unexpected error occurred. Please try again.";
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): Error {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId || undefined,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return new Error(JSON.stringify(errInfo));
}
