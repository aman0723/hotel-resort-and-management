// ==========================================================================
// ADMIN PORTAL: MESSAGES (admin-messages.html)
// Messages sent from the Contact Us page. Reply by email, then mark them
// handled so the New tab only shows what still needs an answer.
// ==========================================================================

import { setMessageStatus } from "../db.js";
import { startAdmin, onData, store, plural, reportError } from "./shell.js";

const $ = id => document.getElementById(id);
const filters = document.querySelectorAll(".msg-filter");
let currentFilter = "New";

filters.forEach(button => button.addEventListener("click", () => {
    currentFilter = button.dataset.msgFilter;
    filters.forEach(b => b.classList.toggle("active", b === button));
    render();
}));

function emptyItem(text) {
    const li = document.createElement("li");
    li.className = "today-empty";
    li.textContent = text;
    return li;
}

function renderMessage(m) {
    const li = document.createElement("li");
    li.className = `message-item${m.status === "New" ? " is-new" : ""}`;

    const head = document.createElement("div");
    head.className = "message-head";
    const who = document.createElement("strong");
    who.textContent = m.name;
    const topic = document.createElement("span");
    topic.className = "message-topic";
    topic.textContent = m.topic;
    const when = document.createElement("time");
    const date = m.createdAt?.toDate?.();
    when.textContent = date ? date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Just now";
    head.append(who, topic, when);

    const meta = document.createElement("p");
    meta.className = "message-meta";
    const email = document.createElement("a");
    email.href = `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.topic}`)}`;
    email.textContent = m.email;
    meta.append(email);
    if (m.phone) meta.append(` · +91 ${m.phone}`);
    if (m.bookingCode) {
        meta.append(" · ");
        const booking = document.createElement("a");
        booking.href = `admin-bookings.html?tab=all&q=${encodeURIComponent(m.bookingCode)}`;
        booking.textContent = `Booking ${m.bookingCode}`;
        meta.append(booking);
    }

    const body = document.createElement("p");
    body.className = "message-body";
    body.textContent = m.message;

    const actions = document.createElement("div");
    actions.className = "message-actions";

    const reply = document.createElement("a");
    reply.className = "btn-action-view";
    reply.href = email.href;
    reply.textContent = "Reply by email";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "btn-action-view";
    toggle.textContent = m.status === "New" ? "Mark as handled" : "Move back to new";
    toggle.addEventListener("click", async () => {
        toggle.disabled = true;
        try {
            await setMessageStatus(m.id, m.status === "New" ? "Handled" : "New");
        } catch (error) {
            toggle.disabled = false;
            reportError(error, "Could not update the message.");
        }
    });

    actions.append(reply, toggle);
    li.append(head, meta, body, actions);
    return li;
}

function render() {
    const { messages } = store;
    const count = status => (status === "All" ? messages.length : messages.filter(m => m.status === status).length);

    document.querySelectorAll("[data-msg-count]").forEach(el => { el.textContent = count(el.dataset.msgCount); });

    const fresh = count("New");
    $("heroSummary").textContent = fresh
        ? `${plural(fresh, "new message")} waiting for a reply.`
        : "You're all caught up. New messages from the Contact Us page appear here.";
    $("messagesSummary").textContent = `${plural(messages.length, "message")} in total.`;

    const shown = messages.filter(m => currentFilter === "All" || m.status === currentFilter);
    $("messageList").replaceChildren(...(shown.length
        ? shown.map(renderMessage)
        : [emptyItem(currentFilter === "New" ? "Nothing waiting for a reply." : "No messages here yet.")]));
}

await startAdmin();
onData("messages", render);
