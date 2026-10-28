// ==========================================================================
// ADMIN PORTAL: SHARED MODALS AND BOOKING ACTIONS
// Walk-in booking, booking details, assign a room, find a booking, plus
// check-out and cancel. The markup is identical on every admin page.
// ==========================================================================

import { getRoomType, todayISO, countNights, priceStay, formatINR, escapeHTML, CHECK_IN_TIME, CHECK_OUT_TIME } from "../data.js";
import { createWalkInBooking, assignRoom, checkOutBooking, cancelBooking } from "../db.js";
import { store, roomTypeName, showToast, reportError } from "./shell.js";

const $ = id => document.getElementById(id);

// --------------------------------------------------------------------------
// Generic open/close
// --------------------------------------------------------------------------
function openModal(modal) {
    modal.classList.add("active");
    const first = modal.querySelector("input, select, button:not(.modal-dismiss)");
    if (first) setTimeout(() => first.focus(), 50);
}

function closeModal(modal) {
    modal.classList.remove("active");
}

const MODAL_IDS = ["bookingModal", "viewDetailsModal", "lookupModal", "assignModal"];

window.addEventListener("click", e => {
    MODAL_IDS.forEach(id => { if (e.target === $(id)) closeModal($(id)); });
});
window.addEventListener("keydown", e => {
    if (e.key === "Escape") MODAL_IDS.forEach(id => closeModal($(id)));
});

// Fill a <select> with available rooms; rooms of `preferredTypeId` first.
function fillAvailableRooms(select, preferredTypeId) {
    const available = store.rooms.filter(r => r.status === "available");
    available.sort((a, b) =>
        (b.typeId === preferredTypeId) - (a.typeId === preferredTypeId) || a.roomNo.localeCompare(b.roomNo)
    );

    select.innerHTML = available.length
        ? '<option value="">Select an available room</option>'
        : '<option value="">No rooms available</option>';

    available.forEach(r => {
        const type = getRoomType(r.typeId);
        const option = document.createElement("option");
        option.value = r.roomNo;
        option.textContent = `#${r.roomNo} — ${type?.name || r.typeId} (${formatINR(type?.price)}/night)`;
        select.append(option);
    });
}

// --------------------------------------------------------------------------
// Walk-in booking
// --------------------------------------------------------------------------
const walkIn = {
    modal: $("bookingModal"),
    form: $("newBookingForm"),
    name: $("guestName"),
    phone: $("guestPhone"),
    room: $("roomNumber"),
    checkIn: $("checkInDate"),
    checkOut: $("checkOutDate"),
    payment: $("paymentStatus"),
    total: $("walkInTotal"),
    errors: {
        name: $("nameError"), phone: $("phoneError"), room: $("roomError"),
        checkIn: $("checkInError"), checkOut: $("checkOutError")
    }
};

function showFieldError(field, message) {
    walkIn[field].classList.add("is-invalid");
    walkIn.errors[field].textContent = message;
    walkIn.errors[field].classList.add("visible");
}

function clearFieldError(field) {
    walkIn[field].classList.remove("is-invalid");
    walkIn.errors[field].textContent = "";
    walkIn.errors[field].classList.remove("visible");
}

function updateWalkInTotal() {
    const room = store.rooms.find(r => r.roomNo === walkIn.room.value);
    const nights = walkIn.checkIn.value && walkIn.checkOut.value ? countNights(walkIn.checkIn.value, walkIn.checkOut.value) : 0;
    if (!room || nights <= 0) {
        walkIn.total.textContent = "";
        return;
    }
    const { rate, total } = priceStay(room.typeId, nights);
    walkIn.total.textContent = `${nights} night${nights === 1 ? "" : "s"} × ${formatINR(rate)} + 5% tax = ${formatINR(total)}`;
}

["name", "phone"].forEach(f => walkIn[f].addEventListener("input", () => clearFieldError(f)));
["room", "checkIn", "checkOut"].forEach(f => walkIn[f].addEventListener("change", () => {
    clearFieldError(f);
    updateWalkInTotal();
}));

export function openWalkIn(roomNo = "") {
    walkIn.form.reset();
    Object.keys(walkIn.errors).forEach(clearFieldError);
    walkIn.checkIn.value = todayISO();
    walkIn.checkIn.min = todayISO();
    walkIn.checkOut.value = todayISO(1);
    fillAvailableRooms(walkIn.room);
    if (roomNo) walkIn.room.value = roomNo;
    updateWalkInTotal();
    openModal(walkIn.modal);
}

