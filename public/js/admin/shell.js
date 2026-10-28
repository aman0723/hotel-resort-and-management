// ==========================================================================
// ADMIN PORTAL: SHARED SHELL
// Every admin page calls startAdmin(). It checks the admin role, fills the
// top bar, starts one live Firestore listener each for rooms, bookings and
// messages, and keeps the sidebar counts up to date. Pages subscribe to the
// data they need with onData().
// ==========================================================================

import { getRoomType } from "../data.js";
import { requireAuth, logout } from "../auth.js";
import { seedRoomsIfEmpty, watchRooms, watchAllBookings, watchMessages } from "../db.js";

// Latest data from Firestore, shared by the page script and the modals.
export const store = { rooms: [], bookings: [], messages: [], session: null };

const subscribers = { rooms: [], bookings: [], messages: [] };
const loaded = { rooms: false, bookings: false, messages: false };

// Calls `callback(list)` now (if loaded) and on every change.
export function onData(kind, callback) {
    subscribers[kind].push(callback);
    if (loaded[kind]) callback(store[kind]);
}

function publish(kind, list) {
    store[kind] = list;
    loaded[kind] = true;
    subscribers[kind].forEach(cb => cb(list));
}

// --------------------------------------------------------------------------
// Small helpers used across admin pages
// --------------------------------------------------------------------------
export const STATUS_LABELS = { available: "Available", occupied: "Occupied", cleaning: "Cleaning" };

export function roomTypeName(typeId) {
    return getRoomType(typeId)?.name || typeId;
}

export function plural(n, word) {
    return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function initials(name) {
    return String(name || "").split(/[\s@.]+/).filter(Boolean).map(p => p[0]).join("").slice(0, 2).toUpperCase() || "–";
}

export function isActive(booking) {
    return booking.status === "Pending" || booking.status === "Confirmed";
}

let toastTimer;
export function showToast(message) {
    const toast = document.getElementById("toastMessage");
    document.getElementById("toastText").textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

export function reportError(error, message) {
    console.error(error);
    showToast(message);
}

function setCount(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = count;
    el.hidden = count === 0;
}

// --------------------------------------------------------------------------
// Start the portal
// --------------------------------------------------------------------------
// Small screens: the sidebar slides in from the left.
function initSidebarToggle() {
    const sidebar = document.getElementById("adminSidebar");
    const toggle = document.getElementById("sidebarToggle");
    const backdrop = document.getElementById("sidebarBackdrop");

    const setOpen = open => {
        sidebar.classList.toggle("open", open);
        backdrop.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };

    toggle.addEventListener("click", () => setOpen(!sidebar.classList.contains("open")));
    backdrop.addEventListener("click", () => setOpen(false));
    sidebar.addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && sidebar.classList.contains("open")) {
            setOpen(false);
            toggle.focus();
        }
    });
}

export async function startAdmin() {
    initSidebarToggle();
    document.querySelectorAll("#logoutBtn, [data-logout]").forEach(button =>
        button.addEventListener("click", logout)
    );

    // Top-bar search: filters bookings in place on the Bookings page,
    // and jumps to the Bookings page from anywhere else.
    const search = document.getElementById("searchInput");
    const onBookingsPage = location.pathname.endsWith("admin-bookings.html");
    search.addEventListener("keydown", e => {
        if (e.key === "Enter" && !onBookingsPage && search.value.trim()) {
            location.href = `admin-bookings.html?tab=all&q=${encodeURIComponent(search.value.trim())}`;
        }
    });

    const session = await requireAuth({ adminOnly: true });
    store.session = session;
    renderAdminChip(session.profile.name || session.user.email, session.user.email);

    try {
        await seedRoomsIfEmpty();
    } catch (error) {
        reportError(error, "Could not set up the room inventory. Check the Firestore rules.");
    }

    const liveStatus = document.getElementById("liveDate");
    const onError = error => {
        console.error(error);
        liveStatus.textContent = "Offline, reconnecting...";
    };

    watchRooms(list => {
        liveStatus.textContent = "Live";
        publish("rooms", list);
    }, onError);

    watchAllBookings(list => {
        setCount("navPendingCount", list.filter(b => b.status === "Pending").length);
        publish("bookings", list);
    }, onError);

    watchMessages(list => {
        setCount("navMessagesCount", list.filter(m => m.status === "New").length);
        publish("messages", list);
    }, onError);

    return session;
}

export function renderAdminChip(name, email) {
    document.getElementById("adminName").textContent = name;
    document.getElementById("adminRole").textContent = `Administrator · ${email}`;
    document.getElementById("adminAvatar").textContent = initials(name);
}
