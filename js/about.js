// ==========================================================================
// ABOUT US PAGE
// Resort facts and the floor-by-floor room list, built from js/data.js.
// ==========================================================================

import { ROOM_TYPES, DEFAULT_INVENTORY, getRoomType, formatINR } from "./data.js";
import { initSite } from "./site.js";

initSite();

// --------------------------------------------------------------------------
// Facts
// --------------------------------------------------------------------------
const prices = ROOM_TYPES.map(r => r.price);
const floors = [...new Set(DEFAULT_INVENTORY.map(r => r.roomNo[0]))].sort();

const facts = [
    [String(DEFAULT_INVENTORY.length), "rooms"],
    [String(floors.length), "floors"],
    [String(ROOM_TYPES.length), "room styles"],
    [`${formatINR(Math.min(...prices))} – ${formatINR(Math.max(...prices))}`, "per night"],
    [`1 – ${Math.max(...ROOM_TYPES.map(r => r.capacity))}`, "guests per room"]
];

document.getElementById("aboutFacts").replaceChildren(...facts.map(([value, label]) => {
    const wrap = document.createElement("div");
    const dd = document.createElement("dd");
    dd.textContent = value;
    const dt = document.createElement("dt");
    dt.textContent = label;
    wrap.append(dd, dt);
    return wrap;
}));

// --------------------------------------------------------------------------
// Floor plan: room numbers start with their floor (101 = first floor)
// --------------------------------------------------------------------------
const FLOOR_NAMES = { 1: "First floor", 2: "Second floor", 3: "Third floor" };

document.getElementById("floorPlan").replaceChildren(...floors.map(floor => {
    const section = document.createElement("section");
    section.className = "floor";

    const heading = document.createElement("h3");
    heading.textContent = FLOOR_NAMES[floor] || `Floor ${floor}`;

    const list = document.createElement("ul");
    DEFAULT_INVENTORY.filter(r => r.roomNo[0] === floor).forEach(unit => {
        const type = getRoomType(unit.typeId);
        const item = document.createElement("li");

        const link = document.createElement("a");
        link.href = `booking.html?type=${type.id}`;

        const number = document.createElement("strong");
        number.textContent = `#${unit.roomNo}`;
        const name = document.createElement("span");
        name.textContent = type.name;
        const meta = document.createElement("small");
        meta.textContent = `Sleeps ${type.capacity} · ${formatINR(type.price)}`;

        link.append(number, name, meta);
        item.append(link);
        list.append(item);
    });

    section.append(heading, list);
    return section;
}));
