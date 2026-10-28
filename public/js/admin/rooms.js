// ==========================================================================
// ADMIN PORTAL: ROOMS (admin-rooms.html)
// Live room grid with filters and housekeeping, and a per-type summary.
// ==========================================================================

import { ROOM_TYPES, formatINR, escapeHTML } from "../data.js";
import { setRoomStatus } from "../db.js";
import { startAdmin, onData, store, roomTypeName, plural, STATUS_LABELS, showToast, reportError } from "./shell.js";
import { showBookingDetails, openWalkIn } from "./modals.js";

const $ = id => document.getElementById(id);
const filterButtons = document.querySelectorAll(".filter-btn[data-filter]");

let currentFilter = new URLSearchParams(location.search).get("filter") || "all";
if (!["all", "available", "occupied", "cleaning"].includes(currentFilter)) currentFilter = "all";

function setActiveFilter() {
    filterButtons.forEach(b => b.classList.toggle("active", b.dataset.filter === currentFilter));
}

filterButtons.forEach(button => button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    setActiveFilter();
    render();
}));
setActiveFilter();

async function onTileClick(room) {
    const guest = store.bookings.find(b => b.status === "Confirmed" && b.roomNo === room.roomNo);
    if (room.status === "occupied" && guest) return showBookingDetails(guest);

    if (room.status === "cleaning") {
        try {
            await setRoomStatus(room.roomNo, "available");
            showToast(`Room #${room.roomNo} is ready for guests.`);
        } catch (error) {
            reportError(error, "Could not update the room.");
        }
        return;
    }

    if (room.status === "available") return openWalkIn(room.roomNo);

    showToast(`Room #${room.roomNo} is ${STATUS_LABELS[room.status]?.toLowerCase() || room.status}.`);
}

function render() {
    const { rooms, bookings } = store;
    const count = status => rooms.filter(r => r.status === status).length;

    $("heroSummary").textContent =
        `${count("available")} available, ${count("occupied")} occupied and ${count("cleaning")} being cleaned, out of ${plural(rooms.length, "room")}.`;

    document.querySelectorAll(".filter-count[data-count]").forEach(el => {
        el.textContent = el.dataset.count === "all" ? rooms.length : count(el.dataset.count);
    });

    // Room grid
    const grid = $("roomGrid");
    grid.replaceChildren(...rooms
        .filter(r => currentFilter === "all" || r.status === currentFilter)
        .map(room => {
            const guest = bookings.find(b => b.status === "Confirmed" && b.roomNo === room.roomNo);
            const tile = document.createElement("button");
            tile.type = "button";
            tile.className = `room-tile ${room.status}`;
            const hint = room.status === "occupied" ? (guest ? guest.guestName : "Occupied")
                : room.status === "cleaning" ? "Click to mark ready"
                : "Click to book";
            tile.innerHTML = `
                <div class="room-number-display">#${escapeHTML(room.roomNo)}</div>
                <div class="room-type-subtitle">${escapeHTML(roomTypeName(room.typeId))}</div>
                <span class="status-chip">${STATUS_LABELS[room.status] || escapeHTML(room.status)}</span>
                <div class="room-tile-hint">${escapeHTML(hint)}</div>`;
            tile.addEventListener("click", () => onTileClick(room));
            return tile;
        }));
    if (!grid.children.length) {
        const empty = document.createElement("p");
        empty.className = "today-empty";
        empty.textContent = "No rooms with this status right now.";
        grid.append(empty);
    }

    // Per-type table
    $("typeTableBody").replaceChildren(...ROOM_TYPES.map(type => {
        const units = rooms.filter(r => r.typeId === type.id);
        const by = status => units.filter(r => r.status === status).length;
        const tr = document.createElement("tr");
        [
            type.name,
            String(units.length),
            String(by("available")),
            String(by("occupied")),
            String(by("cleaning")),
            String(type.capacity),
            formatINR(type.price)
        ].forEach((value, i) => {
            const td = document.createElement("td");
            td.textContent = value;
            if (i === 0) td.className = "type-name";
            if (i === 2 && by("available") === 0 && units.length) td.className = "none-free";
            tr.append(td);
        });
        return tr;
    }));
}

await startAdmin();
onData("rooms", render);
onData("bookings", render);
