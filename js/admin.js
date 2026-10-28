// ==========================================================================
// PALM HORIZON RESORT & SPA - ULTRA LUXURY ADMIN DASHBOARD
// Interactive JavaScript (Pure In-Memory / No External Database)
// Strict Validations: Alphabets-only Name, Digits-only Room & Phone, Valid Dates
// ==========================================================================

// 1. Room Rates per night (for automatic pricing calculation)
const roomRates = {
    "Deluxe Ocean View": 5000,
    "Luxury Royal Suite": 7000,
    "Private Beach Villa": 10000,
    "Garden Villa": 4500
};

// 2. Room Inventory (12 Units Total)
let rooms = [
    { roomNo: "101", type: "Deluxe Ocean View", status: "available" },
    { roomNo: "102", type: "Deluxe Ocean View", status: "occupied" },
    { roomNo: "103", type: "Garden Villa",      status: "cleaning" },
    { roomNo: "104", type: "Deluxe Ocean View", status: "available" },
    { roomNo: "201", type: "Luxury Royal Suite", status: "occupied" },
    { roomNo: "202", type: "Luxury Royal Suite", status: "available" },
    { roomNo: "203", type: "Garden Villa",      status: "available" },
    { roomNo: "204", type: "Garden Villa",      status: "available" },
    { roomNo: "301", type: "Private Beach Villa", status: "available" },
    { roomNo: "302", type: "Private Beach Villa", status: "available" },
    { roomNo: "303", type: "Luxury Royal Suite", status: "available" },
    { roomNo: "304", type: "Deluxe Ocean View", status: "available" }
];

// 3. EXACTLY 2 Initial Manual Data Entries (Faculty Constraint)
let bookings = [
    {
        id: "RES-101",
        guestName: "Rohit Verma",
        phone: "9876543210",
        roomType: "Deluxe Ocean View",
        roomNo: "102",
        checkIn: "2026-10-28",
        checkOut: "2026-10-31",
        nights: 3,
        totalCost: 15000,
        status: "Confirmed"
    },
    {
        id: "RES-102",
        guestName: "Priya Sharma",
        phone: "9123456789",
        roomType: "Luxury Royal Suite",
        roomNo: "201",
        checkIn: "2026-10-29",
        checkOut: "2026-11-02",
        nights: 4,
        totalCost: 28000,
        status: "Confirmed"
    }
];

// ==========================================================================
// DOM Elements
// ==========================================================================
const roomGrid = document.getElementById("roomGrid");
const bookingsTableBody = document.getElementById("bookingsTableBody");
const searchInput = document.getElementById("searchInput");
const filterTabs = document.querySelectorAll(".filter-btn");

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

// KPI Stats
const statTotalRooms = document.getElementById("statTotalRooms");
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

const nameError = document.getElementById("nameError");
const phoneError = document.getElementById("phoneError");
const roomError = document.getElementById("roomError");
const checkInError = document.getElementById("checkInError");
const checkOutError = document.getElementById("checkOutError");

// Set default check-in & check-out dates
const today = new Date().toISOString().split("T")[0];
if (checkInInput) checkInInput.value = today;
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 2);
if (checkOutInput) checkOutInput.value = futureDate.toISOString().split("T")[0];

// ==========================================================================
// Function: Update Dynamic KPI Statistics Cards
// ==========================================================================
function updateDashboardStats() {
    const total = rooms.length;
    const occupied = rooms.filter(r => r.status === "occupied").length;
    const available = rooms.filter(r => r.status === "available").length;
    
    // Dynamic revenue sum
    const revenue = bookings.reduce((sum, b) => sum + (b.totalCost || 0), 0);
    const occupancyPercentage = Math.round((occupied / total) * 100);

    statTotalRooms.textContent = total;
    statOccupiedRooms.textContent = occupied;
    statAvailableRooms.textContent = available;
    statTotalRevenue.textContent = "₹" + revenue.toLocaleString("en-IN");
    statOccupancyRate.textContent = `${occupancyPercentage}% Occupancy`;
}

