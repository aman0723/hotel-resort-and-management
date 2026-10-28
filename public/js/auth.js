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
// Signed out: a "Sign in" link. Signed in: one account button (initials and
// first name) that opens a menu with My reservations, the staff dashboard
// for admins, and Log out.
// --------------------------------------------------------------------------
let closeOpenMenu = null;

document.addEventListener("click", e => {
    if (closeOpenMenu && !e.target.closest(".account")) closeOpenMenu();
});
document.addEventListener("keydown", e => {
    if (e.key === "Escape" && closeOpenMenu) closeOpenMenu(true);
});

function initials(name) {
    return name.split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function menuLink(href, label) {
    const a = document.createElement("a");
    a.href = href;
    a.className = "account-item";
    a.setAttribute("role", "menuitem");
    a.textContent = label;
    return a;
}

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

        const { profile, user } = session;
        const fullName = profile.name || user.email;
        const menuId = "accountMenu";

        const wrap = document.createElement("div");
        wrap.className = "account";

        // Trigger: initials badge + first name
        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "account-trigger";
        trigger.setAttribute("aria-haspopup", "menu");
        trigger.setAttribute("aria-expanded", "false");
        trigger.setAttribute("aria-controls", menuId);

        const badge = document.createElement("span");
        badge.className = "account-badge";
        badge.textContent = initials(fullName);
        badge.setAttribute("aria-hidden", "true");

        const first = document.createElement("span");
        first.className = "account-name";
        first.textContent = fullName.split(/\s+/)[0];

        const caret = document.createElement("span");
        caret.className = "account-caret";
        caret.setAttribute("aria-hidden", "true");

        const srLabel = document.createElement("span");
        srLabel.className = "visually-hidden";
        srLabel.textContent = "Account menu for";

        trigger.append(srLabel, badge, first, caret);

        // Menu
        const menu = document.createElement("div");
        menu.className = "account-menu";
        menu.id = menuId;
        menu.setAttribute("role", "menu");
        menu.hidden = true;

        const head = document.createElement("div");
        head.className = "account-head";
        const headName = document.createElement("strong");
        headName.textContent = fullName;
        const headEmail = document.createElement("span");
        headEmail.textContent = user.email;
        head.append(headName, headEmail);

        if (profile.role === "admin") {
            const role = document.createElement("span");
            role.className = "account-role";
            role.textContent = "Staff";
            head.append(role);
        }

        menu.append(head, menuLink("reservations.html", "My reservations"));
        if (profile.role === "admin") menu.append(menuLink("admin.html", "Staff dashboard"));

        const out = document.createElement("button");
        out.type = "button";
        out.className = "account-item account-logout";
        out.setAttribute("role", "menuitem");
        out.textContent = "Log out";
        out.addEventListener("click", logout);
        menu.append(out);

        const items = () => [...menu.querySelectorAll(".account-item")];

        function close(returnFocus = false) {
            menu.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
            closeOpenMenu = null;
            if (returnFocus) trigger.focus();
        }

        function open() {
            if (closeOpenMenu) closeOpenMenu();
            menu.hidden = false;
            trigger.setAttribute("aria-expanded", "true");
            closeOpenMenu = close;
        }

        trigger.addEventListener("click", () => {
            if (menu.hidden) {
                open();
                items()[0].focus();
            } else {
                close();
            }
        });

        // Arrow keys move between menu items.
        menu.addEventListener("keydown", e => {
            const list = items();
            const i = list.indexOf(document.activeElement);
            if (e.key === "ArrowDown") { e.preventDefault(); list[(i + 1) % list.length].focus(); }
            if (e.key === "ArrowUp") { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
            if (e.key === "Tab") close();
        });

        wrap.append(trigger, menu);
        container.append(wrap);
    });
}
