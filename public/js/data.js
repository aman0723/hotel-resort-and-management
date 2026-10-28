// ==========================================================================
// SHARED ROOM CATALOGUE & PRICING
// Single source of truth for room types, prices and the physical room
// inventory. Used by the rooms, booking and admin pages.
// ==========================================================================

export const RESORT_NAME = "Palm Horizon Resort & Spa";

// Public contact details shown on the site (home page and footer).
// Leave a value empty ("") to hide it rather than show a placeholder.
export const RESORT_CONTACT = {
    email: "",
    phone: "",     // e.g. "+91 98765 43210"
    address: ""    // e.g. "Beach Road, Calangute, Goa 403516"
};

export const TAX_RATE = 0.05;

// Room categories shown to guests.
export const ROOM_TYPES = [
    { id: "standard",     name: "Standard Room",      price: 2500,  category: "Standard", capacity: 1, features: "Single Bed • TV",          image: "images/room10.jpg" },
    { id: "deluxe",       name: "Deluxe Room",        price: 3500,  category: "Standard", capacity: 2, features: "King Bed • AC • WiFi",     image: "images/room1.jpg" },
    { id: "garden",       name: "Garden Room",        price: 3800,  category: "Standard", capacity: 2, features: "Garden View • WiFi",       image: "images/room8.jpg" },
    { id: "premium",      name: "Premium Room",       price: 4000,  category: "Standard", capacity: 2, features: "Queen Bed • AC",           image: "images/room6.jpg" },
    { id: "executive",    name: "Executive Room",     price: 4500,  category: "Standard", capacity: 2, features: "Work Desk • Smart TV",     image: "images/room4.jpg" },
    { id: "family",       name: "Family Room",        price: 5000,  category: "Family",   capacity: 4, features: "2 Double Beds • Balcony",  image: "images/room3.jpg" },
    { id: "suite",        name: "Suite Room",         price: 6000,  category: "Luxury",   capacity: 3, features: "Pool View • Breakfast",    image: "images/room2.jpg" },
    { id: "luxury",       name: "Luxury Room",        price: 7000,  category: "Luxury",   capacity: 2, features: "Sea View • Mini Bar",      image: "images/room5.jpg" },
    { id: "honeymoon",    name: "Honeymoon Suite",    price: 8500,  category: "Luxury",   capacity: 2, features: "Jacuzzi • Romantic View",  image: "images/room7.jpg" },
    { id: "presidential", name: "Presidential Suite", price: 12000, category: "Luxury",   capacity: 5, features: "Luxury Living Area",       image: "images/room9.jpg" }
];

// Physical room units. Written to Firestore the first time an admin opens
// the dashboard and the `rooms` collection is empty.
export const DEFAULT_INVENTORY = [
    { roomNo: "101", typeId: "standard",     status: "available" },
    { roomNo: "102", typeId: "deluxe",       status: "available" },
    { roomNo: "103", typeId: "garden",       status: "cleaning" },
    { roomNo: "104", typeId: "premium",      status: "available" },
    { roomNo: "201", typeId: "executive",    status: "available" },
    { roomNo: "202", typeId: "family",       status: "available" },
    { roomNo: "203", typeId: "family",       status: "available" },
    { roomNo: "204", typeId: "suite",        status: "available" },
    { roomNo: "301", typeId: "luxury",       status: "available" },
    { roomNo: "302", typeId: "honeymoon",    status: "available" },
    { roomNo: "303", typeId: "suite",        status: "available" },
    { roomNo: "304", typeId: "presidential", status: "available" }
];

// Friendly names, groups and descriptions for the features listed in
// ROOM_TYPES (keys must match the feature text exactly). Bed types are
// shown on the room cards instead.
export const AMENITY_INFO = {
    "Sea View":           { group: "Views",       name: "Sea view",              text: "Wide windows that face the sea." },
    "Pool View":          { group: "Views",       name: "Pool view",             text: "Looks out over the pool area." },
    "Garden View":        { group: "Views",       name: "Garden view",           text: "Opens onto the garden side of the resort." },
    "Romantic View":      { group: "Views",       name: "Private outlook",       text: "A quiet, private view, set up with couples in mind." },
    "AC":                 { group: "Comfort",     name: "Air conditioning",      text: "Climate control you set yourself." },
    "Balcony":            { group: "Comfort",     name: "Private balcony",       text: "Your own outdoor space attached to the room." },
    "Jacuzzi":            { group: "Comfort",     name: "Jacuzzi",               text: "An in-room jacuzzi tub." },
    "Luxury Living Area": { group: "Comfort",     name: "Separate living area",  text: "A lounge with seating, separate from the bedroom." },
    "WiFi":               { group: "Work & play", name: "Wi-Fi",                 text: "Wireless internet in the room." },
    "Work Desk":          { group: "Work & play", name: "Work desk",             text: "A proper desk and chair for working." },
    "Smart TV":           { group: "Work & play", name: "Smart TV",              text: "A smart TV for streaming apps." },
    "TV":                 { group: "Work & play", name: "Television",            text: "A TV in the room." },
    "Breakfast":          { group: "Included",    name: "Breakfast included",    text: "Breakfast is part of the nightly rate." },
    "Mini Bar":           { group: "Included",    name: "Mini bar",              text: "A mini bar in the room." }
};

// Features of a room type, without bed descriptions.
export function roomAmenities(room) {
    return room.features.split("•").map(f => f.trim()).filter(f => f && !/bed/i.test(f));
}

// Standard times, shown on booking details and the information pages.
export const CHECK_IN_TIME = "12:00 PM";
export const CHECK_OUT_TIME = "11:00 AM";

export function getRoomType(id) {
    return ROOM_TYPES.find(t => t.id === id);
}

// "YYYY-MM-DD" for today in the visitor's local time zone.
export function todayISO(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
}

export function countNights(checkIn, checkOut) {
    const start = new Date(`${checkIn}T00:00:00Z`);
    const end = new Date(`${checkOut}T00:00:00Z`);
    return Math.round((end - start) / 86400000);
}

export function priceStay(typeId, nights) {
    const rate = getRoomType(typeId).price;
    const subtotal = rate * nights;
    const tax = Math.round(subtotal * TAX_RATE);
    return { rate, subtotal, tax, total: subtotal + tax };
}

export function formatINR(amount) {
    return "₹" + Number(amount || 0).toLocaleString("en-IN");
}

// Escape user-entered text before inserting it into an HTML template.
export function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[ch]);
}
