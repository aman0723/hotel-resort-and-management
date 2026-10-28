// ==========================================================================
// AUTHENTICATION HELPERS
// Sign in / sign up / sign out, user profiles with roles, and page guards.
//
// Every user has a profile document at users/{uid}:
//   { name, email, role: "guest" | "admin", createdAt }
// New accounts are always created as "guest". Promote a staff account to
// "admin" from the Firebase Console (see README).
// ==========================================================================

import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./firebase.js";

// --------------------------------------------------------------------------
// Profiles
// --------------------------------------------------------------------------
async function loadProfile(user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data();

    // Account created outside the app (e.g. in the console): give it a guest profile.
    const profile = {
        name: user.displayName || user.email.split("@")[0],
        email: user.email,
        role: "guest",
        createdAt: serverTimestamp()
    };
    await setDoc(ref, profile);
    return profile;
}

// Calls back with { user, profile } when signed in, or null when signed out.
export function watchUser(callback) {
    return onAuthStateChanged(auth, async user => {
        if (!user) return callback(null);
        try {
            callback({ user, profile: await loadProfile(user) });
        } catch (error) {
            console.error("Could not load user profile:", error);
            callback({ user, profile: { name: user.email, email: user.email, role: "guest" } });
        }
    });
}

// --------------------------------------------------------------------------
// Page guards
// --------------------------------------------------------------------------
// Current page as "name.html?query", also when the server hides ".html".
function currentPage() {
    const page = location.pathname.split("/").pop() || "index.html";
    return (page.endsWith(".html") ? page : `${page}.html`) + location.search;
}

// Resolves with { user, profile } once a permitted user is signed in;
// otherwise redirects to the login page (or rooms page for non-admins).
export function requireAuth({ adminOnly = false } = {}) {
    return new Promise(resolve => {
        const stop = watchUser(session => {
            stop();
            if (!session) {
                location.replace(`login.html?next=${encodeURIComponent(currentPage())}`);
                return;
            }
            if (adminOnly && session.profile.role !== "admin") {
                location.replace("rooms.html?denied=1");
                return;
            }
            resolve(session);
        });
    });
}

// Only allow redirects to pages of this site (blocks open redirects).
export function safeNextPage(next, fallback) {
    return next && /^[a-z]+\.html(\?[\w=&%.-]*)?$/i.test(next) ? next : fallback;
}

export function homeFor(profile) {
    return profile.role === "admin" ? "admin.html" : "rooms.html";
}

// --------------------------------------------------------------------------
// Account actions
// --------------------------------------------------------------------------
export async function signIn(email, password) {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return { user, profile: await loadProfile(user) };
}

export async function signUp(name, email, password) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });
    const profile = { name, email, role: "guest", createdAt: serverTimestamp() };
    await setDoc(doc(db, "users", user.uid), profile);
    return { user, profile };
}

export function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
}

export async function logout() {
    await signOut(auth);
    location.href = "login.html";
}

export function friendlyAuthError(error) {
    const messages = {
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/missing-password": "Please enter your password.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/wrong-password": "Incorrect email or password.",
        "auth/user-not-found": "No account exists with this email.",
        "auth/email-already-in-use": "An account with this email already exists. Please sign in.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
        "auth/network-request-failed": "Network error. Check your connection and try again.",
        "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "Firebase is not configured. Add your config to js/firebase-config.js."
    };
    return messages[error.code] || "Something went wrong. Please try again.";
}

// --------------------------------------------------------------------------
// Shared navigation widget (guest pages)
// Fills `container` with either a "Sign in" link or the user's name + logout.
// --------------------------------------------------------------------------
export function renderAuthNav(container) {
    watchUser(session => {
        container.replaceChildren();

        if (!session) {
            const login = document.createElement("a");
            login.href = "login.html?next=" + encodeURIComponent(currentPage());
            login.className = "nav-auth-link";
            login.textContent = "Sign in";
            container.append(login);
            return;
        }

        const name = document.createElement("span");
        name.className = "nav-auth-user";
        name.textContent = session.profile.name;
        container.append(name);

        if (session.profile.role === "admin") {
            const admin = document.createElement("a");
            admin.href = "admin.html";
            admin.className = "nav-auth-link";
            admin.textContent = "Admin";
            container.append(admin);
        }

        const out = document.createElement("button");
        out.type = "button";
        out.className = "nav-auth-link";
        out.textContent = "Log out";
        out.addEventListener("click", logout);
        container.append(out);
    });
}
