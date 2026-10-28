// ==========================================================================
// FIREBASE PROJECT CONFIGURATION
// Replace the placeholder values below with your own project's web config:
// Firebase Console -> Project settings -> General -> Your apps -> Web app.
// These values identify the project; they are not secret. Access to data is
// controlled by Firestore security rules (see firestore.rules).
// ==========================================================================

export const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Set to true to use the local Firebase Emulator Suite instead of the real
// project (`npm run emulators`, see README). No Firebase account needed.
export const useEmulators = false;
