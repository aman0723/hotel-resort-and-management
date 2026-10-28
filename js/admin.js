// ==========================================================================
// PALM HORIZON RESORT & SPA - FRONT DESK DASHBOARD
// Live front-desk console backed by Firebase (Auth + Firestore).
// Only users whose profile role is "admin" can open this page.
// Strict Validations: Alphabets-only Name, Digits-only Phone, Valid Dates
// ==========================================================================

import { getRoomType, todayISO, countNights, priceStay, formatINR, escapeHTML } from "./data.js";
import { requireAuth, logout } from "./auth.js";
import {
    seedRoomsIfEmpty,
    watchRooms,
    watchAllBookings,
    setRoomStatus,
    createWalkInBooking,
    assignRoom,
    checkOutBooking,
    cancelBooking,
    watchMessages,
    setMessageStatus
} from "./db.js";

// Live data from Firestore.
let rooms = [];
let bookings = [];
let currentFilter = "all";
let session = null; // { user, profile } once the admin is verified

// ==========================================================================
// DOM Elements
// ==========================================================================
const roomGrid = document.getElementById("roomGrid");
const bookingsTableBody = document.getElementById("bookingsTableBody");
const searchInput = document.getElementById("searchInput");
const filterTabs = document.querySelectorAll(".filter-btn");
const liveStatus = document.getElementById("liveDate");

// Modals
const bookingModal = document.getElementById("bookingModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const newBookingForm = document.getElementById("newBookingForm");

const viewDetailsModal = document.getElementById("viewDetailsModal");
const closeDetailsModalBtn = document.getElementById("closeDetailsModalBtn");
const closeDetailsFooterBtn = document.getElementById("closeDetailsFooterBtn");
const receiptContent = document.getElementById("receiptContent");

const lookupModal = document.getElementById("lookupModal");
const openLookupModalBtn = document.getElementById("openLookupModalBtn");
const closeLookupBtn = document.getElementById("closeLookupBtn");
const searchBookingBtn = document.getElementById("searchBookingBtn");
const lookupInput = document.getElementById("lookupInput");
const lookupError = document.getElementById("lookupError");

const assignModal = document.getElementById("assignModal");
const assignSummary = document.getElementById("assignSummary");
const assignRoomSelect = document.getElementById("assignRoomSelect");
const assignError = document.getElementById("assignError");
const confirmAssignBtn = document.getElementById("confirmAssignBtn");

// KPI Stats
const statPending = document.getElementById("statPending");
const statPendingBadge = document.getElementById("statPendingBadge");
const statCleaningBadge = document.getElementById("statCleaningBadge");
const statGuestsBadge = document.getElementById("statGuestsBadge");
const statOccupiedRooms = document.getElementById("statOccupiedRooms");
const statAvailableRooms = document.getElementById("statAvailableRooms");
const statTotalRevenue = document.getElementById("statTotalRevenue");
const statOccupancyRate = document.getElementById("statOccupancyRate");
const bookingCountText = document.getElementById("bookingCountText");

// Today panel
const todayDate = document.getElementById("todayDate");
const heroSummary = document.getElementById("heroSummary");
const arrivalsList = document.getElementById("arrivalsList");
const departuresList = document.getElementById("departuresList");
const arrivalsCount = document.getElementById("arrivalsCount");
const departuresCount = document.getElementById("departuresCount");

// Toast
const toastMessage = document.getElementById("toastMessage");
const toastText = document.getElementById("toastText");

// Form Inputs & Error Spans
const nameInput = document.getElementById("guestName");
const phoneInput = document.getElementById("guestPhone");
const roomInput = document.getElementById("roomNumber");
const checkInInput = document.getElementById("checkInDate");
const checkOutInput = document.getElementById("checkOutDate");
const paymentInput = document.getElementById("paymentStatus");

const nameError = document.getElementById("nameError");
const phoneError = document.getElementById("phoneError");
const roomError = document.getElementById("roomError");
const checkInError = document.getElementById("checkInError");
const checkOutError = document.getElementById("checkOutError");

const STATUS_LABELS = { available: "Available", occupied: "Occupied", cleaning: "Cleaning" };

function roomTypeName(typeId) {
    return getRoomType(typeId)?.name || typeId;
}

function isActive(booking) {
    return booking.status === "Pending" || booking.status === "Confirmed";
}

// ==========================================================================
// KPI cards, room filter counts and the Today panel (all from live data)
// ==========================================================================
function plural(n, word) {
    return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function updateDashboardStats() {
    const total = rooms.length;
    const count = status => rooms.filter(r => r.status === status).length;
    const occupied = count("occupied");
    const available = count("available");
    const cleaning = count("cleaning");

    const inHouse = bookings.filter(b => b.status === "Confirmed");
    const pending = bookings.filter(b => b.status === "Pending");
    const revenue = inHouse.reduce((sum, b) => sum + (b.total || 0), 0);
    const occupancyPercentage = total ? Math.round((occupied / total) * 100) : 0;

    statPending.textContent = pending.length;
    statPendingBadge.textContent = pending.length ? "Assign a room to confirm" : "Nothing waiting";
    statOccupiedRooms.textContent = occupied;
    statOccupancyRate.textContent = `${occupancyPercentage}% of ${plural(total, "room")}`;
    statAvailableRooms.textContent = available;
    statCleaningBadge.textContent = cleaning ? `${cleaning} more being cleaned` : "Ready for guests";
    statTotalRevenue.textContent = formatINR(revenue);
    statGuestsBadge.textContent = `${plural(inHouse.length, "stay")} in progress`;

    document.querySelectorAll(".filter-count").forEach(el => {
        el.textContent = el.dataset.count === "all" ? total : count(el.dataset.count);
    });

    renderToday();
}

function renderToday() {
    const today = todayISO();
    const arrivals = bookings.filter(b => b.checkIn === today && isActive(b));
    const departures = bookings.filter(b => b.checkOut === today && b.status === "Confirmed");

    todayDate.textContent = new Date().toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    });

    const waiting = bookings.filter(b => b.status === "Pending").length;
    heroSummary.textContent =
        `${plural(arrivals.length, "arrival")} and ${plural(departures.length, "departure")} today` +
        (waiting ? ` · ${plural(waiting, "online request")} waiting for a room.` : ".");

    arrivalsCount.textContent = arrivals.length;
    departuresCount.textContent = departures.length;
    fillTodayList(arrivalsList, arrivals, "No arrivals expected today.");
    fillTodayList(departuresList, departures, "No departures due today.");
}

