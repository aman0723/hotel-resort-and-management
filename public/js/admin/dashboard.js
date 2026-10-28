// ==========================================================================
// ADMIN PORTAL: DASHBOARD (admin.html)
// Today at a glance: key numbers, arrivals and departures, and the three
// things that need attention (requests, rooms being cleaned, new messages).
// ==========================================================================

import { todayISO, formatINR } from "../data.js";
import { setRoomStatus } from "../db.js";
import { startAdmin, onData, store, roomTypeName, plural, isActive, showToast, reportError } from "./shell.js";
import { showBookingDetails, openAssign } from "./modals.js";

const $ = id => document.getElementById(id);

function emptyItem(text) {
    const li = document.createElement("li");
    li.className = "today-empty";
    li.textContent = text;
    return li;
}

// A clickable row: bold title, detail line, and a status or action label.
function listItem(title, detail, tag, tagClass, onClick) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "today-item";

    const strong = document.createElement("strong");
    strong.textContent = title;
    const span = document.createElement("span");
    span.textContent = detail;
    const em = document.createElement("em");
    em.className = `today-status ${tagClass}`;
    em.textContent = tag;

    button.append(strong, span, em);
    button.addEventListener("click", onClick);
    li.append(button);
    return li;
}

function openBooking(b) {
    return () => (b.status === "Pending" ? openAssign(b) : showBookingDetails(b));
}

// --------------------------------------------------------------------------
// KPI cards + today
// --------------------------------------------------------------------------
function renderSummary() {
    const { rooms, bookings } = store;
    const today = todayISO();
    const count = status => rooms.filter(r => r.status === status).length;

    const occupied = count("occupied");
    const cleaning = count("cleaning");
    const inHouse = bookings.filter(b => b.status === "Confirmed");
    const pending = bookings.filter(b => b.status === "Pending");
    const arrivals = bookings.filter(b => b.checkIn === today && isActive(b));
    const departures = bookings.filter(b => b.checkOut === today && b.status === "Confirmed");

    $("heroEyebrow").textContent = new Date().toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
    $("heroSummary").textContent =
        `${plural(arrivals.length, "arrival")} and ${plural(departures.length, "departure")} today` +
        (pending.length ? ` · ${plural(pending.length, "online request")} waiting for a room.` : ".");

    $("statPending").textContent = pending.length;
    $("statPendingBadge").textContent = pending.length ? "Assign a room to confirm" : "Nothing waiting";
    $("statOccupiedRooms").textContent = occupied;
    $("statOccupancyRate").textContent = `${rooms.length ? Math.round((occupied / rooms.length) * 100) : 0}% of ${plural(rooms.length, "room")}`;
    $("statAvailableRooms").textContent = count("available");
    $("statCleaningBadge").textContent = cleaning ? `${cleaning} more being cleaned` : "Ready for guests";
    $("statTotalRevenue").textContent = formatINR(inHouse.reduce((sum, b) => sum + (b.total || 0), 0));
    $("statGuestsBadge").textContent = `${plural(inHouse.length, "stay")} in progress`;

    $("arrivalsCount").textContent = arrivals.length;
    $("departuresCount").textContent = departures.length;

    const bookingRow = b => listItem(
        b.guestName,
        `${b.roomNo ? `Room #${b.roomNo}` : "No room yet"} · ${roomTypeName(b.typeId)} · ${b.code}`,
        b.status, b.status.toLowerCase(), openBooking(b)
    );

    $("arrivalsList").replaceChildren(...(arrivals.length ? arrivals.map(bookingRow) : [emptyItem("No arrivals expected today.")]));
    $("departuresList").replaceChildren(...(departures.length ? departures.map(bookingRow) : [emptyItem("No departures due today.")]));

    // Needs attention: requests waiting
    const pendingRows = pending.slice(0, 5).map(b => listItem(
        b.guestName,
        `${roomTypeName(b.typeId)} · ${b.checkIn} → ${b.checkOut}`,
        "Assign room", "pending", () => openAssign(b)
    ));
    $("pendingList").replaceChildren(...(pendingRows.length ? pendingRows : [emptyItem("No requests waiting.")]));

    // Needs attention: rooms being cleaned
    const cleaningRows = rooms.filter(r => r.status === "cleaning").map(r => listItem(
        `Room #${r.roomNo}`,
        roomTypeName(r.typeId),
        "Mark ready", "confirmed",
        async () => {
            try {
                await setRoomStatus(r.roomNo, "available");
                showToast(`Room #${r.roomNo} is ready for guests.`);
            } catch (error) {
                reportError(error, "Could not update the room.");
            }
        }
    ));
    $("cleaningList").replaceChildren(...(cleaningRows.length ? cleaningRows : [emptyItem("No rooms being cleaned.")]));
}

function renderMessagePreview(messages) {
    const fresh = messages.filter(m => m.status === "New").slice(0, 4);
    $("messagePreview").replaceChildren(...(fresh.length
        ? fresh.map(m => listItem(m.name, `${m.topic} · ${m.message.slice(0, 60)}${m.message.length > 60 ? "…" : ""}`, "New", "pending",
            () => { location.href = "admin-messages.html"; }))
        : [emptyItem("No new messages.")]));
}

await startAdmin();
onData("rooms", renderSummary);
onData("bookings", renderSummary);
onData("messages", renderMessagePreview);
