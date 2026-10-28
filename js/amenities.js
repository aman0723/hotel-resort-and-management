// ==========================================================================
// AMENITIES PAGE
// Amenities grouped by type with the rooms that have each one, plus a
// comparison table of every room. All from js/data.js.
// ==========================================================================

import { ROOM_TYPES, AMENITY_INFO, roomAmenities, formatINR } from "./data.js";
import { initSite } from "./site.js";

initSite();

// --------------------------------------------------------------------------
// Amenities grouped by type
// --------------------------------------------------------------------------
const roomsWith = feature => ROOM_TYPES.filter(r => roomAmenities(r).includes(feature));
const groups = [...new Set(Object.values(AMENITY_INFO).map(a => a.group))];

document.getElementById("amenityGroups").replaceChildren(...groups.map(group => {
    const section = document.createElement("section");
    section.className = "amenity-group";

    const heading = document.createElement("h2");
    heading.className = "group-title";
    heading.textContent = group;

    const grid = document.createElement("div");
    grid.className = "amenity-cards";

    Object.entries(AMENITY_INFO)
        .filter(([feature, info]) => info.group === group && roomsWith(feature).length)
        .forEach(([feature, info]) => {
            const card = document.createElement("article");
            card.className = "amenity-card";
            card.id = feature.toLowerCase().replace(/\s+/g, "-");

            const title = document.createElement("h3");
            title.textContent = info.name;
            const text = document.createElement("p");
            text.textContent = info.text;

            const rooms = document.createElement("ul");
            roomsWith(feature).forEach(room => {
                const li = document.createElement("li");
                const link = document.createElement("a");
                link.href = `booking.html?type=${room.id}`;
                link.textContent = `${room.name} · ${formatINR(room.price)}`;
                li.append(link);
                rooms.append(li);
            });

            card.append(title, text, rooms);
            grid.append(card);
        });

    section.append(heading, grid);
    return section;
}));

// --------------------------------------------------------------------------
// Comparison table
// --------------------------------------------------------------------------
document.getElementById("compareBody").replaceChildren(...ROOM_TYPES.map(room => {
    const row = document.createElement("tr");

    const name = document.createElement("th");
    name.scope = "row";
    const img = document.createElement("img");
    img.src = room.image;
    img.alt = "";
    img.loading = "lazy";
    const label = document.createElement("span");
    label.textContent = room.name;
    name.append(img, label);

    const cell = text => {
        const td = document.createElement("td");
        td.textContent = text;
        return td;
    };

    const amenities = room.features.split("•").map(f => AMENITY_INFO[f.trim()]?.name || f.trim()).join(", ");

    const bookCell = document.createElement("td");
    const book = document.createElement("a");
    book.className = "btn btn-outline";
    book.href = `booking.html?type=${room.id}`;
    book.textContent = "Book";
    book.setAttribute("aria-label", `Book the ${room.name}`);
    bookCell.append(book);

    row.append(name, cell(room.category), cell(String(room.capacity)), cell(formatINR(room.price)), cell(amenities), bookCell);
    return row;
}));
