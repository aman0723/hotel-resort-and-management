// ==========================================================================
// ADMIN PORTAL: ACCOUNT (admin-account.html)
// Profile details, change display name, password reset email, log out.
// ==========================================================================

import { updateDisplayName, resetPassword, friendlyAuthError } from "../auth.js";
import { startAdmin, initials, renderAdminChip } from "./shell.js";

const $ = id => document.getElementById(id);

function formatDate(value) {
    const date = value ? new Date(value) : null;
    return date && !isNaN(date) ? date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "–";
}

const { user, profile } = await startAdmin();

function renderProfile(name) {
    $("profileAvatar").textContent = initials(name);
    $("profileName").textContent = name;
    $("profileEmail").textContent = user.email;
    $("displayName").value = name;
}

renderProfile(profile.name || user.email);
$("profileSince").textContent = formatDate(user.metadata.creationTime);
$("profileLastLogin").textContent = formatDate(user.metadata.lastSignInTime);
$("resetEmail").textContent = user.email;
$("heroSummary").textContent = `Signed in as ${user.email}.`;

// --------------------------------------------------------------------------
// Display name
// --------------------------------------------------------------------------
const nameForm = $("nameForm");
const nameInput = $("displayName");
const nameError = $("nameFormError");

nameInput.addEventListener("input", () => {
    nameInput.classList.remove("is-invalid");
    nameError.classList.remove("visible");
});

nameForm.addEventListener("submit", async e => {
    e.preventDefault();
    const name = nameInput.value.trim().replace(/\s+/g, " ");

    if (!/^[A-Za-z][A-Za-z\s.'-]{1,79}$/.test(name)) {
        nameInput.classList.add("is-invalid");
        nameError.textContent = "Use 2–80 letters (spaces, dots, apostrophes and hyphens are fine).";
        nameError.classList.add("visible");
        return;
    }

    const button = nameForm.querySelector("button[type=submit]");
    button.disabled = true;
    try {
        await updateDisplayName(user, name);
        renderProfile(name);
        renderAdminChip(name, user.email);
        nameError.textContent = "Name saved.";
        nameError.classList.add("visible", "is-success");
        setTimeout(() => nameError.classList.remove("visible", "is-success"), 2500);
    } catch (error) {
        console.error(error);
        nameInput.classList.add("is-invalid");
        nameError.textContent = "Your name couldn't be saved. Please try again.";
        nameError.classList.add("visible");
    } finally {
        button.disabled = false;
    }
});

// --------------------------------------------------------------------------
// Password reset
// --------------------------------------------------------------------------
$("resetPasswordBtn").addEventListener("click", async () => {
    const button = $("resetPasswordBtn");
    const status = $("passwordStatus");
    button.disabled = true;
    try {
        await resetPassword(user.email);
        status.textContent = `Reset link sent to ${user.email}. Check your inbox (and spam folder).`;
        status.className = "account-status success";
    } catch (error) {
        console.error(error);
        status.textContent = friendlyAuthError(error);
        status.className = "account-status error";
        button.disabled = false;
    }
});