// ==========================================================================
// Function: Render Room Status Visualizer Grid
// ==========================================================================
function renderRoomGrid(filter = "all") {
    roomGrid.innerHTML = "";

    const filteredRooms = rooms.filter(room => {
        if (filter === "all") return true;
        return room.status === filter;
    });

    filteredRooms.forEach(room => {
        const tile = document.createElement("div");
        tile.className = `room-tile ${room.status}`;

        let statusLabel = "Available";
        if (room.status === "occupied") statusLabel = "Occupied";
        if (room.status === "cleaning") statusLabel = "Cleaning";

        tile.innerHTML = `
            <div class="room-number-display">#${room.roomNo}</div>
            <div class="room-type-subtitle">${room.type}</div>
            <span class="status-chip">${statusLabel}</span>
        `;

        tile.addEventListener("click", () => {
            const guest = bookings.find(b => b.roomNo === room.roomNo);
            if (guest) {
                showReservationPass(guest);
            } else {
                showToast(`Room #${room.roomNo} is ${statusLabel.toUpperCase()} (${room.type})`);
            }
        });

        roomGrid.appendChild(tile);
    });
}

// Filter Tabs Click
filterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
        filterTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        renderRoomGrid(tab.getAttribute("data-filter"));
    });
});

// ==========================================================================
// Function: Render Bookings Table
// ==========================================================================
function renderBookingsTable(dataToDisplay = bookings) {
    bookingsTableBody.innerHTML = "";

    if (dataToDisplay.length === 0) {
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 28px; color: var(--text-muted);">
                    No reservations matching your search criteria.
                </td>
            </tr>
        `;
        bookingCountText.textContent = "0 active bookings found";
        return;
    }

    dataToDisplay.forEach((booking) => {
        const tr = document.createElement("tr");

        const initials = booking.guestName
            .split(" ")
            .map(n => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

        const badgeStyle = booking.status === "Confirmed" 
            ? "background: var(--emerald-bg); color: var(--emerald-text); border: 1px solid rgba(16, 185, 129, 0.3);" 
            : "background: var(--amber-bg); color: var(--amber-text); border: 1px solid rgba(245, 158, 11, 0.3);";

        tr.innerHTML = `
            <td style="font-weight: 800; color: var(--gold-400); letter-spacing: 0.5px;">${booking.id}</td>
            <td>
                <div class="guest-profile-wrap">
                    <div class="guest-avatar-bubble">${initials}</div>
                    <div>
                        <div style="font-weight: 700; color: #ffffff;">${booking.guestName}</div>
                        <div style="font-size: 0.74rem; color: var(--text-muted);">+91 ${booking.phone}</div>
                    </div>
                </div>
            </td>
            <td>
                <div style="font-weight: 700; color: #ffffff;">Room #${booking.roomNo}</div>
                <div style="font-size: 0.74rem; color: var(--text-secondary);">${booking.roomType}</div>
            </td>
            <td style="font-weight: 500; color: var(--text-secondary);">${booking.checkIn}</td>
            <td style="font-weight: 500; color: var(--text-secondary);">${booking.checkOut}</td>
            <td style="font-weight: 800; color: var(--gold-300);">₹${booking.totalCost.toLocaleString("en-IN")}</td>
            <td>
                <span class="status-chip" style="${badgeStyle}">${booking.status}</span>
            </td>
            <td>
                <button class="btn-action-view" onclick="viewBookingDetails('${booking.id}')">View Pass</button>
                <button class="btn-action-checkout" onclick="checkoutBooking('${booking.id}')">Check Out</button>
            </td>
        `;

        bookingsTableBody.appendChild(tr);
    });

    bookingCountText.textContent = `Displaying ${dataToDisplay.length} active reservation(s)`;
}

// ==========================================================================
// FORM VALIDATIONS (Alphabet only Name, Digits only Phone & Room, Valid Dates)
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
roomInput.addEventListener("input", () => clearError(roomInput, roomError));
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
    const digitsOnlyRegex = /^[0-9]+$/;

    if (!phoneVal) {
        showError(phoneInput, phoneError, "Contact phone number is required.");
        isValid = false;
    } else if (!digitsOnlyRegex.test(phoneVal)) {
        showError(phoneInput, phoneError, "Invalid: Phone must contain only numbers (0-9).");
        isValid = false;
    } else if (phoneVal.length !== 10) {
        showError(phoneInput, phoneError, "Phone number must be exactly 10 digits.");
        isValid = false;
    } else {
        clearError(phoneInput, phoneError);
    }

    // 3. Room Number: Digits only & check room inventory availability
    const roomVal = roomInput.value.trim();

    if (!roomVal) {
        showError(roomInput, roomError, "Room number is required.");
        isValid = false;
    } else if (!digitsOnlyRegex.test(roomVal)) {
        showError(roomInput, roomError, "Invalid: Room number must contain only numbers.");
        isValid = false;
    } else {
        const targetRoom = rooms.find(r => r.roomNo === roomVal);
        if (!targetRoom) {
            showError(roomInput, roomError, `Room #${roomVal} does not exist in inventory.`);
            isValid = false;
        } else if (targetRoom.status === "occupied") {
            showError(roomInput, roomError, `Room #${roomVal} is already OCCUPIED! Choose an available room.`);
            isValid = false;
        } else if (targetRoom.status === "cleaning") {
            showError(roomInput, roomError, `Room #${roomVal} is under housekeeping / cleaning.`);
            isValid = false;
        } else {
            clearError(roomInput, roomError);
        }
    }

    // 4. Dates: Checkout must be after Checkin
    const checkInDate = new Date(checkInInput.value);
    const checkOutDate = new Date(checkOutInput.value);

    if (!checkInInput.value) {
        showError(checkInInput, checkInError, "Check-in date is required.");
        isValid = false;
    } else {
        clearError(checkInInput, checkInError);
    }

    if (!checkOutInput.value) {
        showError(checkOutInput, checkOutError, "Check-out date is required.");
        isValid = false;
    } else if (checkOutDate <= checkInDate) {
        showError(checkOutInput, checkOutError, "Check-out date must be strictly after check-in date.");
        isValid = false;
    } else {
        clearError(checkOutInput, checkOutError);
    }

    return isValid;
}

