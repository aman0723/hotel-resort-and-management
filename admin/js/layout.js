/* ==========================================================================
   layout.js — SVG Sprite · Sidebar · Topbar injection
   Injects shared chrome into every page so markup isn't duplicated.
   ========================================================================== */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. SVG Icon Sprite (Lucide/Feather-style, stroke, 24x24, 1.75px)
  //    Usage: <svg class="icon"><use href="#icon-dashboard"/></svg>
  // --------------------------------------------------------------------------
  var SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">' +
    /* dashboard */
    '<symbol id="icon-dashboard" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></symbol>' +
    /* bed */
    '<symbol id="icon-bed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M22 4v16"/><path d="M2 8h20"/><path d="M2 16h20"/><path d="M6 8v8"/><path d="M18 8v8"/></symbol>' +
    /* users */
    '<symbol id="icon-users" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></symbol>' +
    /* calendar */
    '<symbol id="icon-calendar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></symbol>' +
    /* concierge-bell */
    '<symbol id="icon-concierge-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 18H6a6 6 0 0 1 6-6 6 6 0 0 1 6 6z"/><path d="M12 6V3"/><path d="M3 18h18"/><circle cx="12" cy="6" r="1"/></symbol>' +
    /* credit-card */
    '<symbol id="icon-credit-card" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></symbol>' +
    /* id-badge */
    '<symbol id="icon-id-badge" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 17h4"/></symbol>' +
    /* search */
    '<symbol id="icon-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></symbol>' +
    /* bell */
    '<symbol id="icon-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></symbol>' +
    /* plus */
    '<symbol id="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></symbol>' +
    /* edit */
    '<symbol id="icon-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></symbol>' +
    /* trash */
    '<symbol id="icon-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></symbol>' +
    /* eye */
    '<symbol id="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></symbol>' +
    /* check */
    '<symbol id="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></symbol>' +
    /* x */
    '<symbol id="icon-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></symbol>' +
    /* menu (hamburger) */
    '<symbol id="icon-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></symbol>' +
    /* logout */
    '<symbol id="icon-logout" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></symbol>' +
    /* printer */
    '<symbol id="icon-printer" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></symbol>' +
    /* filter */
    '<symbol id="icon-filter" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></symbol>' +
    /* grid */
    '<symbol id="icon-grid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></symbol>' +
    /* list */
    '<symbol id="icon-list" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></symbol>' +
    /* star */
    '<symbol id="icon-star" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></symbol>' +
    /* chevron-down */
    '<symbol id="icon-chevron-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></symbol>' +
    /* sparkle (4-point star) */
    '<symbol id="icon-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L13.4 10.6L22 12L13.4 13.4L12 22L10.6 13.4L2 12L10.6 10.6Z"/></symbol>' +
    /* trending-up */
    '<symbol id="icon-trending-up" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></symbol>' +
    /* trending-down */
    '<symbol id="icon-trending-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></symbol>' +
    /* user */
    '<symbol id="icon-user" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></symbol>' +
    /* settings */
    '<symbol id="icon-settings" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></symbol>' +
    /* home */
    '<symbol id="icon-home" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></symbol>' +
    /* refresh */
    '<symbol id="icon-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></symbol>' +
    /* arrow-up */
    '<symbol id="icon-arrow-up" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></symbol>' +
    /* arrow-down */
    '<symbol id="icon-arrow-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></symbol>' +
  '</svg>';

  // --------------------------------------------------------------------------
  // 2. Nav items config
  // --------------------------------------------------------------------------
  var NAV_ITEMS = [
    { href: 'index.html',    icon: 'dashboard',       label: 'Dashboard' },
    { href: 'rooms.html',    icon: 'bed',             label: 'Rooms' },
    { href: 'guests.html',   icon: 'users',           label: 'Guests' },
    { href: 'bookings.html', icon: 'calendar',        label: 'Bookings' },
    { href: 'services.html', icon: 'concierge-bell',  label: 'Services' },
    { href: 'payments.html', icon: 'credit-card',     label: 'Payments' },
    { href: 'staff.html',    icon: 'id-badge',        label: 'Staff' }
  ];

  var SAMPLE_NOTIFS = [
    { text: 'Room 302 is ready for check-in.',      time: '5 min ago' },
    { text: 'New booking #book0015 received.',       time: '23 min ago' },
    { text: 'Payment of ₹27,000 confirmed via UPI.', time: '1 hr ago' }
  ];

  // --------------------------------------------------------------------------
  // 3. Helper: build an icon SVG element
  // --------------------------------------------------------------------------
  function icon(name, cls) {
    return '<svg class="' + (cls || 'icon') + '" width="18" height="18" aria-hidden="true"><use href="#icon-' + name + '"/></svg>';
  }

  // --------------------------------------------------------------------------
  // 4. Sidebar HTML
  // --------------------------------------------------------------------------
  function buildSidebar() {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    var navHtml = NAV_ITEMS.map(function (item) {
      var isActive = currentPage === item.href || (currentPage === '' && item.href === 'index.html');
      return '<a href="' + item.href + '" class="nav-item' + (isActive ? ' active' : '') + '" ' +
        (isActive ? 'aria-current="page"' : '') + '>' +
        icon(item.icon) + item.label + '</a>';
    }).join('');

    return '<aside class="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">' +
      '<div class="sidebar-logo">' +
        '<div class="logo-mark">' + icon('sparkle') + '</div>' +
        '<div class="logo-text">' +
          '<div class="logo-name">Hotel &amp; Resort</div>' +
          '<div class="logo-tagline">Luxury Stay &bull; Beautiful Memories</div>' +
        '</div>' +
      '</div>' +
      '<nav class="nav-list" id="sidebar-nav">' +
        navHtml +
      '</nav>' +
      '<div class="sidebar-bottom">' +
        '<div class="sidebar-profile">' +
          '<div class="avatar">AD</div>' +
          '<div><div class="profile-name">Admin</div><div class="profile-role">Super Admin</div></div>' +
        '</div>' +
        '<a href="../login.html" class="btn-logout">' +
          icon('logout') + 'Sign Out' +
        '</a>' +
      '</div>' +
    '</aside>';
  }

  // --------------------------------------------------------------------------
  // 5. Topbar HTML
  // --------------------------------------------------------------------------
  function buildTopbar(pageTitle, breadcrumb) {
    var crumbs = (breadcrumb || []);
    var crumbHtml = '<a href="index.html">Home</a>';
    crumbs.forEach(function (c) {
      crumbHtml += '<span class="breadcrumb-sep" aria-hidden="true">›</span>' +
        (c.href ? '<a href="' + c.href + '">' + c.label + '</a>' : '<span>' + c.label + '</span>');
    });

    var notifsHtml = SAMPLE_NOTIFS.map(function (n) {
      return '<div class="notif-item"><p>' + n.text + '</p><div class="notif-time">' + n.time + '</div></div>';
    }).join('');

    return '<header class="topbar no-print" role="banner">' +
      '<button class="btn-hamburger" id="btn-hamburger" aria-label="Open navigation" aria-expanded="false" aria-controls="sidebar">' +
        icon('menu') +
      '</button>' +
      '<div class="topbar-title">' +
        '<h1 class="font-serif">' + (pageTitle || 'Dashboard') + '</h1>' +
        '<nav class="breadcrumb" aria-label="Breadcrumb">' + crumbHtml + '</nav>' +
      '</div>' +
      '<div class="topbar-search">' +
        '<div class="input-wrap">' +
          '<span class="input-icon">' + icon('search') + '</span>' +
          '<input type="search" class="input" id="global-search" placeholder="Search..." aria-label="Global search">' +
        '</div>' +
      '</div>' +
      '<div class="topbar-actions">' +
        '<a href="bookings.html" class="btn btn-primary btn-new-booking">' +
          icon('plus') + '<span class="btn-text">New Booking</span>' +
        '</a>' +
        '<div class="notif-wrap dropdown-wrap">' +
          '<button class="btn-notif" id="btn-notif" aria-label="Notifications" aria-expanded="false" aria-haspopup="true">' +
            icon('bell') +
            '<span class="notif-badge" aria-label="3 notifications">3</span>' +
          '</button>' +
          '<div class="dropdown-menu notif-dropdown" id="notif-menu" role="menu">' +
            '<div class="notif-header"><span>Notifications</span><span class="badge badge-danger">' + SAMPLE_NOTIFS.length + '</span></div>' +
            notifsHtml +
          '</div>' +
        '</div>' +
        '<div class="admin-avatar-wrap dropdown-wrap">' +
          '<button class="btn-admin-avatar" id="btn-admin-menu" aria-label="Admin menu" aria-expanded="false" aria-haspopup="true">' +
            '<div class="avatar">AD</div>' +
            '<span class="admin-name">Admin</span>' +
            '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>' +
          '</button>' +
          '<div class="dropdown-menu" id="admin-menu" role="menu">' +
            '<button class="dropdown-item">' + icon('user') + 'Profile</button>' +
            '<button class="dropdown-item">' + icon('settings') + 'Settings</button>' +
            '<div class="dropdown-divider"></div>' +
            '<a href="../login.html" class="dropdown-item danger">' + icon('logout') + 'Sign Out</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</header>';
  }

  // --------------------------------------------------------------------------
  // 6. Inject chrome into page
  // --------------------------------------------------------------------------
  function inject(config) {
    config = config || {};

    // Inject SVG sprite
    var spriteDiv = document.createElement('div');
    spriteDiv.innerHTML = SPRITE;
    document.body.insertBefore(spriteDiv.firstChild, document.body.firstChild);

    // Build shell wrapper if not already present
    var shell = document.getElementById('app-shell');
    if (!shell) return;

    // Sidebar overlay
    var overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(overlay, document.body.firstChild);

    // Inject sidebar
    shell.insertAdjacentHTML('afterbegin', buildSidebar());

    // Inject topbar before main
    var main = shell.querySelector('.main-content');
    if (main) {
      main.insertAdjacentHTML('beforebegin', buildTopbar(config.title, config.breadcrumb));
    }

    // Wire hamburger
    var hamburger = document.getElementById('btn-hamburger');
    var sidebar   = document.getElementById('sidebar');
    var sOverlay  = document.getElementById('sidebar-overlay');

    function openSidebar() {
      sidebar.classList.add('open');
      sOverlay.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      sOverlay.removeAttribute('aria-hidden');
    }
    function closeSidebar() {
      sidebar.classList.remove('open');
      sOverlay.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      sOverlay.setAttribute('aria-hidden', 'true');
    }

    if (hamburger) {
      hamburger.addEventListener('click', function () {
        if (sidebar.classList.contains('open')) closeSidebar();
        else openSidebar();
      });
    }
    if (sOverlay) sOverlay.addEventListener('click', closeSidebar);

    // Close sidebar on Esc
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
    });

    // Close sidebar when a nav link is clicked (mobile)
    document.querySelectorAll('.nav-item').forEach(function (a) {
      a.addEventListener('click', function () {
        if (window.innerWidth <= 992) closeSidebar();
      });
    });

    // Wire notification dropdown
    var btnNotif = document.getElementById('btn-notif');
    var notifMenu = document.getElementById('notif-menu');
    if (btnNotif && notifMenu) {
      window.HRMS.utils.initDropdown(btnNotif, notifMenu);
      btnNotif.addEventListener('click', function () {
        var isOpen = notifMenu.classList.contains('open');
        btnNotif.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    // Wire admin dropdown
    var btnAdmin = document.getElementById('btn-admin-menu');
    var adminMenu = document.getElementById('admin-menu');
    if (btnAdmin && adminMenu) {
      window.HRMS.utils.initDropdown(btnAdmin, adminMenu);
    }

    // Toast container
    var tc = document.createElement('div');
    tc.id = 'toast-container';
    tc.setAttribute('aria-live', 'polite');
    tc.setAttribute('aria-atomic', 'false');
    document.body.appendChild(tc);
  }

  // Expose
  window.HRMS = window.HRMS || {};
  window.HRMS.layout = { inject: inject, icon: icon };

}());
