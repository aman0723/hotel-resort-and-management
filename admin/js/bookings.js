/* ==========================================================================
   bookings.js — Bookings: status tabs, CRUD, date validation, auto-total
   ========================================================================== */

(function () {
  'use strict';

  var D = window.HRMS.data;
  var U = window.HRMS.utils;
  var L = window.HRMS.layout;

  L.inject({ title: 'Bookings', breadcrumb: [{ label: 'Bookings' }] });

  var STATUSES = ['all', 'confirmed', 'pending', 'checked-in', 'checked-out', 'cancelled'];
  var state = { tab: 'all', search: '', dateFrom: '', dateTo: '', page: 1, perPage: 10, editId: null };

  // --------------------------------------------------------------------------
  // Build status tabs
  // --------------------------------------------------------------------------
  function buildTabs() {
    var bookings = D.getAll('bookings');
    var tabsEl = document.getElementById('booking-tabs');
    tabsEl.innerHTML = STATUSES.map(function (s) {
      var count = s === 'all' ? bookings.length : bookings.filter(function (b) { return b.status === s; }).length;
      return '<button class="tab-btn" role="tab" data-tab="' + s + '" aria-selected="' + (s === state.tab) + '">' +
        (s === 'all' ? 'All' : s.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); })) +
        '<span class="tab-count">' + count + '</span>' +
      '</button>';
    }).join('');
    tabsEl.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.tab = btn.dataset.tab; state.page = 1; buildTabs(); render();
      });
    });
  }

  // --------------------------------------------------------------------------
  // Filter + render
  // --------------------------------------------------------------------------
  function getFiltered() {
    var bookings = D.getAll('bookings');
    if (state.tab !== 'all') bookings = bookings.filter(function (b) { return b.status === state.tab; });
    if (state.search) {
      var q = state.search.toLowerCase();
      var guests = D.getAll('guests');
      bookings = bookings.filter(function (b) {
        var g = guests.find(function (x) { return x._id === b.guestId; });
        return b._id.toLowerCase().includes(q) || (g && g.name.toLowerCase().includes(q));
      });
    }
    if (state.dateFrom) bookings = bookings.filter(function (b) { return b.checkIn >= state.dateFrom; });
    if (state.dateTo)   bookings = bookings.filter(function (b) { return b.checkIn <= state.dateTo; });
    return bookings.sort(function (a, b) { return b.checkIn.localeCompare(a.checkIn); });
  }

  function guestName(gid) {
    var g = D.getById('guests', gid);
    return g ? g.name : '—';
  }
  function roomNumber(rid) {
    var r = D.getById('rooms', rid);
    return r ? r.number : '—';
  }

  function render() {
    var filtered = getFiltered();
    var total = filtered.length;
    var start = (state.page - 1) * state.perPage;
    var pageItems = filtered.slice(start, start + state.perPage);

    document.getElementById('bookings-count').textContent = total + ' booking' + (total !== 1 ? 's' : '');

    var tbody = document.getElementById('bookings-body');
    if (!total) {
      tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state" style="padding:var(--s8)"><div class="empty-icon"><svg width="28" height="28"><use href="#icon-calendar"/></svg></div><p>No bookings found.</p></div></td></tr>';
    } else {
      tbody.innerHTML = pageItems.map(function (b) {
        var nights = U.nightCount(b.checkIn, b.checkOut);
        return '<tr>' +
          '<td><span class="font-semibold text-primary text-sm">' + b._id + '</span></td>' +
          '<td>' + U.escapeHtml(guestName(b.guestId)) + '</td>' +
          '<td>Room ' + U.escapeHtml(roomNumber(b.roomId)) + '</td>' +
          '<td>' + U.formatDate(b.checkIn) + '</td>' +
          '<td>' + U.formatDate(b.checkOut) + '</td>' +
          '<td class="text-center">' + nights + '</td>' +
          '<td class="text-center">' + b.guests + '</td>' +
          '<td class="font-semibold">' + U.formatINR(b.totalAmount) + '</td>' +
          '<td>' + U.statusBadge(b.status) + '</td>' +
          '<td>' +
            '<div class="table-actions">' +
              '<button class="btn btn-icon btn-sm btn-secondary btn-view-booking" data-id="' + b._id + '" data-tooltip="Details"><svg width="14" height="14"><use href="#icon-eye"/></svg></button>' +
              (b.status === 'confirmed' || b.status === 'pending' ? '<button class="btn btn-icon btn-sm btn-secondary btn-edit-booking" data-id="' + b._id + '" data-tooltip="Edit"><svg width="14" height="14"><use href="#icon-edit"/></svg></button>' : '') +
              (b.status === 'confirmed' ? '<button class="btn btn-icon btn-sm btn-secondary btn-checkin-booking" data-id="' + b._id + '" data-tooltip="Check In"><svg width="14" height="14"><use href="#icon-check"/></svg></button>' : '') +
              (b.status === 'checked-in' ? '<button class="btn btn-icon btn-sm btn-secondary btn-checkout-booking" data-id="' + b._id + '" data-tooltip="Check Out"><svg width="14" height="14"><use href="#icon-arrow-up"/></svg></button>' : '') +
              (b.status !== 'cancelled' && b.status !== 'checked-out' ? '<button class="btn btn-icon btn-sm btn-danger btn-cancel-booking" data-id="' + b._id + '" data-tooltip="Cancel"><svg width="14" height="14"><use href="#icon-x"/></svg></button>' : '') +
            '</div>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    attachEvents(tbody);
    U.renderPagination(document.getElementById('bookings-pagination'), total, state.page, state.perPage, function (p) { state.page = p; render(); });
  }

  // --------------------------------------------------------------------------
  // Event delegation
  // --------------------------------------------------------------------------
  function attachEvents(tbody) {
    tbody.querySelectorAll('.btn-view-booking').forEach(function (btn) { btn.addEventListener('click', function () { openDetail(btn.dataset.id); }); });
    tbody.querySelectorAll('.btn-edit-booking').forEach(function (btn) { btn.addEventListener('click', function () { openBookingModal(btn.dataset.id); }); });
    tbody.querySelectorAll('.btn-checkin-booking').forEach(function (btn) { btn.addEventListener('click', function () { changeStatus(btn.dataset.id, 'checked-in'); }); });
    tbody.querySelectorAll('.btn-checkout-booking').forEach(function (btn) { btn.addEventListener('click', function () { changeStatus(btn.dataset.id, 'checked-out'); }); });
    tbody.querySelectorAll('.btn-cancel-booking').forEach(function (btn) { btn.addEventListener('click', function () { cancelBooking(btn.dataset.id); }); });
  }

  function changeStatus(bookingId, newStatus) {
    var b = D.getById('bookings', bookingId);
    if (!b) return;
    D.update('bookings', bookingId, { status: newStatus });
    // Auto-update room status
    if (newStatus === 'checked-in')  D.update('rooms', b.roomId, { status: 'occupied' });
    if (newStatus === 'checked-out') D.update('rooms', b.roomId, { status: 'cleaning' });
    U.toast('success', 'Status Updated', 'Booking ' + bookingId + ' is now ' + newStatus + '.');
    buildTabs(); render();
  }

  function cancelBooking(bookingId) {
    var b = D.getById('bookings', bookingId);
    U.confirmDialog({ title: 'Cancel Booking?', message: 'Cancel booking ' + bookingId + '? This cannot be undone.', confirmText: 'Yes, Cancel' }).then(function (ok) {
      if (!ok) return;
      D.update('bookings', bookingId, { status: 'cancelled' });
      if (b) D.update('rooms', b.roomId, { status: 'available' });
      U.toast('success', 'Booking Cancelled', 'Booking ' + bookingId + ' has been cancelled.');
      buildTabs(); render();
    });
  }

  // --------------------------------------------------------------------------
  // Booking modal
  // --------------------------------------------------------------------------
  var backdrop = document.getElementById('booking-modal-backdrop');

  function populateSelects(editRoomId) {
    // Guests
    var gSel = document.getElementById('b-guest');
    gSel.innerHTML = '<option value="">Select guest...</option>' +
      D.getAll('guests').map(function (g) { return '<option value="' + g._id + '">' + U.escapeHtml(g.name) + '</option>'; }).join('');
    // Available rooms (+ the current room if editing)
    var rSel = document.getElementById('b-room');
    var availableRooms = D.getAll('rooms').filter(function (r) { return r.status === 'available' || r._id === editRoomId; });
    rSel.innerHTML = '<option value="">Select room...</option>' +
      availableRooms.map(function (r) { return '<option value="' + r._id + '" data-price="' + r.pricePerNight + '">Room ' + r.number + ' — ' + r.type + ' (' + U.formatINR(r.pricePerNight) + '/night)</option>'; }).join('');
  }

  function updatePriceSummary() {
    var roomId  = document.getElementById('b-room').value;
    var checkIn = document.getElementById('b-checkin').value;
    var checkOut= document.getElementById('b-checkout').value;
    var summaryEl = document.getElementById('booking-price-summary');
    if (!roomId || !checkIn || !checkOut || checkOut <= checkIn) { summaryEl.style.display = 'none'; return; }
    var room = D.getById('rooms', roomId);
    if (!room) { summaryEl.style.display = 'none'; return; }
    var nights = U.nightCount(checkIn, checkOut);
    var t = U.computeTotal(room.pricePerNight, nights);
    document.getElementById('bps-nights').textContent = nights;
    document.getElementById('bps-rate').textContent   = U.formatINR(room.pricePerNight);
    document.getElementById('bps-base').textContent   = U.formatINR(t.base);
    document.getElementById('bps-tax').textContent    = U.formatINR(t.tax);
    document.getElementById('bps-total').textContent  = U.formatINR(t.total);
    summaryEl.style.display = '';
  }

  function openBookingModal(id) {
    state.editId = id || null;
    var form = document.getElementById('booking-form');
    U.clearFieldErrors(form);
    document.getElementById('booking-modal-title').textContent = id ? 'Edit Booking' : 'New Booking';
    form.reset();
    document.getElementById('booking-price-summary').style.display = 'none';
    var b = id ? D.getById('bookings', id) : null;
    populateSelects(b ? b.roomId : null);

    if (b) {
      document.getElementById('b-guest').value  = b.guestId;
      document.getElementById('b-room').value   = b.roomId;
      document.getElementById('b-checkin').value  = b.checkIn;
      document.getElementById('b-checkout').value = b.checkOut;
      document.getElementById('b-guests').value = b.guests;
      document.getElementById('b-status').value = b.status;
      document.getElementById('b-notes').value  = b.notes || '';
      updatePriceSummary();
    }
    U.openModal(backdrop, document.getElementById('btn-add-booking'));
  }

  // Live price update
  ['b-room', 'b-checkin', 'b-checkout'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', updatePriceSummary);
  });

  function closeBookingModal() { U.closeModal(backdrop); }
  document.getElementById('booking-modal-close').addEventListener('click', closeBookingModal);
  document.getElementById('booking-modal-cancel').addEventListener('click', closeBookingModal);
  document.getElementById('btn-add-booking').addEventListener('click', function () { openBookingModal(null); });

  document.getElementById('booking-modal-save').addEventListener('click', function () {
    var form = document.getElementById('booking-form');
    var data = {
      guestId:  document.getElementById('b-guest').value,
      roomId:   document.getElementById('b-room').value,
      checkIn:  document.getElementById('b-checkin').value,
      checkOut: document.getElementById('b-checkout').value,
      guests:   Number(document.getElementById('b-guests').value),
      status:   document.getElementById('b-status').value,
      notes:    document.getElementById('b-notes').value.trim()
    };

    // Validate
    var errors = {};
    if (!data.guestId) errors.guestId = 'Please select a guest.';
    if (!data.roomId)  errors.roomId  = 'Please select a room.';
    if (!data.checkIn) errors.checkIn = 'Check-in date is required.';
    if (!data.checkOut) errors.checkOut = 'Check-out date is required.';
    if (data.checkIn && data.checkOut && data.checkOut <= data.checkIn) errors.checkOut = 'Check-out must be after check-in.';
    // Overlap check
    if (data.roomId && data.checkIn && data.checkOut) {
      var conflict = D.getAll('bookings').find(function (b) {
        if (state.editId && b._id === state.editId) return false;
        if (b.roomId !== data.roomId) return false;
        if (b.status === 'cancelled') return false;
        return data.checkIn < b.checkOut && data.checkOut > b.checkIn;
      });
      if (conflict) errors.checkIn = 'This room is already booked for those dates.';
    }

    if (Object.keys(errors).length) { U.showFieldErrors(form, errors); return; }

    var room = D.getById('rooms', data.roomId);
    var nights = U.nightCount(data.checkIn, data.checkOut);
    var t = U.computeTotal(room ? room.pricePerNight : 0, nights);
    data.totalAmount = t.total;
    data.tax = t.tax;

    if (state.editId) {
      D.update('bookings', state.editId, data);
      U.toast('success', 'Booking Updated', 'Booking has been updated.');
    } else {
      D.create('bookings', data);
      U.toast('success', 'Booking Created', 'New booking confirmed.');
    }
    closeBookingModal();
    buildTabs(); render();
  });

  // --------------------------------------------------------------------------
  // Booking detail modal
  // --------------------------------------------------------------------------
  var detailBackdrop = document.getElementById('booking-detail-backdrop');

  function openDetail(bookingId) {
    var b = D.getById('bookings', bookingId);
    if (!b) return;
    var g = D.getById('guests', b.guestId);
    var r = D.getById('rooms',   b.roomId);
    var nights = U.nightCount(b.checkIn, b.checkOut);
    var body = document.getElementById('booking-detail-body');
    body.innerHTML =
      '<div class="flex flex-col gap-4">' +
        '<div class="flex items-center justify-between gap-4">' +
          '<span class="font-serif" style="font-size:1.1rem">Booking #' + U.escapeHtml(b._id) + '</span>' +
          U.statusBadge(b.status) +
        '</div>' +
        '<div class="grid grid-2 gap-4">' +
          '<div><div class="overline mb-1">Guest</div><div class="font-semibold">' + U.escapeHtml(g ? g.name : '—') + '</div><div class="text-sm text-muted">' + U.escapeHtml(g ? g.phone : '') + '</div></div>' +
          '<div><div class="overline mb-1">Room</div><div class="font-semibold">Room ' + U.escapeHtml(r ? r.number : '—') + '</div><div class="text-sm text-muted">' + U.escapeHtml(r ? r.type : '') + '</div></div>' +
          '<div><div class="overline mb-1">Check-in</div><div class="font-semibold">' + U.formatDate(b.checkIn) + '</div></div>' +
          '<div><div class="overline mb-1">Check-out</div><div class="font-semibold">' + U.formatDate(b.checkOut) + '</div></div>' +
          '<div><div class="overline mb-1">Nights</div><div class="font-semibold">' + nights + '</div></div>' +
          '<div><div class="overline mb-1">Guests</div><div class="font-semibold">' + b.guests + '</div></div>' +
        '</div>' +
        '<div style="background:var(--primary-soft);border-radius:var(--r-lg);padding:var(--s4)">' +
          '<div class="flex justify-between text-sm mb-1"><span>Room charges</span><span>' + U.formatINR(b.totalAmount - b.tax) + '</span></div>' +
          '<div class="flex justify-between text-sm text-muted mb-2"><span>GST (12%)</span><span>' + U.formatINR(b.tax) + '</span></div>' +
          '<div class="flex justify-between font-semibold text-primary" style="border-top:1px solid var(--border);padding-top:8px"><span>Total</span><span>' + U.formatINR(b.totalAmount) + '</span></div>' +
        '</div>' +
        (b.notes ? '<div><div class="overline mb-1">Notes</div><div class="text-sm">' + U.escapeHtml(b.notes) + '</div></div>' : '') +
      '</div>';
    U.openModal(detailBackdrop);
  }

  document.getElementById('booking-detail-close').addEventListener('click',  function () { U.closeModal(detailBackdrop); });
  document.getElementById('booking-detail-close2').addEventListener('click', function () { U.closeModal(detailBackdrop); });

  // --------------------------------------------------------------------------
  // Filters
  // --------------------------------------------------------------------------
  var debouncedSearch = U.debounce(function (val) { state.search = val; state.page = 1; render(); }, 300);
  document.getElementById('booking-search').addEventListener('input', function () { debouncedSearch(this.value); });
  document.getElementById('filter-date-from').addEventListener('change', function () { state.dateFrom = this.value; state.page = 1; render(); });
  document.getElementById('filter-date-to').addEventListener('change',   function () { state.dateTo   = this.value; state.page = 1; render(); });

  // Initial
  buildTabs();
  render();

}());
