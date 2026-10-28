// ==========================================================================
// PALM HORIZON RESORT & SPA - ULTRA LUXURY ADMIN DASHBOARD
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
    cancelBooking
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
const statTotalRooms = document.getElementById("statTotalRooms");
const statUnitsBadge = document.getElementById("statUnitsBadge");
const statOccupiedRooms = document.getElementById("statOccupiedRooms");
const statAvailableRooms = document.getElementById("statAvailableRooms");
const statTotalRevenue = document.getElementById("statTotalRevenue");
const statOccupancyRate = document.getElementById("statOccupancyRate");
const bookingCountText = document.getElementById("bookingCountText");

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
// Function: Update Dynamic KPI Statistics Cards
// ==========================================================================
function updateDashboardStats() {
    const total = rooms.length;
    const occupied = rooms.filter(r => r.status === "occupied").length;
    const available = rooms.filter(r => r.status === "available").length;

    // Revenue from guests currently in house.
    const revenue = bookings
        .filter(b => b.status === "Confirmed")
        .reduce((sum, b) => sum + (b.total || 0), 0);
    const occupancyPercentage = total ? Math.round((occupied / total) * 100) : 0;

    statTotalRooms.textContent = total;
    statUnitsBadge.textContent = `${total} Active Units`;
    statOccupiedRooms.textContent = occupied;
    statAvailableRooms.textContent = available;
    statTotalRevenue.textContent = formatINR(revenue);
    statOccupancyRate.textContent = `${occupancyPercentage}% Occupancy`;
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
            showToast(`Room #${room.roomNo} cleaned and now AVAILABLE 🟢`);
        } catch (error) {
            reportError(error, "Could not update the room status.");
        }
        return;
    }

    showToast(`Room #${room.roomNo} is ${STATUS_LABELS[room.status].toUpperCase()} (${roomTypeName(room.typeId)})`);
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
            : `<button class="btn-action-view" data-action="view" data-id="${booking.id}">View Pass</button>
               <button class="btn-action-checkout" data-action="checkout" data-id="${booking.id}">Check Out</button>`;

        tr.innerHTML = `
            <td style="font-weight: 800; color: var(--gold-400); letter-spacing: 0.5px;">${escapeHTML(booking.code)}</td>
            <td>
                <div class="guest-profile-wrap">
                    <div class="guest-avatar-bubble">${escapeHTML(initials)}</div>
                    <div>
                        <div style="font-weight: 700; color: #ffffff;">${escapeHTML(booking.guestName)}</div>
                        <div style="font-size: 0.74rem; color: var(--text-muted);">+91 ${escapeHTML(booking.phone)}</div>
                    </div>
                </div>
            </td>
            <td>
                <div style="font-weight: 700; color: #ffffff;">${booking.roomNo ? `Room #${escapeHTML(booking.roomNo)}` : "Not assigned"}</div>
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
                showToast(`Guest ${booking.guestName} checked out! Room #${booking.roomNo} sent to CLEANING 🟡`);
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
                    <h4 style="font-size: 1.2rem; font-weight: 800; color: #ffffff;">${escapeHTML(booking.guestName)}</h4>
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
                <span style="color: #ffffff; font-weight: 700;">${booking.roomNo ? `Room #${escapeHTML(booking.roomNo)}` : "Not assigned"} (${escapeHTML(roomTypeName(booking.typeId))})</span>
            </div>

            <div class="receipt-item">
                <span>Duration of Stay:</span>
                <span style="color: #ffffff; font-weight: 600;">${booking.nights || 1} Night(s) · ${booking.guests || 1} Guest(s)</span>
            </div>

            <div class="receipt-item">
                <span>Check-In Date:</span>
                <span style="color: #ffffff; font-weight: 600;">${escapeHTML(booking.checkIn)} (12:00 PM)</span>
            </div>

            <div class="receipt-item">
                <span>Check-Out Date:</span>
                <span style="color: #ffffff; font-weight: 600;">${escapeHTML(booking.checkOut)} (11:00 AM)</span>
            </div>

            ${booking.specialRequest ? `
            <div class="receipt-item">
                <span>Special Request:</span>
                <span style="color: #ffffff; font-weight: 600;">${escapeHTML(booking.specialRequest)}</span>
            </div>` : ""}

            <div class="receipt-item">
                <span>Room Charges + 5% Tax:</span>
                <span style="color: #ffffff; font-weight: 600;">${formatINR(booking.subtotal)} + ${formatINR(booking.tax)}</span>
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
    showToast(`⚠️ ${message}`);
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
document.getElementById("adminAvatar").textContent = adminName
    .split(/[\s@.]/).filter(Boolean).map(n => n[0]).join("").substring(0, 2).toUpperCase();

try {
    if (await seedRoomsIfEmpty()) showToast("Room inventory created with 12 default units ✨");
} catch (error) {
    reportError(error, "Could not set up the room inventory. Check Firestore rules.");
}

function onListenError(error) {
    console.error(error);
    liveStatus.textContent = "Database connection error";
}

watchRooms(list => {
    rooms = list;
    liveStatus.textContent = "Operations Live & Synchronized";
    updateDashboardStats();
    renderRoomGrid();
}, onListenError);

watchAllBookings(list => {
    bookings = list;
    updateDashboardStats();
    renderBookingsTable();
}, onListenError);