function validateWalkIn() {
    let ok = true;
    const name = walkIn.name.value.trim();
    if (!name) { showFieldError("name", "Guest name is required."); ok = false; }
    else if (!/^[A-Za-z\s]+$/.test(name)) { showFieldError("name", "Name can only contain letters and spaces."); ok = false; }
    else if (name.length < 3) { showFieldError("name", "Name must be at least 3 characters."); ok = false; }

    const phone = walkIn.phone.value.trim();
    if (!/^[0-9]{10}$/.test(phone)) { showFieldError("phone", "Enter a 10-digit mobile number."); ok = false; }

    const room = store.rooms.find(r => r.roomNo === walkIn.room.value);
    if (!room) { showFieldError("room", "Select an available room."); ok = false; }
    else if (room.status !== "available") { showFieldError("room", `Room #${room.roomNo} is no longer available.`); ok = false; }

    if (!walkIn.checkIn.value) { showFieldError("checkIn", "Check-in date is required."); ok = false; }
    else if (walkIn.checkIn.value < todayISO()) { showFieldError("checkIn", "Check-in can't be in the past."); ok = false; }

    if (!walkIn.checkOut.value) { showFieldError("checkOut", "Check-out date is required."); ok = false; }
    else if (walkIn.checkIn.value && walkIn.checkOut.value <= walkIn.checkIn.value) { showFieldError("checkOut", "Check-out must be after check-in."); ok = false; }

    return ok;
}

walkIn.form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!store.session || !validateWalkIn()) return;

    const submit = walkIn.form.querySelector("button[type=submit]");
    const room = store.rooms.find(r => r.roomNo === walkIn.room.value);
    const guestName = walkIn.name.value.trim();
    const nights = countNights(walkIn.checkIn.value, walkIn.checkOut.value);

    submit.disabled = true;
    try {
        const saved = await createWalkInBooking(store.session.user.uid, {
            guestName,
            email: "",
            phone: walkIn.phone.value.trim(),
            typeId: room.typeId,
            roomNo: room.roomNo,
            checkIn: walkIn.checkIn.value,
            checkOut: walkIn.checkOut.value,
            guests: 1,
            nights,
            ...priceStay(room.typeId, nights),
            payment: walkIn.payment.value,
            specialRequest: ""
        });
        closeModal(walkIn.modal);
        showToast(`Booking ${saved.code} confirmed for ${guestName} in room #${room.roomNo}.`);
    } catch (error) {
        console.error(error);
        showFieldError("room", error.message);
    } finally {
        submit.disabled = false;
    }
});

$("closeModalBtn").addEventListener("click", () => closeModal(walkIn.modal));
$("cancelModalBtn").addEventListener("click", () => closeModal(walkIn.modal));

// --------------------------------------------------------------------------
// Booking details
// --------------------------------------------------------------------------
export function showBookingDetails(b) {
    const row = (label, value) => `
        <div class="receipt-item">
            <span>${label}</span>
            <span>${value}</span>
        </div>`;

    $("receiptContent").innerHTML = `
        <div class="guest-receipt-card">
            <div class="receipt-head">
                <div>
                    <h4>${escapeHTML(b.guestName)}</h4>
                    <span>+91 ${escapeHTML(b.phone)}${b.email ? ` · ${escapeHTML(b.email)}` : ""}</span>
                </div>
                <span class="status-chip status-${escapeHTML(b.status.toLowerCase())}">${escapeHTML(b.status)}</span>
            </div>
            ${row("Booking ID", escapeHTML(b.code))}
            ${row("Room", `${b.roomNo ? `#${escapeHTML(b.roomNo)}` : "Not assigned"} · ${escapeHTML(roomTypeName(b.typeId))}`)}
            ${row("Guests", `${b.guests || 1} · ${b.nights || 1} night${b.nights === 1 ? "" : "s"}`)}
            ${row("Check-in", `${escapeHTML(b.checkIn)}, ${CHECK_IN_TIME}`)}
            ${row("Check-out", `${escapeHTML(b.checkOut)}, ${CHECK_OUT_TIME}`)}
            ${row("Booked", b.source === "online" ? "Online" : "Walk-in")}
            ${b.specialRequest ? row("Special request", escapeHTML(b.specialRequest)) : ""}
            ${row("Room charges + 5% tax", `${formatINR(b.subtotal)} + ${formatINR(b.tax)}`)}
            <div class="receipt-grand-total">
                <span>Total (${escapeHTML(b.payment)})</span>
                <span>${formatINR(b.total)}</span>
            </div>
        </div>`;

    openModal($("viewDetailsModal"));
}

