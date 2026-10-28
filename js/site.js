// ==========================================================================
// SHARED SITE CHROME
// Header behaviour (sticky colour change, mobile menu), the sign-in widget,
// contact details and the footer year. Every guest-facing page calls initSite().
// ==========================================================================

import { renderAuthNav } from "./auth.js";
import { RESORT_CONTACT, CHECK_IN_TIME, CHECK_OUT_TIME } from "./data.js";

export function initSite() {
    const header = document.getElementById("siteHeader");
    const menuToggle = document.getElementById("menuToggle");
    const mainNav = document.getElementById("mainNav");
    const authNav = document.getElementById("authNav");
    const year = document.getElementById("year");

    if (authNav) renderAuthNav(authNav);
    if (year) year.textContent = new Date().getFullYear();
    document.querySelectorAll("[data-contact-list]").forEach(renderContact);
    document.querySelectorAll("[data-time]").forEach(el => {
        el.textContent = el.dataset.time === "in" ? CHECK_IN_TIME : CHECK_OUT_TIME;
    });
    if (!header) return;

    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    menuToggle.addEventListener("click", () => {
        const open = header.classList.toggle("menu-open");
        menuToggle.setAttribute("aria-expanded", String(open));
    });

    mainNav.addEventListener("click", e => {
        if (e.target.closest("a")) {
            header.classList.remove("menu-open");
            menuToggle.setAttribute("aria-expanded", "false");
        }
    });
}

// Fills a container with the resort's email, phone and address from
// RESORT_CONTACT (js/data.js). Empty values are skipped; if none are set
// the container is hidden, so no placeholder details are ever shown.
function renderContact(container) {
    const { email, phone, address } = RESORT_CONTACT;
    const items = [];

    if (address) {
        const span = document.createElement("span");
        span.textContent = address;
        items.push(span);
    }
    if (email) {
        const a = document.createElement("a");
        a.href = `mailto:${email}`;
        a.textContent = email;
        items.push(a);
    }
    if (phone) {
        const a = document.createElement("a");
        a.href = `tel:${phone.replace(/[^+\d]/g, "")}`;
        a.textContent = phone;
        items.push(a);
    }

    container.replaceChildren(...items);
    container.hidden = items.length === 0;
}
