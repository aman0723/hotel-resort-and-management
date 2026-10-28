// ==========================================================================
// LOGIN PAGE
// Sign in, create account, and password reset with Firebase Authentication.
// After signing in, admins go to the dashboard and guests to where they came
// from (e.g. the booking page) or the rooms page.
// ==========================================================================

import {
    watchUser,
    signIn,
    signUp,
    resetPassword,
    friendlyAuthError,
    safeNextPage,
    homeFor
} from "./auth.js";
import { initSite } from "./site.js";

initSite();

const params = new URLSearchParams(location.search);
const nextPage = params.get("next");

const signInTab = document.getElementById("signInTab");
const signUpTab = document.getElementById("signUpTab");
const signInForm = document.getElementById("signInForm");
const signUpForm = document.getElementById("signUpForm");
const forgotBtn = document.getElementById("forgotBtn");
const message = document.getElementById("authMessage");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[A-Za-z\s.'-]{3,}$/;

let busy = false;

function redirect(profile) {
    location.replace(safeNextPage(nextPage, homeFor(profile)));
}

// Already signed in? Skip the form.
const stopWatching = watchUser(session => {
    stopWatching();
    if (session && !busy) redirect(session.profile);
});

function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = `message ${type}`;
}

function setBusy(form, isBusy) {
    busy = isBusy;
    const button = form.querySelector(".auth-submit");
    button.disabled = isBusy;
    button.textContent = isBusy ? "Please wait..." : button.dataset.label;
}

document.querySelectorAll(".auth-submit").forEach(b => b.dataset.label = b.textContent);

function switchTab(showSignUp) {
    signInTab.classList.toggle("active", !showSignUp);
    signUpTab.classList.toggle("active", showSignUp);
    signInTab.setAttribute("aria-selected", String(!showSignUp));
    signUpTab.setAttribute("aria-selected", String(showSignUp));
    signInForm.hidden = showSignUp;
    signUpForm.hidden = !showSignUp;
    showMessage("", "");
}

signInTab.addEventListener("click", () => switchTab(false));
signUpTab.addEventListener("click", () => switchTab(true));

if (params.get("mode") === "signup") switchTab(true);

// --------------------------------------------------------------------------
// Sign in
// --------------------------------------------------------------------------
signInForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("signInEmail").value.trim();
    const password = document.getElementById("signInPassword").value;

    if (!EMAIL_PATTERN.test(email)) return showMessage("Please enter a valid email address.");
    if (!password) return showMessage("Please enter your password.");

    setBusy(signInForm, true);
    try {
        const { profile } = await signIn(email, password);
        showMessage(`Welcome back, ${profile.name}!`, "success");
        redirect(profile);
    } catch (error) {
        console.error(error);
        showMessage(friendlyAuthError(error));
        setBusy(signInForm, false);
    }
});

// --------------------------------------------------------------------------
// Create account
// --------------------------------------------------------------------------
signUpForm.addEventListener("submit", async e => {
    e.preventDefault();
    const name = document.getElementById("signUpName").value.trim();
    const email = document.getElementById("signUpEmail").value.trim();
    const password = document.getElementById("signUpPassword").value;
    const confirm = document.getElementById("signUpConfirm").value;

    if (!NAME_PATTERN.test(name)) return showMessage("Name must be at least 3 letters (A-Z only).");
    if (!EMAIL_PATTERN.test(email)) return showMessage("Please enter a valid email address.");
    if (password.length < 6) return showMessage("Password must be at least 6 characters.");
    if (password !== confirm) return showMessage("Passwords do not match.");

    setBusy(signUpForm, true);
    try {
        const { profile } = await signUp(name, email, password);
        showMessage("Account created! Redirecting...", "success");
        redirect(profile);
    } catch (error) {
        console.error(error);
        showMessage(friendlyAuthError(error));
        setBusy(signUpForm, false);
    }
});

// --------------------------------------------------------------------------
// Password reset
// --------------------------------------------------------------------------
forgotBtn.addEventListener("click", async () => {
    const email = document.getElementById("signInEmail").value.trim();
    if (!EMAIL_PATTERN.test(email)) {
        return showMessage("Enter your email address above, then click \"Forgot password?\" again.");
    }
    try {
        await resetPassword(email);
        showMessage(`If an account exists for ${email}, a reset link has been sent.`, "success");
    } catch (error) {
        console.error(error);
        showMessage(friendlyAuthError(error));
    }
});
