// ==========================================================================
// HOME PAGE
// Quick-booking bar and the rooms carousel (header/footer: site.js).
// The booking bar hands its choices to booking.html as URL parameters.
// ==========================================================================

import { ROOM_TYPES, todayISO, formatINR } from "./data.js";
import { initSite } from "./site.js";

initSite();

// --------------------------------------------------------------------------
// Quick-booking bar
// --------------------------------------------------------------------------
const bar = document.getElementById("bookingBar");
const barCheckIn = document.getElementById("barCheckIn");
const barCheckOut = document.getElementById("barCheckOut");
const barGuests = document.getElementById("barGuests");
const barRoom = document.getElementById("barRoom");
const barError = document.getElementById("barError");

barCheckIn.min = todayISO();
barCheckIn.value = todayISO(1);
barCheckOut.min = todayISO(2);
barCheckOut.value = todayISO(3);

ROOM_TYPES.forEach(room => {
    const option = document.createElement("option");
    option.value = room.id;
    option.textContent = `${room.name} · ${formatINR(room.price)}`;
    barRoom.append(option);
});

barCheckIn.addEventListener("change", () => {
    barCheckOut.min = barCheckIn.value || todayISO(1);
    if (barCheckOut.value && barCheckOut.value <= barCheckIn.value) barCheckOut.value = "";
});

bar.addEventListener("submit", e => {
    e.preventDefault();
    barError.textContent = "";

    if (!barCheckIn.value || !barCheckOut.value) {
        barError.textContent = "Choose your check-in and check-out dates.";
        return;
    }
    if (barCheckIn.value < todayISO()) {
        barError.textContent = "Check-in can't be in the past.";
        return;
    }
    if (barCheckOut.value <= barCheckIn.value) {
        barError.textContent = "Check-out must be after check-in.";
        return;
    }

    const room = ROOM_TYPES.find(r => r.id === barRoom.value);
    const guests = Number(barGuests.value);
    if (room && guests > room.capacity) {
        barError.textContent = `The ${room.name} sleeps up to ${room.capacity}. Pick a larger room or fewer guests.`;
        return;
    }

    const params = new URLSearchParams({ checkIn: barCheckIn.value, checkOut: barCheckOut.value, guests });
    if (room) params.set("type", room.id);
    location.href = `booking.html?${params}`;
});

// --------------------------------------------------------------------------
// Rooms carousel
// --------------------------------------------------------------------------
const track = document.getElementById("roomTrack");

track.replaceChildren(...ROOM_TYPES.map(room => {
    const card = document.createElement("article");
    card.className = "room-card";

    const img = document.createElement("img");
    img.src = room.image;
    img.alt = "";
    img.loading = "lazy";

    const body = document.createElement("div");
    body.className = "room-card-body";

    const category = document.createElement("p");
    category.className = "room-card-category";
    category.textContent = room.category;

    const name = document.createElement("h3");
    name.textContent = room.name;

    const details = document.createElement("p");
    details.textContent = `${room.features} · Sleeps ${room.capacity}`;

    const price = document.createElement("p");
    price.className = "room-card-price";
    price.textContent = `${formatINR(room.price)} / night`;

    const link = document.createElement("a");
    link.className = "btn btn-outline-light";
    link.href = `booking.html?type=${room.id}`;
    link.textContent = "Book this room";
    link.setAttribute("aria-label", `Book the ${room.name}`);

    body.append(category, name, details, price, link);
    card.append(img, body);
    return card;
}));

function scrollRooms(direction) {
    const card = track.querySelector(".room-card");
    const step = card ? card.getBoundingClientRect().width + 20 : 300;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
}

document.getElementById("prevRoom").addEventListener("click", () => scrollRooms(-1));
document.getElementById("nextRoom").addEventListener("click", () => scrollRooms(1));

track.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { e.preventDefault(); scrollRooms(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); scrollRooms(-1); }
});