// Form Submit: Add New Reservation
newBookingForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const guestName = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const roomType = document.getElementById("roomType").value;
    const roomNo = roomInput.value.trim();
    const checkIn = checkInInput.value;
    const checkOut = checkOutInput.value;
    const paymentStatus = document.getElementById("paymentStatus").value;

    const diffTime = Math.abs(new Date(checkOut) - new Date(checkIn));
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const ratePerNight = roomRates[roomType] || 5000;
    const totalCost = nights * ratePerNight;

    const newId = "RES-" + (100 + bookings.length + 1);

    const newReservation = {
        id: newId,
        guestName,
        phone,
        roomType,
        roomNo,
        checkIn,
        checkOut,
        nights,
        totalCost,
        status: paymentStatus
    };

    bookings.unshift(newReservation);

    // Update Room status
    const roomObj = rooms.find(r => r.roomNo === roomNo);
    if (roomObj) {
        roomObj.status = "occupied";
        roomObj.type = roomType;
    }

    updateDashboardStats();
    renderRoomGrid();
    renderBookingsTable();

    closeModal();
    showToast(`Reservation ${newId} confirmed for ${guestName}!`);
});

// ==========================================================================
// RESERVATION PASS / RECEIPT MODAL
// ==========================================================================
function showReservationPass(booking) {
    receiptContent.innerHTML = `
        <div class="guest-receipt-card">
            <div class="receipt-head">
                <div>
                    <h4 style="font-size: 1.2rem; font-weight: 800; color: #ffffff;">${booking.guestName}</h4>
                    <span style="font-size: 0.76rem; color: var(--gold-400);">Contact: +91 ${booking.phone}</span>
                </div>
                <span class="status-chip" style="background: var(--emerald-bg); color: var(--emerald-text); border: 1px solid rgba(16, 185, 129, 0.3);">${booking.status}</span>
            </div>

            <div class="receipt-item">
                <span>Confirmation ID:</span>
                <span style="color: var(--gold-400); font-weight: 800; letter-spacing: 0.5px;">${booking.id}</span>
            </div>

            <div class="receipt-item">
                <span>Assigned Unit:</span>
                <span style="color: #ffffff; font-weight: 700;">Room #${booking.roomNo} (${booking.roomType})</span>
            </div>

            <div class="receipt-item">
                <span>Duration of Stay:</span>
                <span style="color: #ffffff; font-weight: 600;">${booking.nights || 1} Night(s)</span>
            </div>

            <div class="receipt-item">
                <span>Check-In Date:</span>
                <span style="color: #ffffff; font-weight: 600;">${booking.checkIn} (12:00 PM)</span>
            </div>

            <div class="receipt-item">
                <span>Check-Out Date:</span>
                <span style="color: #ffffff; font-weight: 600;">${booking.checkOut} (11:00 AM)</span>
            </div>

            <div class="receipt-grand-total">
                <span>Total Amount:</span>
                <span style="color: var(--gold-300); font-weight: 800;">₹${booking.totalCost.toLocaleString("en-IN")}</span>
            </div>
        </div>
    `;

    viewDetailsModal.classList.add("active");
}

