// ==========================================================================
// GUEST BOOKING PAGE
// Signed-in guests submit booking requests (saved to Firestore as "Pending").
// Their bookings are listed on reservations.html.
// ==========================================================================

import { ROOM_TYPES, getRoomType, todayISO, countNights, priceStay, formatINR } from "./data.js";
import { requireAuth } from "./auth.js";
import { initSite } from "./site.js";
import { createBookingRequest } from "./db.js";

const bookingForm = document.getElementById("bookingForm");
const bookingMessage = document.getElementById("bookingMessage");
const priceEstimate = document.getElementById("priceEstimate");
const summaryImage = document.getElementById("summaryImage");
const summaryCategory = document.getElementById("summaryCategory");
const summaryName = document.getElementById("summaryName");
const summaryFeatures = document.getElementById("summaryFeatures");
const submitButton = bookingForm.querySelector("button[type=submit]");

const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const roomTypeSelect = document.getElementById("roomType");
const checkInInput = document.getElementById("checkIn");
const checkOutInput = document.getElementById("checkOut");
const guestsInput = document.getElementById("guests");
const requestInput = document.getElementById("request");

// Populate room types from the shared catalogue.
ROOM_TYPES.forEach(room => {
    const option = document.createElement("option");
    option.value = room.id;
    option.textContent = `${room.name} — ${formatINR(room.price)}/night (up to ${room.capacity})`;
    roomTypeSelect.append(option);
});

// Prefill choices from the rooms page or the home page booking bar
// (booking.html?type=deluxe&checkIn=2026-11-02&checkOut=2026-11-04&guests=2).
const params = new URLSearchParams(location.search);
const preselected = params.get("type");
if (getRoomType(preselected)) roomTypeSelect.value = preselected;

const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || "");
if (isDate(params.get("checkIn")) && params.get("checkIn") >= todayISO()) checkInInput.value = params.get("checkIn");
if (isDate(params.get("checkOut")) && params.get("checkOut") > checkInInput.value) checkOutInput.value = params.get("checkOut");
if (Number(params.get("guests")) >= 1) guestsInput.value = Math.min(Number(params.get("guests")), 5);

// Earliest permitted dates.
checkInInput.min = todayISO();
checkOutInput.min = checkInInput.value || todayISO(1);

checkInInput.addEventListener("change", () => {
    checkOutInput.min = checkInInput.value || todayISO(1);
    if (checkOutInput.value && checkOutInput.value <= checkInInput.value) {
        checkOutInput.value = "";
    }
    updateEstimate();
});

roomTypeSelect.addEventListener("change", () => {
    const room = getRoomType(roomTypeSelect.value);
    guestsInput.max = room ? room.capacity : 5;
    updateEstimate();
});
checkOutInput.addEventListener("change", updateEstimate);
guestsInput.max = getRoomType(roomTypeSelect.value)?.capacity ?? 5;
updateEstimate();

function updateEstimate() {
    const room = getRoomType(roomTypeSelect.value);

    // Summary card follows the selected room.
    summaryImage.src = room ? room.image : "images/room5.jpg";
    summaryImage.alt = room ? room.name : "";
    summaryCategory.textContent = room ? room.category : "Your stay";
    summaryName.textContent = room ? room.name : "Choose a room";
    summaryFeatures.textContent = room
        ? `${room.features} · Sleeps ${room.capacity} · ${formatINR(room.price)} / night`
        : "Pick a room and dates to see your total.";

    const nights = checkInInput.value && checkOutInput.value
        ? countNights(checkInInput.value, checkOutInput.value)
        : 0;

    if (!room || nights <= 0) {
        priceEstimate.textContent = "";
        return;
    }
    const { subtotal, tax, total } = priceStay(room.id, nights);
    priceEstimate.textContent =
        `${nights} night(s) × ${formatINR(room.price)} = ${formatINR(subtotal)} · 5% tax ${formatINR(tax)} · Total ${formatINR(total)}`;
}