function fillTodayList(list, items, emptyText) {
    if (!items.length) {
        const empty = document.createElement("li");
        empty.className = "today-empty";
        empty.textContent = emptyText;
        list.replaceChildren(empty);
        return;
    }

    list.replaceChildren(...items.map(b => {
        const li = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "today-item";

        const name = document.createElement("strong");
        name.textContent = b.guestName;
        const detail = document.createElement("span");
        detail.textContent = `${b.roomNo ? `Room #${b.roomNo}` : "No room yet"} · ${roomTypeName(b.typeId)} · ${b.code}`;
        const status = document.createElement("em");
        status.className = `today-status ${b.status.toLowerCase()}`;
        status.textContent = b.status;

        button.append(name, detail, status);
        button.addEventListener("click", () => b.status === "Pending" ? openAssignModal(b) : showReservationPass(b));
        li.append(button);
        return li;
    }));
}

// ==========================================================================
// Function: Render Room Status Visualizer Grid
// ==========================================================================
function renderRoomGrid() {
    roomGrid.innerHTML = "";

    rooms
        .filter(room => currentFilter === "all" || room.status === currentFilter)
        .forEach(room => {
            const tile = document.createElement("div");
            tile.className = `room-tile ${room.status}`;
            tile.title = room.status === "cleaning" ? "Click to mark as cleaned and available" : "";

            tile.innerHTML = `
                <div class="room-number-display">#${escapeHTML(room.roomNo)}</div>
                <div class="room-type-subtitle">${escapeHTML(roomTypeName(room.typeId))}</div>
                <span class="status-chip">${STATUS_LABELS[room.status] || escapeHTML(room.status)}</span>
            `;

            tile.addEventListener("click", () => onRoomTileClick(room));
            roomGrid.appendChild(tile);
        });
}