window.viewBookingDetails = function(bookingId) {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) showReservationPass(booking);
};

// Check Out / Cancel
window.checkoutBooking = function(bookingId) {
    const index = bookings.findIndex(b => b.id === bookingId);
    if (index !== -1) {
        const b = bookings[index];
        const freedRoom = b.roomNo;
        
        const roomObj = rooms.find(r => r.roomNo === freedRoom);
        if (roomObj) roomObj.status = "available";

        bookings.splice(index, 1);

        updateDashboardStats();
        renderRoomGrid();
        renderBookingsTable();

        showToast(`Guest ${b.guestName} checked out! Room #${freedRoom} is now AVAILABLE 🟢`);
    }
};

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

if (openLookupModalBtn) openLookupModalBtn.addEventListener("click", openLookupModal);
if (closeLookupBtn) closeLookupBtn.addEventListener("click", closeLookupModal);

searchBookingBtn.addEventListener("click", () => {
    const query = lookupInput.value.trim().toLowerCase();

    if (!query) {
        lookupError.textContent = "Please enter Booking ID or Phone Number.";
        lookupError.classList.add("visible");
        return;
    }

    const found = bookings.find(b => 
        b.id.toLowerCase() === query || 
        b.phone === query || 
        b.guestName.toLowerCase().includes(query)
    );

    if (found) {
        closeLookupModal();
        showReservationPass(found);
    } else {
        lookupError.textContent = "No booking found with this ID or Phone Number.";
        lookupError.classList.add("visible");
    }
});

lookupInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchBookingBtn.click();
});

// Live Search Input Filter
searchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = bookings.filter(b => 
        b.guestName.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.roomNo.includes(q) ||
        b.roomType.toLowerCase().includes(q)
    );
    renderBookingsTable(filtered);
});

// ==========================================================================
// Modal Visibility Handlers
// ==========================================================================
function openModal() {
    bookingModal.classList.add("active");
}

function closeModal() {
    bookingModal.classList.remove("active");
    newBookingForm.reset();
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

window.addEventListener("click", (e) => {
    if (e.target === bookingModal) closeModal();
    if (e.target === viewDetailsModal) viewDetailsModal.classList.remove("active");
    if (e.target === lookupModal) closeLookupModal();
});

// Floating Toast Notification
function showToast(message) {
    toastText.textContent = message;
    toastMessage.classList.add("show");
    setTimeout(() => {
        toastMessage.classList.remove("show");
    }, 3200);
}

// Initial Boot
updateDashboardStats();
renderRoomGrid();
renderBookingsTable();
