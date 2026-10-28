// ==========================================================================
// ADMIN PORTAL: BOOKINGS (admin-bookings.html)
// Every reservation in tabs (requests, in house, history, all), searchable
// from the top bar, with assign / details / check-out / cancel actions.
// ==========================================================================

import { formatINR, escapeHTML } from "../data.js";
import { startAdmin, onData, store, roomTypeName, initials, plural } from "./shell.js";
import { showBookingDetails, openAssign, checkOut, cancel } from "./modals.js";

const $ = id => document.getElementById(id);
const tbody = $("bookingsTableBody");
const search = $("searchInput");
const tabs = document.querySelectorAll(".booking-tab");

const TABS = {
    pending: { label: ["request waiting for a room", "requests waiting for a room"], test: b => b.status === "Pending" },
    inhouse: { label: ["guest in house", "guests in house"], test: b => b.status === "Confirmed" },
    history: { label: ["past or cancelled booking", "past and cancelled bookings"], test: b => b.status === "CheckedOut" || b.status === "Cancelled" },
    all: { label: ["booking", "bookings"], test: () => true }
};

const params = new URLSearchParams(location.search);
let currentTab = TABS[params.get("tab")] ? params.get("tab") : "pending";
if (params.get("q")) search.value = params.get("q").slice(0, 60);

function setActiveTab() {
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === currentTab));
}

tabs.forEach(tab => tab.addEventListener("click", () => {
    currentTab = tab.dataset.tab;
    setActiveTab();
    render();
}));
setActiveTab();

search.addEventListener("input", render);

function matchesSearch(b, q) {
    return !q ||
        b.guestName.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.roomNo || "").includes(q) ||
        b.phone.includes(q) ||
        (b.email || "").toLowerCase().includes(q) ||
        roomTypeName(b.typeId).toLowerCase().includes(q);
}

const STATUS_TEXT = { Pending: "Pending", Confirmed: "In house", CheckedOut: "Checked out", Cancelled: "Cancelled" };

function actionsFor(b) {
    if (b.status === "Pending") {
        return `<button class="btn-action-view" data-action="assign" data-id="${b.id}">Assign room</button>
                <button class="btn-action-checkout" data-action="cancel" data-id="${b.id}">Cancel</button>`;
    }
    if (b.status === "Confirmed") {
        return `<button class="btn-action-view" data-action="view" data-id="${b.id}">Details</button>
                <button class="btn-action-checkout" data-action="checkout" data-id="${b.id}">Check out</button>`;
    }
    return `<button class="btn-action-view" data-action="view" data-id="${b.id}">Details</button>`;
}

function render() {
    const q = search.value.trim().toLowerCase();
    const { bookings } = store;

    document.querySelectorAll("[data-tab-count]").forEach(el => {
        el.textContent = bookings.filter(TABS[el.dataset.tabCount].test).length;
    });

    const rows = bookings.filter(b => TABS[currentTab].test(b) && matchesSearch(b, q));

    $("bookingCountText").textContent =
        `${rows.length} ${TABS[currentTab].label[rows.length === 1 ? 0 : 1]}${q ? ` matching "${search.value.trim()}"` : ""}.`;

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-empty">${q ? "No bookings match your search." : "Nothing here right now."}</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(b => `
        <tr>
            <td class="cell-code">${escapeHTML(b.code)}</td>
            <td>
                <div class="guest-profile-wrap">
                    <div class="guest-avatar-bubble">${escapeHTML(initials(b.guestName))}</div>
                    <div>
                        <div class="cell-strong">${escapeHTML(b.guestName)}</div>
                        <div class="cell-sub">+91 ${escapeHTML(b.phone)}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="cell-strong">${b.roomNo ? `Room #${escapeHTML(b.roomNo)}` : "Not assigned"}</div>
                <div class="cell-sub">${escapeHTML(roomTypeName(b.typeId))} · ${b.source === "online" ? "Online" : "Walk-in"}</div>
            </td>
            <td class="cell-date">${escapeHTML(b.checkIn)}</td>
            <td class="cell-date">${escapeHTML(b.checkOut)}</td>
            <td class="cell-total">${formatINR(b.total)}</td>
            <td>
                <span class="status-chip status-${escapeHTML(b.status.toLowerCase())}">${STATUS_TEXT[b.status] || escapeHTML(b.status)}</span>
                <div class="cell-sub">${escapeHTML(b.payment)} · ${plural(b.guests || 1, "guest")}</div>
            </td>
            <td class="cell-actions">${actionsFor(b)}</td>
        </tr>`).join("");
}

tbody.addEventListener("click", async e => {
    const button = e.target.closest("button[data-action]");
    if (!button) return;
    const booking = store.bookings.find(b => b.id === button.dataset.id);
    if (!booking) return;

    if (button.dataset.action === "view") return showBookingDetails(booking);
    if (button.dataset.action === "assign") return openAssign(booking);

    button.disabled = true;
    const done = button.dataset.action === "checkout" ? await checkOut(booking) : await cancel(booking);
    if (!done) button.disabled = false;
});

await startAdmin();
onData("bookings", render);