$("closeDetailsModalBtn").addEventListener("click", () => closeModal($("viewDetailsModal")));
$("closeDetailsFooterBtn").addEventListener("click", () => closeModal($("viewDetailsModal")));

// --------------------------------------------------------------------------
// Assign a room to an online request
// --------------------------------------------------------------------------
let assignTarget = null;

export function openAssign(b) {
    assignTarget = b;
    $("assignSummary").textContent =
        `${b.code} · ${b.guestName} · ${roomTypeName(b.typeId)} · ${b.checkIn} → ${b.checkOut} (${b.guests} guest${b.guests === 1 ? "" : "s"})`;
    const select = $("assignRoomSelect");
    fillAvailableRooms(select, b.typeId);
    const match = store.rooms.find(r => r.status === "available" && r.typeId === b.typeId);
    if (match) select.value = match.roomNo;
    $("assignError").textContent = "";
    $("assignError").classList.remove("visible");
    openModal($("assignModal"));
}

function closeAssign() {
    closeModal($("assignModal"));
    assignTarget = null;
}

$("confirmAssignBtn").addEventListener("click", async () => {
    if (!assignTarget) return;
    const roomNo = $("assignRoomSelect").value;
    const error = $("assignError");
    if (!roomNo) {
        error.textContent = "Choose a room.";
        error.classList.add("visible");
        return;
    }
    const button = $("confirmAssignBtn");
    button.disabled = true;
    try {
        await assignRoom(assignTarget.id, roomNo);
        showToast(`${assignTarget.code} confirmed in room #${roomNo}.`);
        closeAssign();
    } catch (err) {
        console.error(err);
        error.textContent = err.message;
        error.classList.add("visible");
    } finally {
        button.disabled = false;
    }
});

$("closeAssignBtn").addEventListener("click", closeAssign);
$("cancelAssignBtn").addEventListener("click", closeAssign);

// --------------------------------------------------------------------------
// Find a booking
// --------------------------------------------------------------------------
export function openLookup() {
    $("lookupInput").value = "";
    $("lookupError").textContent = "";
    $("lookupError").classList.remove("visible");
    openModal($("lookupModal"));
}

$("searchBookingBtn").addEventListener("click", () => {
    const query = $("lookupInput").value.trim().toLowerCase();
    const error = $("lookupError");
    if (!query) {
        error.textContent = "Enter a booking ID, name or phone number.";
        error.classList.add("visible");
        return;
    }
    const found = store.bookings.find(b =>
        b.code.toLowerCase() === query || b.phone === query || b.guestName.toLowerCase().includes(query)
    );
    if (!found) {
        error.textContent = "No booking matches that ID, name or phone number.";
        error.classList.add("visible");
        return;
    }
    closeModal($("lookupModal"));
    if (found.status === "Pending") openAssign(found);
    else showBookingDetails(found);
});

$("lookupInput").addEventListener("keydown", e => {
    if (e.key === "Enter") $("searchBookingBtn").click();
});
$("closeLookupBtn").addEventListener("click", () => closeModal($("lookupModal")));

// Hero buttons exist on the Dashboard, Rooms and Bookings pages.
$("openModalBtn")?.addEventListener("click", () => openWalkIn());
$("openLookupModalBtn")?.addEventListener("click", openLookup);

// --------------------------------------------------------------------------
// Check-out and cancel
// --------------------------------------------------------------------------
export async function checkOut(b) {
    if (!confirm(`Check out ${b.guestName} from room #${b.roomNo}?`)) return false;
    try {
        await checkOutBooking(b);
        showToast(`${b.guestName} checked out. Room #${b.roomNo} is now being cleaned.`);
        return true;
    } catch (error) {
        reportError(error, "Check-out failed. Please try again.");
        return false;
    }
}

export async function cancel(b) {
    if (!confirm(`Cancel booking ${b.code} for ${b.guestName}?`)) return false;
    try {
        await cancelBooking(b.id);
        showToast(`Booking ${b.code} cancelled.`);
        return true;
    } catch (error) {
        reportError(error, "Could not cancel the booking.");
        return false;
    }
}
