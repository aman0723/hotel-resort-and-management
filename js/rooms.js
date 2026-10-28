// ==========================================================================
// ROOMS & SUITES PAGE
// Renders the room catalogue with search, category filter and price sort.
// "Book Now" opens the booking page with the room type preselected.
// ==========================================================================

import { ROOM_TYPES, formatINR } from "./data.js";
import { initSite } from "./site.js";
import { watchRooms } from "./db.js";

const roomList = document.getElementById("roomList");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortSelect = document.getElementById("sortSelect");
const emptyState = document.getElementById("emptyState");
const notice = document.getElementById("notice");

initSite();

if (new URLSearchParams(location.search).get("denied")) {
    notice.textContent = "The admin dashboard is only available to staff accounts.";
    notice.hidden = false;
}

// Number of currently free units per room type (from Firestore, if reachable).
let availableByType = null;

function createCard(room) {
    const card = document.createElement("article");
    card.className = "room-card";

    const media = document.createElement("div");
    media.className = "room-card-media";
    const img = document.createElement("img");
    img.src = room.image;
    img.alt = room.name;
    img.loading = "lazy";
    media.append(img);

    const body = document.createElement("div");
    body.className = "room-card-body";

    const category = document.createElement("p");
    category.className = "room-card-category";
    category.textContent = room.category;

    const title = document.createElement("h2");
    title.textContent = room.name;

    const features = document.createElement("p");
    features.className = "room-card-features";
    features.textContent = `${room.features} · Sleeps ${room.capacity}`;

    const footer = document.createElement("div");
    footer.className = "room-card-footer";

    const price = document.createElement("p");
    price.className = "room-card-price";
    price.innerHTML = `${formatINR(room.price)} <small>/ night</small>`;
    footer.append(price);

    if (availableByType) {
        const free = availableByType[room.id] || 0;
        const badge = document.createElement("span");
        badge.className = free ? "status-pill confirmed" : "status-pill cancelled";
        badge.textContent = free ? `${free} available now` : "Fully booked today";
        footer.append(badge);
    }

    const book = document.createElement("a");
    book.className = "btn btn-ink btn-block";
    book.href = `booking.html?type=${room.id}`;
    book.textContent = "Book this room";
    book.setAttribute("aria-label", `Book the ${room.name}`);

    body.append(category, title, features, footer, book);
    card.append(media, body);
    return card;
}

function displayRooms() {
    const q = searchInput.value.trim().toLowerCase();
    const category = categoryFilter.value;

    const list = ROOM_TYPES.filter(r =>
        (r.name.toLowerCase().includes(q) || r.features.toLowerCase().includes(q)) &&
        (category === "All" || r.category === category)
    );

    if (sortSelect.value === "low") list.sort((a, b) => a.price - b.price);
    if (sortSelect.value === "high") list.sort((a, b) => b.price - a.price);

    roomList.replaceChildren(...list.map(createCard));
    emptyState.hidden = list.length > 0;
}

searchInput.addEventListener("input", displayRooms);
categoryFilter.addEventListener("change", displayRooms);
sortSelect.addEventListener("change", displayRooms);

displayRooms();

// Live availability badges. The catalogue still works if this fails
// (e.g. Firebase not configured yet or no inventory seeded).
watchRooms(rooms => {
    if (!rooms.length) return;
    availableByType = {};
    rooms.filter(r => r.status === "available")
        .forEach(r => availableByType[r.typeId] = (availableByType[r.typeId] || 0) + 1);
    displayRooms();
}, error => console.warn("Live availability unavailable:", error.message));
