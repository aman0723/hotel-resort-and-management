// ==========================================================================
// CONTACT PAGE
// Saves messages to Firestore (messages collection). Staff read them on the
// admin dashboard. Signed-in guests get their name and email filled in.
// ==========================================================================

import { initSite } from "./site.js";
import { watchUser } from "./auth.js";
import { sendContactMessage, MESSAGE_TOPICS } from "./db.js";

initSite();

const form = document.getElementById("contactForm");
const status = document.getElementById("contactStatus");
const submitButton = form.querySelector("button[type=submit]");

const nameInput = document.getElementById("contactName");
const emailInput = document.getElementById("contactEmail");
const phoneInput = document.getElementById("contactPhone");
const topicSelect = document.getElementById("contactTopic");
const bookingInput = document.getElementById("contactBooking");
const messageInput = document.getElementById("contactMessage");

MESSAGE_TOPICS.forEach(topic => {
    const option = document.createElement("option");
    option.value = topic;
    option.textContent = topic;
    topicSelect.append(option);
});

// Prefill from a link such as contact.html?booking=RES-4F2A9C
const params = new URLSearchParams(location.search);
if (params.get("booking")) {
    bookingInput.value = params.get("booking").slice(0, 20);
    topicSelect.value = "Change or cancel a booking";
}

let currentUid = null;
watchUser(session => {
    currentUid = session ? session.user.uid : null;
    if (!session) return;
    if (!nameInput.value) nameInput.value = session.profile.name || "";
    if (!emailInput.value) emailInput.value = session.user.email || "";
});

function showStatus(text, type) {
    status.textContent = text;
    status.className = `message ${type}`;
}

form.addEventListener("submit", async e => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const bookingCode = bookingInput.value.trim().toUpperCase();
    const message = messageInput.value.trim();

    if (name.length < 2) return showStatus("Please enter your name.", "error");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showStatus("Please enter a valid email address so we can reply.", "error");
    if (phone && !/^[0-9]{10}$/.test(phone)) return showStatus("Phone number should be 10 digits, or leave it empty.", "error");
    if (message.length < 10) return showStatus("Please write a little more so we can help (at least 10 characters).", "error");

    submitButton.disabled = true;
    showStatus("Sending your message...", "success");

    try {
        await sendContactMessage({ name, email, phone, topic: topicSelect.value, bookingCode, message }, currentUid);
        showStatus(`Message sent. The front desk will reply to ${email}.`, "success");
        messageInput.value = "";
        bookingInput.value = "";
        phoneInput.value = "";
    } catch (error) {
        console.error(error);
        showStatus("Your message couldn't be sent. Check your connection and try again.", "error");
    } finally {
        submitButton.disabled = false;
    }
});