async function onRoomTileClick(room) {
    const guest = bookings.find(b => b.status === "Confirmed" && b.roomNo === room.roomNo);
    if (guest) return showReservationPass(guest);

    if (room.status === "cleaning") {
        try {
            await setRoomStatus(room.roomNo, "available");
            showToast(`Room #${room.roomNo} is cleaned and available.`);
        } catch (error) {
            reportError(error, "Could not update the room status.");
        }
        return;
    }

    showToast(`Room #${room.roomNo} (${roomTypeName(room.typeId)}) is ${STATUS_LABELS[room.status].toLowerCase()}.`);
}

// Filter Tabs Click
filterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
        filterTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentFilter = tab.getAttribute("data-filter");
        renderRoomGrid();
    });
});

// ==========================================================================
// Function: Render Bookings Table (active reservations only)
// ==========================================================================
function filteredBookings() {
    const q = searchInput.value.toLowerCase().trim();
    return bookings.filter(b => isActive(b) && (
        !q ||
        b.guestName.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.roomNo || "").includes(q) ||
        b.phone.includes(q) ||
        roomTypeName(b.typeId).toLowerCase().includes(q)
    ));
}

function renderBookingsTable() {
    const dataToDisplay = filteredBookings();
    const pendingCount = bookings.filter(b => b.status === "Pending").length;
    bookingsTableBody.innerHTML = "";

    if (dataToDisplay.length === 0) {
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 28px; color: var(--text-muted);">
                    No active reservations${searchInput.value.trim() ? " matching your search" : ""}.
                </td>
            </tr>
        `;
        bookingCountText.textContent = "0 active bookings found";
        return;
    }

    dataToDisplay.forEach(booking => {
        const tr = document.createElement("tr");

        const initials = booking.guestName
            .split(" ")
            .filter(Boolean)
            .map(n => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

        const badgeStyle = booking.status === "Confirmed"
            ? "background: var(--emerald-bg); color: var(--emerald-text); border: 1px solid rgba(16, 185, 129, 0.3);"
            : "background: var(--amber-bg); color: var(--amber-text); border: 1px solid rgba(245, 158, 11, 0.3);";

        const actions = booking.status === "Pending"
            ? `<button class="btn-action-view" data-action="assign" data-id="${booking.id}">Assign Room</button>
               <button class="btn-action-checkout" data-action="cancel" data-id="${booking.id}">Cancel</button>`
            : `<button class="btn-action-view" data-action="view" data-id="${booking.id}">Details</button>
               <button class="btn-action-checkout" data-action="checkout" data-id="${booking.id}">Check Out</button>`;

        tr.innerHTML = `
            <td style="font-weight: 800; color: var(--gold-400); letter-spacing: 0.5px;">${escapeHTML(booking.code)}</td>
            <td>
                <div class="guest-profile-wrap">
                    <div class="guest-avatar-bubble">${escapeHTML(initials)}</div>
                    <div>
                        <div style="font-weight: 700; color: var(--text-primary);">${escapeHTML(booking.guestName)}</div>
                        <div style="font-size: 0.74rem; color: var(--text-muted);">+91 ${escapeHTML(booking.phone)}</div>
                    </div>
                </div>
            </td>
            <td>
                <div style="font-weight: 700; color: var(--text-primary);">${booking.roomNo ? `Room #${escapeHTML(booking.roomNo)}` : "Not assigned"}</div>
                <div style="font-size: 0.74rem; color: var(--text-secondary);">${escapeHTML(roomTypeName(booking.typeId))} · ${booking.source === "online" ? "Online" : "Walk-in"}</div>
            </td>
            <td style="font-weight: 500; color: var(--text-secondary);">${escapeHTML(booking.checkIn)}</td>
            <td style="font-weight: 500; color: var(--text-secondary);">${escapeHTML(booking.checkOut)}</td>
            <td style="font-weight: 800; color: var(--gold-300);">${formatINR(booking.total)}</td>
            <td>
                <span class="status-chip" style="${badgeStyle}">${escapeHTML(booking.status)}</span>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">${escapeHTML(booking.payment)}</div>
            </td>
            <td>${actions}</td>
        `;

        bookingsTableBody.appendChild(tr);
    });

    bookingCountText.textContent =
        `Displaying ${dataToDisplay.length} active reservation(s)` +
        (pendingCount ? ` · ${pendingCount} online request(s) awaiting a room` : "");
}

// Table action buttons (event delegation instead of inline onclick).
bookingsTableBody.addEventListener("click", async e => {
    const button = e.target.closest("button[data-action]");
    if (!button) return;
    const booking = bookings.find(b => b.id === button.dataset.id);
    if (!booking) return;

    switch (button.dataset.action) {
        case "view":
            showReservationPass(booking);
            break;
        case "assign":
            openAssignModal(booking);
            break;
        case "checkout":
            if (!confirm(`Check out ${booking.guestName} from Room #${booking.roomNo}?`)) return;
            button.disabled = true;
            try {
                await checkOutBooking(booking);
                showToast(`${booking.guestName} checked out. Room #${booking.roomNo} is now being cleaned.`);
            } catch (error) {
                button.disabled = false;
                reportError(error, "Check-out failed.");
            }
            break;
        case "cancel":
            if (!confirm(`Cancel booking ${booking.code} for ${booking.guestName}?`)) return;
            button.disabled = true;
            try {
                await cancelBooking(booking.id);
                showToast(`Booking ${booking.code} cancelled.`);
            } catch (error) {
                button.disabled = false;
                reportError(error, "Could not cancel the booking.");
            }
            break;
    }
});

