// ==========================================================================
// MY RESERVATIONS PAGE
// A signed-in guest's bookings, live from Firestore. Pending requests can
// be cancelled here; confirmed ones link to the contact page.
// ==========================================================================

import { getRoomType, formatINR, CHECK_IN_TIME, CHECK_OUT_TIME } from "./data.js";
import { requireAuth } from "./auth.js";
import { initSite } from "./site.js";
import { watchMyBookings, cancelBooking } from "./db.js";

initSite();

const list = document.getElementById("reservationsList");
const summary = document.getElementById("reservationsSummary");
const message = document.getElementById("reservationsMessage");

const STATUS_TEXT = {
    Pending: "Waiting for the front desk to assign your room.",
    Confirmed: "Your room is assigned. See you on arrival.",
    CheckedOut: "Stay completed.",
    Cancelled: "This booking was cancelled."
};

function showMessage(text, type) {
    message.textContent = text;
    message.className = `message ${type}`;
}

function detail(label, value) {
    const wrap = document.createElement("div");
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    wrap.append(dt, dd);
    return wrap;
}

function renderReservation(b) {
    const room = getRoomType(b.typeId);
    const item = document.createElement("li");
    item.className = "reservation";

    if (room) {
        const img = document.createElement("img");
        img.src = room.image;
        img.alt = "";
        img.loading = "lazy";
        item.append(img);
    }

    const body = document.createElement("div");
    body.className = "reservation-body";

    const top = document.createElement("div");
    top.className = "reservation-top";
    const title = document.createElement("h2");
    title.textContent = room ? room.name : b.typeId;
    const pill = document.createElement("span");
    pill.className = `status-pill ${b.status.toLowerCase()}`;
    pill.textContent = b.status === "CheckedOut" ? "Checked out" : b.status;
    top.append(title, pill);

    const note = document.createElement("p");
    note.className = "reservation-note";
    note.textContent = STATUS_TEXT[b.status] || "";

    const details = document.createElement("dl");
    details.className = "reservation-details";
    details.append(
        detail("Reference", b.code),
        detail("Check-in", `${b.checkIn}, from ${CHECK_IN_TIME}`),
        detail("Check-out", `${b.checkOut}, by ${CHECK_OUT_TIME}`),
        detail("Room", b.roomNo ? `#${b.roomNo}` : "Not assigned yet"),
        detail("Guests", String(b.guests || 1)),
        detail("Total", `${formatINR(b.total)} (${b.nights} night${b.nights === 1 ? "" : "s"} incl. 5% tax)`)
    );
    if (b.specialRequest) details.append(detail("Your request", b.specialRequest));

    body.append(top, note, details);

    const actions = document.createElement("div");
    actions.className = "reservation-actions";
    if (b.status === "Pending") {
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "cancel-btn";
        cancel.textContent = "Cancel request";
        cancel.addEventListener("click", async () => {
            if (!confirm(`Cancel booking ${b.code}?`)) return;
            cancel.disabled = true;
            try {
                await cancelBooking(b.id);
                showMessage(`Booking ${b.code} cancelled.`, "success");
            } catch (error) {
                console.error(error);
                cancel.disabled = false;
                showMessage("This booking couldn't be cancelled. Please try again.", "error");
            }
        });
        actions.append(cancel);
    } else if (b.status === "Confirmed") {
        const help = document.createElement("a");
        help.className = "text-link";
        help.href = `contact.html?booking=${encodeURIComponent(b.code)}`;
        help.textContent = "Need to change this booking?";
        actions.append(help);
    }
    if (actions.childElementCount) body.append(actions);

    item.append(body);
    return item;
}

const { user } = await requireAuth();

watchMyBookings(user.uid, bookings => {
    const active = bookings.filter(b => b.status === "Pending" || b.status === "Confirmed").length;
    summary.textContent = bookings.length
        ? `${bookings.length} booking${bookings.length === 1 ? "" : "s"}, ${active} active.`
        : "You haven't made any bookings yet.";

    if (!bookings.length) {
        const empty = document.createElement("li");
        empty.className = "reservation-empty";
        empty.innerHTML = 'When you book a room it will appear here. <a href="rooms.html">Browse rooms</a> to get started.';
        list.replaceChildren(empty);
        return;
    }
    list.replaceChildren(...bookings.map(renderReservation));
}, error => {
    console.error(error);
    summary.textContent = "Your reservations couldn't be loaded. Please refresh the page.";
});
