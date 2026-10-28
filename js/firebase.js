// ==========================================================================
// FIREBASE INITIALISATION
// Loads the Firebase modular SDK from Google's CDN and exports the shared
// app, auth and Firestore instances used by every page.
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, useEmulators } from "./firebase-config.js";

export const isConfigured = useEmulators || !Object.values(firebaseConfig).some(v => String(v).includes("YOUR_"));

if (!isConfigured) {
    showSetupBanner();
}

// The emulators accept any "demo-" project id, so no real project is needed.
export const app = initializeApp(useEmulators ? { apiKey: "demo-key", projectId: "demo-palm-horizon" } : firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

if (useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

// Visible hint for teammates who cloned the repo without adding a config.
function showSetupBanner() {
    const banner = document.createElement("div");
    banner.className = "setup-banner";
    banner.textContent =
        "Firebase is not configured yet. Add your project's web config to js/firebase-config.js (see README).";
    Object.assign(banner.style, {
        position: "fixed", left: "0", right: "0", bottom: "0", zIndex: "9999",
        padding: "12px 16px", background: "#b91c1c", color: "#fff",
        font: "600 14px/1.4 system-ui, sans-serif", textAlign: "center"
    });
    // Module scripts run after the document is parsed, so <body> exists here.
    document.body.append(banner);
}