// ==========================================================================
// FORM VALIDATIONS (Alphabet only Name, Digits only Phone, Valid Dates)
// ==========================================================================
function showError(inputElement, errorElement, message) {
    inputElement.classList.add("is-invalid");
    errorElement.textContent = message;
    errorElement.classList.add("visible");
}

function clearError(inputElement, errorElement) {
    inputElement.classList.remove("is-invalid");
    errorElement.textContent = "";
    errorElement.classList.remove("visible");
}

// Real-Time Clear on input
nameInput.addEventListener("input", () => clearError(nameInput, nameError));
phoneInput.addEventListener("input", () => clearError(phoneInput, phoneError));
roomInput.addEventListener("change", () => clearError(roomInput, roomError));
checkInInput.addEventListener("change", () => clearError(checkInInput, checkInError));
checkOutInput.addEventListener("change", () => clearError(checkOutInput, checkOutError));

function validateForm() {
    let isValid = true;

    // 1. Name: Alphabets only
    const nameVal = nameInput.value.trim();
    const alphabetRegex = /^[A-Za-z\s]+$/;

    if (!nameVal) {
        showError(nameInput, nameError, "Guest full name is required.");
        isValid = false;
    } else if (!alphabetRegex.test(nameVal)) {
        showError(nameInput, nameError, "Invalid: Name must contain only alphabets (A-Z, a-z).");
        isValid = false;
    } else if (nameVal.length < 3) {
        showError(nameInput, nameError, "Name must be at least 3 characters long.");
        isValid = false;
    } else {
        clearError(nameInput, nameError);
    }

    // 2. Phone: Exactly 10 digits
    const phoneVal = phoneInput.value.trim();

    if (!phoneVal) {
        showError(phoneInput, phoneError, "Contact phone number is required.");
        isValid = false;
    } else if (!/^[0-9]+$/.test(phoneVal)) {
        showError(phoneInput, phoneError, "Invalid: Phone must contain only numbers (0-9).");
        isValid = false;
    } else if (phoneVal.length !== 10) {
        showError(phoneInput, phoneError, "Phone number must be exactly 10 digits.");
        isValid = false;
    } else {
        clearError(phoneInput, phoneError);
    }

    // 3. Room: must be chosen and still available
    const targetRoom = rooms.find(r => r.roomNo === roomInput.value);
    if (!targetRoom) {
        showError(roomInput, roomError, "Please select an available room.");
        isValid = false;
    } else if (targetRoom.status !== "available") {
        showError(roomInput, roomError, `Room #${targetRoom.roomNo} is no longer available.`);
        isValid = false;
    } else {
        clearError(roomInput, roomError);
    }

    // 4. Dates: check-in today or later, checkout strictly after check-in
    if (!checkInInput.value) {
        showError(checkInInput, checkInError, "Check-in date is required.");
        isValid = false;
    } else if (checkInInput.value < todayISO()) {
        showError(checkInInput, checkInError, "Check-in date cannot be in the past.");
        isValid = false;
    } else {
        clearError(checkInInput, checkInError);
    }

    if (!checkOutInput.value) {
        showError(checkOutInput, checkOutError, "Check-out date is required.");
        isValid = false;
    } else if (checkInInput.value && checkOutInput.value <= checkInInput.value) {
        showError(checkOutInput, checkOutError, "Check-out date must be strictly after check-in date.");
        isValid = false;
    } else {
        clearError(checkOutInput, checkOutError);
    }

    return isValid;
}

