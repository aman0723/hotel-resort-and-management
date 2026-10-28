
"use strict";

const rooms = [
    { name: "Deluxe Room", price: 3500, type: "Standard" },
    { name: "Suite Room", price: 6000, type: "Luxury" },
    { name: "Family Room", price: 5000, type: "Family" },
    { name: "Executive Room", price: 4500, type: "Standard" },
    { name: "Luxury Room", price: 7000, type: "Luxury" },
    { name: "Premium Room", price: 4000, type: "Standard" },
    { name: "Honeymoon Suite", price: 8500, type: "Luxury" },
    { name: "Garden Room", price: 3800, type: "Standard" },
    { name: "Presidential Suite", price: 12000, type: "Luxury" },
    { name: "Standard Room", price: 2500, type: "Standard" }
];

const cards = [...document.querySelectorAll(".card")];
let bookings = [];

const search = document.createElement("input");
search.placeholder = "Search rooms...";
search.style.cssText = "padding:10px;margin:20px;";

const filter = document.createElement("select");
filter.innerHTML = `<option>All</option><option>Standard</option><option>Luxury</option><option>Family</option>`;

const sort = document.createElement("select");
sort.innerHTML = `<option value="">Default</option><option value="low">Price: Low to High</option><option value="high">Price: High to Low</option>`;

document.querySelector(".rooms").before(search, filter, sort);

function displayRooms() {
    let list = rooms.filter(r =>
        r.name.toLowerCase().includes(search.value.toLowerCase()) &&
        (filter.value === "All" || r.type === filter.value)
    );

    list.sort((a, b) => sort.value === "low" ? a.price - b.price :
        sort.value === "high" ? b.price - a.price : 0);

    cards.forEach(c => c.style.display = "none");

    list.forEach(r => {
        const c = cards.find(c => c.querySelector("h2").textContent === r.name);
        if (c) {
            c.style.display = "";
            document.querySelector(".rooms").append(c);
            c.querySelector("button").onclick = () => bookRoom(r);
        }
    });
}

search.oninput = displayRooms;
filter.onchange = sort.onchange = displayRooms;

function bookRoom(room) {
    const form = document.createElement("form");
    form.innerHTML = `
        <h2>${room.name} - ₹${room.price}/night</h2>
        <input id="name" placeholder="Full Name" required>
        <input id="email" type="email" placeholder="Email" required>
        <input id="phone" placeholder="10-digit Phone" required>
        <input id="in" type="date" required>
        <input id="out" type="date" required>
        <input id="guests" type="number" min="1" max="10" value="1" required>
        <button>Confirm Booking</button>
        <button type="button" id="close">Cancel</button>
        <p id="msg"></p>`;

    Object.assign(form.style, {
        position: "fixed", top: "15%", left: "10%",
        background: "white", padding: "20px", zIndex: "10"
    });

    form.querySelectorAll("input").forEach(i =>
        i.style.cssText = "display:block;padding:8px;margin:8px;width:250px"
    );

    document.body.append(form);

    form.querySelector("#close").onclick = () => form.remove();

    form.onsubmit = async e => {
        e.preventDefault();

        
form.onsubmit = async e => {
    e.preventDefault();

    const v = id => form.querySelector("#" + id).value.trim();
    const msg = form.querySelector("#msg");
    const errors = [];

    const name = v("name");
    const email = v("email");
    const phone = v("phone");
    const checkIn = v("in");
    const checkOut = v("out");
    const guests = Number(v("guests"));

    const nights = (new Date(checkOut) - new Date(checkIn)) / 86400000;

    if (!name) errors.push("Name is required.");
    else if (!/^[a-zA-Z ]+$/.test(name))
        errors.push("Name must contain letters only.");

    if (!email) errors.push("Email is required.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        errors.push("Enter a valid email address.");

    if (!phone) errors.push("Phone number is required.");
    else if (!/^[6-9]\d{9}$/.test(phone))
        errors.push("Enter a valid 10-digit Indian phone number.");

    if (!checkIn) errors.push("Check-in date is required.");
    if (!checkOut) errors.push("Check-out date is required.");

    if (checkIn && checkOut && nights <= 0)
        errors.push("Check-out must be after check-in.");

    if (checkIn && new Date(checkIn) < new Date(new Date().toDateString()))
        errors.push("Check-in cannot be in the past.");

    if (!Number.isInteger(guests) || guests < 1 || guests > 10)
        errors.push("Guests must be between 1 and 10.");

    if (errors.length) {
        msg.style.color = "red";
        msg.innerHTML = errors.join("<br>");
        return;
    }

    const booking = {
        name, email, phone,
        room: room.name, nights, guests,
        total: room.price * nights
    };

    msg.style.color = "green";
    msg.textContent = "Processing booking...";

    try {
        await new Promise(resolve => setTimeout(resolve, 500));
        bookings.push(booking);
        msg.textContent =
            `Booking Successful! Total: ₹${booking.total}`;
        console.table(bookings);
    } catch (error) {
        msg.style.color = "red";
        msg.textContent = "Booking failed. Please try again.";
        console.error(error);
    }
};

    };
}

displayRooms();