// --------------------------------------------------------------------------
// Signed-in guest required
// --------------------------------------------------------------------------
initSite();
const { user, profile } = await requireAuth();

if (!fullNameInput.value) fullNameInput.value = profile.name || "";
if (!emailInput.value) emailInput.value = user.email || "";

// --------------------------------------------------------------------------
// Submit booking request
// --------------------------------------------------------------------------
bookingForm.addEventListener("submit", async event => {
    event.preventDefault();

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const checkIn = checkInInput.value;
    const checkOut = checkOutInput.value;
    const typeId = roomTypeSelect.value;
    const guests = Number(guestsInput.value);
    const specialRequest = requestInput.value.trim();

    // Validate customer details.
    if (!fullName || !email || !phone) {
        return showMessage("Please fill in all customer details.", "error");
    }
    if (!/^[A-Za-z\s.'-]{3,}$/.test(fullName)) {
        return showMessage("Name must be at least 3 letters (A-Z only).", "error");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return showMessage("Please enter a valid email address.", "error");
    }
    if (!/^[6-9][0-9]{9}$/.test(phone)) {
        return showMessage("Please enter a valid 10-digit mobile number.", "error");
    }

    // Validate dates.
    if (!checkIn || !checkOut) {
        return showMessage("Please select both check-in and check-out dates.", "error");
    }
    if (checkIn < todayISO()) {
        return showMessage("Check-in date cannot be in the past.", "error");
    }
    const nights = countNights(checkIn, checkOut);
    if (nights <= 0) {
        return showMessage("Check-out must be after check-in.", "error");
    }

    // Validate room selection and guest capacity.
    const room = getRoomType(typeId);
    if (!room) {
        return showMessage("Please select a valid room type.", "error");
    }
    if (!Number.isInteger(guests) || guests < 1 || guests > room.capacity) {
        return showMessage(`The ${room.name} allows 1 to ${room.capacity} guests.`, "error");
    }

    const booking = {
        guestName: fullName,
        email,
        phone,
        typeId,
        checkIn,
        checkOut,
        guests,
        nights,
        ...priceStay(typeId, nights),
        specialRequest
    };

    submitButton.disabled = true;
    showMessage("Submitting your booking...", "success");

    try {
        const saved = await createBookingRequest(user.uid, booking);
        showBookingConfirmation(saved);
        bookingForm.reset();
        fullNameInput.value = fullName;
        emailInput.value = email;
        guestsInput.value = 1;
        updateEstimate();
    } catch (error) {
        console.error(error);
        showMessage("Unable to save this booking. Please check your connection and try again.", "error");
    } finally {
        submitButton.disabled = false;
    }
});

// Display a safe status message.
function showMessage(message, type) {
    bookingMessage.textContent = message;
    bookingMessage.className = `message ${type}`;
}

// Display booking confirmation and price breakdown.
function showBookingConfirmation(booking) {
    bookingMessage.className = "message success";
    bookingMessage.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = "Booking Request Submitted!";

    const details = document.createElement("p");
    details.textContent =
        `Reference: ${booking.code} | ` +
        `Guest: ${booking.guestName} | ` +
        `Room: ${getRoomType(booking.typeId).name} | ` +
        `Nights: ${booking.nights}`;

    const dates = document.createElement("p");
    dates.textContent =
        `Check-in: ${booking.checkIn} | Check-out: ${booking.checkOut}`;

    const price = document.createElement("p");
    price.textContent =
        `Room charges: ${formatINR(booking.subtotal)} | ` +
        `Estimated tax (5%): ${formatINR(booking.tax)} | ` +
        `Total: ${formatINR(booking.total)}`;

    const status = document.createElement("p");
    status.textContent =
        "Status: Pending confirmation from hotel staff.";

    const link = document.createElement("a");
    link.href = "reservations.html";
    link.className = "text-link";
    link.textContent = "View in My reservations →";

    bookingMessage.append(heading, details, dates, price, status, link);
}