// Fill a <select> with the currently available rooms.
function fillAvailableRooms(select, preferredTypeId) {
    const available = rooms.filter(r => r.status === "available");
    // Rooms of the requested type first.
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

// Form Submit: Add New Walk-in Reservation
newBookingForm.addEventListener("submit", async e => {
    e.preventDefault();

    if (!session || !validateForm()) return;

    const submitBtn = newBookingForm.querySelector("button[type=submit]");
    const room = rooms.find(r => r.roomNo === roomInput.value);
    const guestName = nameInput.value.trim();
    const checkIn = checkInInput.value;
    const checkOut = checkOutInput.value;
    const nights = countNights(checkIn, checkOut);

    submitBtn.disabled = true;
    try {
        const saved = await createWalkInBooking(session.user.uid, {
            guestName,
            email: "",
            phone: phoneInput.value.trim(),
            typeId: room.typeId,
            roomNo: room.roomNo,
            checkIn,
            checkOut,
            guests: 1,
            nights,
            ...priceStay(room.typeId, nights),
            payment: paymentInput.value,
            specialRequest: ""
        });
        closeModal();
        showToast(`Reservation ${saved.code} confirmed for ${guestName}!`);
    } catch (error) {
        showError(roomInput, roomError, error.message);
        console.error(error);
    } finally {
        submitBtn.disabled = false;
    }
});

// ==========================================================================
// ASSIGN ROOM TO ONLINE REQUEST
// ==========================================================================
let assignTarget = null;

function openAssignModal(booking) {
    assignTarget = booking;
    assignSummary.textContent =
        `${booking.code} · ${booking.guestName} · ${roomTypeName(booking.typeId)} · ` +
        `${booking.checkIn} → ${booking.checkOut} (${booking.guests} guest(s))`;
    fillAvailableRooms(assignRoomSelect, booking.typeId);
    // Preselect the first room of the requested type, if any.
    const match = rooms.find(r => r.status === "available" && r.typeId === booking.typeId);
    if (match) assignRoomSelect.value = match.roomNo;
    assignError.textContent = "";
    assignError.classList.remove("visible");
    assignModal.classList.add("active");
}

function closeAssignModal() {
    assignModal.classList.remove("active");
    assignTarget = null;
}

confirmAssignBtn.addEventListener("click", async () => {
    if (!assignTarget) return;
    const roomNo = assignRoomSelect.value;
    if (!roomNo) {
        assignError.textContent = "Please choose a room.";
        assignError.classList.add("visible");
        return;
    }
    confirmAssignBtn.disabled = true;
    try {
        await assignRoom(assignTarget.id, roomNo);
        showToast(`${assignTarget.code} confirmed in Room #${roomNo}.`);
        closeAssignModal();
    } catch (error) {
        console.error(error);
        assignError.textContent = error.message;
        assignError.classList.add("visible");
    } finally {
        confirmAssignBtn.disabled = false;
    }
});

document.getElementById("closeAssignBtn").addEventListener("click", closeAssignModal);
document.getElementById("cancelAssignBtn").addEventListener("click", closeAssignModal);

// ==========================================================================
// RESERVATION PASS / RECEIPT MODAL
// ==========================================================================
function showReservationPass(booking) {
    receiptContent.innerHTML = `
        <div class="guest-receipt-card">
            <div class="receipt-head">
                <div>
                    <h4 style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary);">${escapeHTML(booking.guestName)}</h4>
                    <span style="font-size: 0.76rem; color: var(--gold-400);">Contact: +91 ${escapeHTML(booking.phone)}</span>
                </div>
                <span class="status-chip" style="background: var(--emerald-bg); color: var(--emerald-text); border: 1px solid rgba(16, 185, 129, 0.3);">${escapeHTML(booking.status)}</span>
            </div>

            <div class="receipt-item">
                <span>Confirmation ID:</span>
                <span style="color: var(--gold-400); font-weight: 800; letter-spacing: 0.5px;">${escapeHTML(booking.code)}</span>
            </div>

            <div class="receipt-item">
                <span>Assigned Unit:</span>
                <span style="color: var(--text-primary); font-weight: 700;">${booking.roomNo ? `Room #${escapeHTML(booking.roomNo)}` : "Not assigned"} (${escapeHTML(roomTypeName(booking.typeId))})</span>
            </div>

            <div class="receipt-item">
                <span>Duration of Stay:</span>
                <span style="color: var(--text-primary); font-weight: 600;">${booking.nights || 1} Night(s) · ${booking.guests || 1} Guest(s)</span>
            </div>

            <div class="receipt-item">
                <span>Check-In Date:</span>
                <span style="color: var(--text-primary); font-weight: 600;">${escapeHTML(booking.checkIn)} (12:00 PM)</span>
            </div>

            <div class="receipt-item">
                <span>Check-Out Date:</span>
                <span style="color: var(--text-primary); font-weight: 600;">${escapeHTML(booking.checkOut)} (11:00 AM)</span>
            </div>

            ${booking.specialRequest ? `
            <div class="receipt-item">
                <span>Special Request:</span>
                <span style="color: var(--text-primary); font-weight: 600;">${escapeHTML(booking.specialRequest)}</span>
            </div>` : ""}

            <div class="receipt-item">
                <span>Room Charges + 5% Tax:</span>
                <span style="color: var(--text-primary); font-weight: 600;">${formatINR(booking.subtotal)} + ${formatINR(booking.tax)}</span>
            </div>

            <div class="receipt-grand-total">
                <span>Total Amount (${escapeHTML(booking.payment)}):</span>
                <span style="color: var(--gold-300); font-weight: 800;">${formatINR(booking.total)}</span>
            </div>
        </div>
    `;

    viewDetailsModal.classList.add("active");
}

// ==========================================================================
// QUICK LOOKUP: Find Reservation Modal
// ==========================================================================
function openLookupModal() {
    lookupInput.value = "";
    lookupError.textContent = "";
    lookupError.classList.remove("visible");
    lookupModal.classList.add("active");
}

function closeLookupModal() {
    lookupModal.classList.remove("active");
}

openLookupModalBtn.addEventListener("click", openLookupModal);
closeLookupBtn.addEventListener("click", closeLookupModal);

searchBookingBtn.addEventListener("click", () => {
    const query = lookupInput.value.trim().toLowerCase();

    if (!query) {
        lookupError.textContent = "Please enter Booking ID or Phone Number.";
        lookupError.classList.add("visible");
        return;
    }

    const found = bookings.find(b =>
        b.code.toLowerCase() === query ||
        b.phone === query ||
        b.guestName.toLowerCase().includes(query)
    );

    if (found) {
        closeLookupModal();
        if (found.status === "Pending") openAssignModal(found);
        else showReservationPass(found);
    } else {
        lookupError.textContent = "No booking found with this ID, name or phone number.";
        lookupError.classList.add("visible");
    }
});

lookupInput.addEventListener("keypress", e => {
    if (e.key === "Enter") searchBookingBtn.click();
});

// Live Search Input Filter
searchInput.addEventListener("input", renderBookingsTable);

// ==========================================================================
// Modal Visibility Handlers
// ==========================================================================
function openModal() {
    newBookingForm.reset();
    checkInInput.value = todayISO();
    checkInInput.min = todayISO();
    checkOutInput.value = todayISO(2);
    fillAvailableRooms(roomInput);
    bookingModal.classList.add("active");
}

function closeModal() {
    bookingModal.classList.remove("active");
    clearError(nameInput, nameError);
    clearError(phoneInput, phoneError);
    clearError(roomInput, roomError);
    clearError(checkInInput, checkInError);
    clearError(checkOutInput, checkOutError);
}

openModalBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
cancelModalBtn.addEventListener("click", closeModal);

closeDetailsModalBtn.addEventListener("click", () => viewDetailsModal.classList.remove("active"));
closeDetailsFooterBtn.addEventListener("click", () => viewDetailsModal.classList.remove("active"));

window.addEventListener("click", e => {
    if (e.target === bookingModal) closeModal();
    if (e.target === viewDetailsModal) viewDetailsModal.classList.remove("active");
    if (e.target === lookupModal) closeLookupModal();
    if (e.target === assignModal) closeAssignModal();
});

// Floating Toast Notification
let toastTimer;
function showToast(message) {
    toastText.textContent = message;
    toastMessage.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastMessage.classList.remove("show"), 3200);
}

function reportError(error, message) {
    console.error(error);
    showToast(message);
}

document.getElementById("logoutBtn").addEventListener("click", e => {
    e.preventDefault();
    logout();
});

// ==========================================================================
// Initial Boot: admin sign-in required, then live Firestore listeners
// ==========================================================================
session = await requireAuth({ adminOnly: true });

const adminName = session.profile.name || session.user.email;
document.getElementById("adminName").textContent = adminName;
document.getElementById("adminRole").textContent = `Administrator · ${session.user.email}`;
document.getElementById("adminAvatar").textContent = adminName
    .split(/[\s@.]/).filter(Boolean).map(n => n[0]).join("").substring(0, 2).toUpperCase();

try {
    if (await seedRoomsIfEmpty()) showToast("Room inventory created with 12 rooms.");
} catch (error) {
    reportError(error, "Could not set up the room inventory. Check Firestore rules.");
}

function onListenError(error) {
    console.error(error);
    liveStatus.textContent = "Offline, reconnecting...";
}

watchRooms(list => {
    rooms = list;
    liveStatus.textContent = "Live";
    updateDashboardStats();
    renderRoomGrid();
}, onListenError);

// ==========================================================================
// MESSAGES FROM THE CONTACT PAGE
// ==========================================================================
let messages = [];
let messageFilter = "New";
const messageList = document.getElementById("messageList");
const messagesSummary = document.getElementById("messagesSummary");

function renderMessages() {
    const newCount = messages.filter(m => m.status === "New").length;
    messagesSummary.textContent = newCount
        ? `${newCount} new message${newCount === 1 ? "" : "s"} from the Contact Us page.`
        : "No new messages. Messages sent from the Contact Us page appear here.";

    const shown = messages.filter(m => m.status === messageFilter);
    if (!shown.length) {
        const empty = document.createElement("li");
        empty.className = "today-empty";
        empty.textContent = messageFilter === "New" ? "Nothing waiting for a reply." : "No handled messages yet.";
        messageList.replaceChildren(empty);
        return;
    }

    messageList.replaceChildren(...shown.map(m => {
        const li = document.createElement("li");
        li.className = "message-item";

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
        if (m.bookingCode) meta.append(` · Booking ${m.bookingCode}`);

        const body = document.createElement("p");
        body.className = "message-body";
        body.textContent = m.message;

        const action = document.createElement("button");
        action.type = "button";
        action.className = "btn-action-view";
        action.textContent = m.status === "New" ? "Mark as handled" : "Move back to new";
        action.addEventListener("click", async () => {
            action.disabled = true;
            try {
                await setMessageStatus(m.id, m.status === "New" ? "Handled" : "New");
            } catch (error) {
                action.disabled = false;
                reportError(error, "Could not update the message.");
            }
        });

        li.append(head, meta, body, action);
        return li;
    }));
}

document.querySelectorAll(".msg-filter").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".msg-filter").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        messageFilter = button.dataset.msgFilter;
        renderMessages();
    });
});

watchMessages(list => {
    messages = list;
    renderMessages();
}, onListenError);

watchAllBookings(list => {
    bookings = list;
    updateDashboardStats();
    renderBookingsTable();
}, onListenError);
