import admin from 'firebase-admin';

const credentialsJson = process.env.FIREBASE_ADMIN_CREDENTIALS;

if (!admin.apps.length) {
  if (credentialsJson) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(credentialsJson)),
    });
  } else {
    admin.initializeApp();
  }
}

export const verifyFirebaseIdToken = (token: string) => admin.auth().verifyIdToken(token);
export const adminDb = admin.firestore();
