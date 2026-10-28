
const bookingForm = document.getElementById("bookingForm");
const bookingMessage = document.getElementById("bookingMessage");

// Sample room prices per night (in INR).
const roomPrices = {
    standard: 2500,
    deluxe: 4000,
    suite: 6500
};

const roomCapacity = {
    standard: 2,
    deluxe: 3,
    suite: 5
};

// Get today's date in local time.
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Set the earliest permitted check-in date.
const checkInInput = document.getElementById("checkIn");
const checkOutInput = document.getElementById("checkOut");

checkInInput.min = getTodayDate();

checkInInput.addEventListener("change", () => {
    checkOutInput.min = checkInInput.value
        ? checkInInput.value
        : getTodayDate();

    if (
        checkOutInput.value &&
        checkOutInput.value <= checkInInput.value
    ) {
        checkOutInput.value = "";
    }
});

// Calculate the number of nights.
function calculateNights(checkIn, checkOut) {
    const start = new Date(`${checkIn}T00:00:00Z`);
    const end = new Date(`${checkOut}T00:00:00Z`);

    return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

// Format amounts in Indian currency.
function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(amount);
}

// Generate a booking reference.
function generateBookingId() {
    return "HTL" + Date.now().toString().slice(-8);
}

// Handle the booking form submission.
bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const checkIn = checkInInput.value;
    const checkOut = checkOutInput.value;
    const roomType = document.getElementById("roomType").value;
    const guests = Number(document.getElementById("guests").value);

    // Validate customer details.
    if (!fullName || !email || !phone) {
        showMessage("Please fill in all customer details.", "error");
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMessage("Please enter a valid email address.", "error");
        return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
        showMessage("Please enter a valid 10-digit phone number.", "error");
        return;
    }

    // Validate dates.
    if (!checkIn || !checkOut) {
        showMessage("Please select both check-in and check-out dates.", "error");
        return;
    }

    if (checkIn < getTodayDate()) {
        showMessage("Check-in date cannot be in the past.", "error");
        return;
    }

    const nights = calculateNights(checkIn, checkOut);

    if (nights <= 0) {
        showMessage("Check-out must be after check-in.", "error");
        return;
    }

    // Validate room selection and guest capacity.
    if (!Object.prototype.hasOwnProperty.call(roomPrices, roomType)) {
        showMessage("Please select a valid room type.", "error");
        return;
    }

    if (
        !Number.isInteger(guests) ||
        guests < 1 ||
        guests > roomCapacity[roomType]
    ) {
        showMessage(
            `This room allows 1 to ${roomCapacity[roomType]} guests.`,
            "error"
        );
        return;
    }

    // Calculate the estimated booking cost.
    const roomPrice = roomPrices[roomType];
    const subtotal = roomPrice * nights;
    const tax = subtotal * 0.05;
    const totalAmount = subtotal + tax;

    const booking = {
        bookingId: generateBookingId(),
        fullName,
        email,
        phone,
        checkIn,
        checkOut,
        roomType,
        guests,
        nights,
        roomPrice,
        subtotal,
        tax,
        totalAmount,
        status: "Pending",
        createdAt: new Date().toISOString()
    };

    // Save the booking in the browser.
    // This is a demo, not a shared or server-side booking database.
    try {
        const bookings = JSON.parse(
            localStorage.getItem("hotelBookings") || "[]"
        );

        if (!Array.isArray(bookings)) {
            throw new Error("Invalid booking data.");
        }

        bookings.push(booking);
        localStorage.setItem("hotelBookings", JSON.stringify(bookings));

        showBookingConfirmation(booking);
        bookingForm.reset();

        checkInInput.min = getTodayDate();
        checkOutInput.min = getTodayDate();
    } catch (error) {
        showMessage(
            "Unable to save this booking in your browser. Please try again.",
            "error"
        );
        console.error(error);
    }
});

// Display a safe status message.
function showMessage(message, type) {
    bookingMessage.textContent = message;
    bookingMessage.className = `booking-message ${type}`;
}

// Display booking confirmation and price breakdown.
function showBookingConfirmation(booking) {
    bookingMessage.className = "booking-message success";
    bookingMessage.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = "Booking Request Submitted!";

    const details = document.createElement("p");
    details.textContent =
        `Reference: ${booking.bookingId} | ` +
        `Guest: ${booking.fullName} | ` +
        `Room: ${booking.roomType} | ` +
        `Nights: ${booking.nights}`;

    const dates = document.createElement("p");
    dates.textContent =
        `Check-in: ${booking.checkIn} | Check-out: ${booking.checkOut}`;

    const price = document.createElement("p");
    price.textContent =
        `Room charges: ${formatCurrency(booking.subtotal)} | ` +
        `Estimated tax (5%): ${formatCurrency(booking.tax)} | ` +
        `Total: ${formatCurrency(booking.totalAmount)}`;

    const status = document.createElement("p");
    status.textContent =
        "Status: Pending confirmation from hotel staff.";

    bookingMessage.append(heading, details, dates, price, status);
}
