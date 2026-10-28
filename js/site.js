// ==========================================================================
// SHARED SITE CHROME
// Header behaviour (sticky colour change, mobile menu), the sign-in widget
// and the footer year. Every guest-facing page calls initSite().
// ==========================================================================

import { renderAuthNav } from "./auth.js";

export function initSite() {
    const header = document.getElementById("siteHeader");
    const menuToggle = document.getElementById("menuToggle");
    const mainNav = document.getElementById("mainNav");
    const authNav = document.getElementById("authNav");
    const year = document.getElementById("year");

    if (authNav) renderAuthNav(authNav);
    if (year) year.textContent = new Date().getFullYear();
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
