// ==========================================================================
// BOOK DIRECT PAGE
// A worked price example calculated with the same function as the booking
// page, so the numbers always match.
// ==========================================================================

import { getRoomType, priceStay, formatINR } from "./data.js";
import { initSite } from "./site.js";

initSite();

const EXAMPLE_ROOM = "deluxe";
const EXAMPLE_NIGHTS = 3;

const room = getRoomType(EXAMPLE_ROOM);
const { rate, subtotal, tax, total } = priceStay(EXAMPLE_ROOM, EXAMPLE_NIGHTS);

const rows = [
    [`${room.name}, ${EXAMPLE_NIGHTS} nights`, `${formatINR(rate)} × ${EXAMPLE_NIGHTS}`],
    ["Room charges", formatINR(subtotal)],
    ["Tax (5%)", formatINR(tax)],
    ["Total", formatINR(total)]
];

const box = document.getElementById("priceExample");
const heading = document.createElement("p");
heading.className = "eyebrow";
heading.textContent = "Example";

const list = document.createElement("dl");
rows.forEach(([label, value], i) => {
    const row = document.createElement("div");
    if (i === rows.length - 1) row.className = "total";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    row.append(dt, dd);
    list.append(row);
});

box.append(heading, list);
