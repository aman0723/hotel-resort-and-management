/* ==========================================================================
   guests.js — Guests page: table, CRUD, search, sort, profile view
   ========================================================================== */

(function () {
  'use strict';

  var D = window.HRMS.data;
  var U = window.HRMS.utils;
  var L = window.HRMS.layout;

  L.inject({ title: 'Guests', breadcrumb: [{ label: 'Guests' }] });

  var state = { search: '', filterIdType: '', sortKey: 'name', sortDir: 'asc', page: 1, perPage: 10, editId: null };

  // --------------------------------------------------------------------------
  // Filter + render
  // --------------------------------------------------------------------------
  function getFiltered() {
    var guests = D.getAll('guests');
    if (state.search) {
      var q = state.search.toLowerCase();
      guests = guests.filter(function (g) {
        return g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q) || g.phone.includes(q);
      });
    }
    if (state.filterIdType) guests = guests.filter(function (g) { return g.idType === state.filterIdType; });
    return U.sortBy(guests, state.sortKey, state.sortDir);
  }

  function render() {
    var filtered = getFiltered();
    var total = filtered.length;
    var start = (state.page - 1) * state.perPage;
    var pageItems = filtered.slice(start, start + state.perPage);

    document.getElementById('guests-count').textContent = total + ' guest' + (total !== 1 ? 's' : '');

    var tbody = document.getElementById('guests-body');
    if (!total) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state" style="padding:var(--s8)"><div class="empty-icon"><svg width="28" height="28"><use href="#icon-users"/></svg></div><p>No guests found.</p></div></td></tr>';
    } else {
      tbody.innerHTML = pageItems.map(function (g) {
        return '<tr>' +
          '<td><div class="flex items-center gap-3"><div class="avatar">' + U.initials(g.name) + '</div><span class="font-semibold">' + U.escapeHtml(g.name) + '</span></div></td>' +
          '<td class="text-sm">' + U.escapeHtml(g.email) + '</td>' +
          '<td>' + U.escapeHtml(g.phone) + '</td>' +
          '<td>' + U.escapeHtml(g.city) + '</td>' +
          '<td><span class="badge badge-neutral">' + U.escapeHtml(g.idType) + '</span></td>' +
          '<td class="text-center font-semibold">' + g.totalStays + '</td>' +
          '<td><div class="table-actions">' +
            '<button class="btn btn-icon btn-sm btn-secondary btn-view-guest" data-id="' + g._id + '" data-tooltip="View Profile"><svg width="14" height="14"><use href="#icon-eye"/></svg></button>' +
            '<button class="btn btn-icon btn-sm btn-secondary btn-edit-guest" data-id="' + g._id + '" data-tooltip="Edit"><svg width="14" height="14"><use href="#icon-edit"/></svg></button>' +
            '<button class="btn btn-icon btn-sm btn-danger btn-delete-guest" data-id="' + g._id + '" data-tooltip="Delete"><svg width="14" height="14"><use href="#icon-trash"/></svg></button>' +
          '</div></td>' +
        '</tr>';
      }).join('');
    }

    // Sort indicators
    document.querySelectorAll('.sortable').forEach(function (th) {
      th.classList.remove('sort-asc', 'sort-desc');
      if (th.dataset.sort === state.sortKey) th.classList.add('sort-' + state.sortDir);
    });

    U.renderPagination(document.getElementById('guests-pagination'), total, state.page, state.perPage, function (p) { state.page = p; render(); });

    // Event delegation
    tbody.querySelectorAll('.btn-view-guest').forEach(function (btn) { btn.addEventListener('click', function () { openProfile(btn.dataset.id); }); });
    tbody.querySelectorAll('.btn-edit-guest').forEach(function (btn) { btn.addEventListener('click', function () { openGuestModal(btn.dataset.id); }); });
    tbody.querySelectorAll('.btn-delete-guest').forEach(function (btn) { btn.addEventListener('click', function () { deleteGuest(btn.dataset.id); }); });
  }

  // --------------------------------------------------------------------------
  // Sort
  // --------------------------------------------------------------------------
  document.querySelectorAll('.sortable').forEach(function (th) {
    th.addEventListener('click', function () {
      var key = th.dataset.sort;
      if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      else { state.sortKey = key; state.sortDir = 'asc'; }
      state.page = 1; render();
    });
  });

  // --------------------------------------------------------------------------
  // Guest modal
  // --------------------------------------------------------------------------
  var backdrop = document.getElementById('guest-modal-backdrop');

  function openGuestModal(id) {
    state.editId = id || null;
    var form = document.getElementById('guest-form');
    U.clearFieldErrors(form);
    document.getElementById('guest-modal-title').textContent = id ? 'Edit Guest' : 'Add Guest';
    form.reset();
    if (id) {
      var g = D.getById('guests', id);
      if (!g) return;
      form.querySelector('[name="name"]').value   = g.name;
      form.querySelector('[name="email"]').value  = g.email;
      form.querySelector('[name="phone"]').value  = g.phone;
      form.querySelector('[name="city"]').value   = g.city;
      form.querySelector('[name="idType"]').value = g.idType;
    }
    U.openModal(backdrop, document.getElementById('btn-add-guest'));
  }

  function closeGuestModal() { U.closeModal(backdrop); }

  document.getElementById('guest-modal-close').addEventListener('click', closeGuestModal);
  document.getElementById('guest-modal-cancel').addEventListener('click', closeGuestModal);
  document.getElementById('btn-add-guest').addEventListener('click', function () { openGuestModal(null); });

  document.getElementById('guest-modal-save').addEventListener('click', function () {
    var form = document.getElementById('guest-form');
    var data = {
      name:    form.querySelector('[name="name"]').value.trim(),
      email:   form.querySelector('[name="email"]').value.trim(),
      phone:   form.querySelector('[name="phone"]').value.trim(),
      city:    form.querySelector('[name="city"]').value.trim(),
      idType:  form.querySelector('[name="idType"]').value
    };
    var result = U.validateForm(data, {
      name:  [{ type: 'required', message: 'Name is required.' }],
      email: [{ type: 'required', message: 'Email is required.' }, { type: 'email', message: 'Enter a valid email.' }],
      phone: [{ type: 'required', message: 'Phone is required.' }, { type: 'phone', message: '10-digit Indian mobile number required.' }]
    });
    if (!result.valid) { U.showFieldErrors(form, result.errors); return; }

    if (state.editId) {
      D.update('guests', state.editId, data);
      U.toast('success', 'Guest Updated', data.name + ' has been updated.');
    } else {
      D.create('guests', Object.assign(data, { totalStays: 0, joinedDate: U.todayISO() }));
      U.toast('success', 'Guest Added', data.name + ' has been added.');
    }
    closeGuestModal();
    render();
  });

  // --------------------------------------------------------------------------
  // Profile modal
  // --------------------------------------------------------------------------
  var profileBackdrop = document.getElementById('profile-modal-backdrop');

  function openProfile(guestId) {
    var g = D.getById('guests', guestId);
    if (!g) return;
    var bookings = D.find('bookings', function (b) { return b.guestId === guestId; });
    var rooms = D.getAll('rooms');

    var bookingRows = bookings.map(function (b) {
      var room = rooms.find(function (r) { return r._id === b.roomId; });
      return '<tr>' +
        '<td>' + U.escapeHtml(b._id) + '</td>' +
        '<td>' + (room ? 'Room ' + room.number : '—') + '</td>' +
        '<td>' + U.formatDate(b.checkIn) + '</td>' +
        '<td>' + U.formatDate(b.checkOut) + '</td>' +
        '<td class="font-semibold">' + U.formatINR(b.totalAmount) + '</td>' +
        '<td>' + U.statusBadge(b.status) + '</td>' +
      '</tr>';
    }).join('');

    document.getElementById('profile-modal-body').innerHTML =
      '<div class="flex items-center gap-4 mb-6">' +
        '<div class="avatar avatar-lg" style="width:64px;height:64px;font-size:1.25rem">' + U.initials(g.name) + '</div>' +
        '<div>' +
          '<div class="font-serif" style="font-size:1.2rem;font-weight:700">' + U.escapeHtml(g.name) + '</div>' +
          '<div class="text-muted text-sm">' + U.escapeHtml(g.email) + ' · ' + U.escapeHtml(g.phone) + '</div>' +
          '<div class="flex gap-2 mt-2">' +
            '<span class="badge badge-neutral">' + U.escapeHtml(g.city) + '</span>' +
            '<span class="badge badge-neutral">' + U.escapeHtml(g.idType) + '</span>' +
            '<span class="badge badge-primary">' + g.totalStays + ' stays</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<h4 class="font-serif mb-4" style="font-size:1rem">Booking History</h4>' +
      (bookings.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Amount</th><th>Status</th></tr></thead><tbody>' + bookingRows + '</tbody></table></div>' :
        '<div class="empty-state" style="padding:var(--s8)"><p>No bookings yet.</p></div>');

    U.openModal(profileBackdrop);
  }

  document.getElementById('profile-modal-close').addEventListener('click',  function () { U.closeModal(profileBackdrop); });
  document.getElementById('profile-modal-close2').addEventListener('click', function () { U.closeModal(profileBackdrop); });

  // --------------------------------------------------------------------------
  // Delete
  // --------------------------------------------------------------------------
  function deleteGuest(id) {
    var g = D.getById('guests', id);
    if (!g) return;
    U.confirmDialog({ title: 'Delete Guest?', message: 'Remove ' + g.name + '? This cannot be undone.', confirmText: 'Delete' }).then(function (ok) {
      if (!ok) return;
      D.remove('guests', id);
      U.toast('success', 'Guest Removed', g.name + ' has been deleted.');
      render();
    });
  }

  // --------------------------------------------------------------------------
  // Filters
  // --------------------------------------------------------------------------
  var debouncedSearch = U.debounce(function (val) { state.search = val; state.page = 1; render(); }, 300);
  document.getElementById('guest-search').addEventListener('input', function () { debouncedSearch(this.value); });
  document.getElementById('filter-id-type').addEventListener('change', function () { state.filterIdType = this.value; state.page = 1; render(); });

  render();

}());
