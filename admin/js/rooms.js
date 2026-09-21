/* ==========================================================================
   rooms.js — Rooms page: grid/list view, CRUD, filters, pagination
   ========================================================================== */

(function () {
  'use strict';

  var D = window.HRMS.data;
  var U = window.HRMS.utils;
  var L = window.HRMS.layout;

  L.inject({ title: 'Rooms', breadcrumb: [{ label: 'Rooms' }] });

  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------
  var state = {
    view: 'grid',       // 'grid' | 'list'
    search: '',
    filterType: '',
    filterStatus: '',
    filterPrice: '',
    sortKey: 'number',
    sortDir: 'asc',
    page: 1,
    perPage: 12,
    editId: null        // null = add, string = edit
  };

  var AMENITIES_LIST = ['AC', 'TV', 'WiFi', 'Mini Bar', 'Jacuzzi', 'Balcony', 'Private Pool', 'Butler', 'Kitchen', 'Gym', 'Hot Water', 'Safe', 'Bathtub', 'Garden View', 'Home Theatre', 'Telescope'];

  // Populate amenities checkboxes
  var amenGroup = document.getElementById('amenities-group');
  if (amenGroup) {
    amenGroup.innerHTML = AMENITIES_LIST.map(function (a) {
      return '<label class="check-item"><input type="checkbox" name="amenities" value="' + a + '"> ' + a + '</label>';
    }).join('');
  }

  // --------------------------------------------------------------------------
  // Filter + render
  // --------------------------------------------------------------------------
  function getFiltered() {
    var rooms = D.getAll('rooms');
    if (state.search) {
      var q = state.search.toLowerCase();
      rooms = rooms.filter(function (r) { return r.number.toLowerCase().includes(q) || r.type.toLowerCase().includes(q); });
    }
    if (state.filterType)   rooms = rooms.filter(function (r) { return r.type === state.filterType; });
    if (state.filterStatus) rooms = rooms.filter(function (r) { return r.status === state.filterStatus; });
    if (state.filterPrice) {
      var parts = state.filterPrice.split('-').map(Number);
      rooms = rooms.filter(function (r) { return r.pricePerNight >= parts[0] && r.pricePerNight <= parts[1]; });
    }
    return U.sortBy(rooms, state.sortKey, state.sortDir);
  }

  function render() {
    var filtered = getFiltered();
    var total = filtered.length;
    var start = (state.page - 1) * state.perPage;
    var pageItems = filtered.slice(start, start + state.perPage);

    var countEl = document.getElementById('rooms-count');
    if (countEl) countEl.textContent = total + ' room' + (total !== 1 ? 's' : '') + ' found';

    var container = document.getElementById('rooms-container');
    if (!container) return;

    if (!total) {
      container.innerHTML = '<div class="card"><div class="empty-state"><div class="empty-icon"><svg width="28" height="28"><use href="#icon-bed"/></svg></div><p>No rooms match your filters.</p><button class="btn btn-secondary btn-sm" id="btn-clear-filters">Clear Filters</button></div></div>';
      container.querySelector('#btn-clear-filters').addEventListener('click', clearFilters);
      document.getElementById('rooms-pagination').innerHTML = '';
      return;
    }

    if (state.view === 'grid') {
      container.innerHTML = '<div class="cards-grid">' + pageItems.map(roomCard).join('') + '</div>';
    } else {
      container.innerHTML = buildTable(pageItems);
    }

    // Pagination
    U.renderPagination(
      document.getElementById('rooms-pagination'),
      total, state.page, state.perPage,
      function (p) { state.page = p; render(); }
    );

    // Attach events via delegation
    attachEvents(container);
  }

  // --------------------------------------------------------------------------
  // Room card (grid view)
  // --------------------------------------------------------------------------
  function roomCard(r) {
    return '<article class="room-card">' +
      '<div class="room-card-img">' +
        '<svg width="48" height="48"><use href="#icon-bed"/></svg>' +
      '</div>' +
      '<div class="room-card-body">' +
        '<div class="flex items-center justify-between gap-2">' +
          '<span class="font-serif" style="font-size:1.05rem;font-weight:700">Room ' + U.escapeHtml(r.number) + '</span>' +
          U.statusBadge(r.status) +
        '</div>' +
        '<div class="text-sm text-muted">' + U.escapeHtml(r.type) + ' · Floor ' + r.floor + ' · ' + r.capacity + ' guests</div>' +
        '<div class="font-semibold text-primary" style="font-size:1rem">' + U.formatINR(r.pricePerNight) + '<span class="text-muted text-sm font-medium"> /night</span></div>' +
        '<div class="flex flex-wrap gap-1">' +
          (r.amenities || []).slice(0, 4).map(function (a) { return '<span class="chip">' + a + '</span>'; }).join('') +
          (r.amenities && r.amenities.length > 4 ? '<span class="chip">+' + (r.amenities.length - 4) + ' more</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="room-card-footer">' +
        '<div class="flex gap-1">' +
          '<button class="btn btn-icon btn-sm btn-secondary btn-edit-room" data-id="' + r._id + '" aria-label="Edit room ' + r.number + '" data-tooltip="Edit">' +
            '<svg width="14" height="14"><use href="#icon-edit"/></svg>' +
          '</button>' +
          '<button class="btn btn-icon btn-sm btn-danger btn-delete-room" data-id="' + r._id + '" aria-label="Delete room ' + r.number + '" data-tooltip="Delete">' +
            '<svg width="14" height="14"><use href="#icon-trash"/></svg>' +
          '</button>' +
        '</div>' +
        '<select class="select btn-status-change" data-id="' + r._id + '" aria-label="Change room status" style="height:30px;font-size:.75rem;padding:0 28px 0 8px;width:auto">' +
          ['available','occupied','cleaning','maintenance'].map(function (s) {
            return '<option value="' + s + '"' + (r.status === s ? ' selected' : '') + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
    '</article>';
  }

  // --------------------------------------------------------------------------
  // Table view
  // --------------------------------------------------------------------------
  function buildTable(rooms) {
    var rows = rooms.map(function (r) {
      return '<tr>' +
        '<td class="font-semibold">Room ' + U.escapeHtml(r.number) + '</td>' +
        '<td>' + U.escapeHtml(r.type) + '</td>' +
        '<td>' + r.floor + '</td>' +
        '<td class="font-semibold">' + U.formatINR(r.pricePerNight) + '</td>' +
        '<td>' + r.capacity + '</td>' +
        '<td>' + U.statusBadge(r.status) + '</td>' +
        '<td>' +
          '<div class="table-actions">' +
            '<button class="btn btn-icon btn-sm btn-secondary btn-edit-room" data-id="' + r._id + '" aria-label="Edit" data-tooltip="Edit"><svg width="14" height="14"><use href="#icon-edit"/></svg></button>' +
            '<button class="btn btn-icon btn-sm btn-danger btn-delete-room" data-id="' + r._id + '" aria-label="Delete" data-tooltip="Delete"><svg width="14" height="14"><use href="#icon-trash"/></svg></button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    return '<div class="table-wrap">' +
      '<table class="table" role="grid">' +
        '<thead><tr>' +
          '<th class="sortable" data-sort="number">Room No. <span class="sort-icon">↕</span></th>' +
          '<th class="sortable" data-sort="type">Type <span class="sort-icon">↕</span></th>' +
          '<th>Floor</th>' +
          '<th class="sortable" data-sort="pricePerNight">Price/Night <span class="sort-icon">↕</span></th>' +
          '<th>Capacity</th>' +
          '<th>Status</th>' +
          '<th>Actions</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>';
  }

  // --------------------------------------------------------------------------
  // Event delegation on container
  // --------------------------------------------------------------------------
  function attachEvents(container) {
    // Edit
    container.querySelectorAll('.btn-edit-room').forEach(function (btn) {
      btn.addEventListener('click', function () { openModal(btn.dataset.id); });
    });
    // Delete
    container.querySelectorAll('.btn-delete-room').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteRoom(btn.dataset.id, btn); });
    });
    // Status change
    container.querySelectorAll('.btn-status-change').forEach(function (sel) {
      sel.addEventListener('change', function () {
        D.update('rooms', sel.dataset.id, { status: sel.value });
        U.toast('success', 'Status Updated', 'Room status changed to ' + sel.value + '.');
        render();
      });
    });
    // Table sort
    container.querySelectorAll('.sortable').forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.dataset.sort;
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortKey = key; state.sortDir = 'asc';
        }
        state.page = 1; render();
      });
    });
  }

  // --------------------------------------------------------------------------
  // Add / Edit modal
  // --------------------------------------------------------------------------
  var backdrop = document.getElementById('room-modal-backdrop');
  backdrop.removeAttribute('hidden');

  function openModal(id) {
    state.editId = id || null;
    var form = document.getElementById('room-form');
    U.clearFieldErrors(form);
    var titleEl = document.getElementById('room-modal-title');
    var room = id ? D.getById('rooms', id) : null;

    titleEl.textContent = id ? 'Edit Room' : 'Add Room';

    // Reset form
    form.reset();
    amenGroup.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = false; });

    if (room) {
      form.querySelector('[name="number"]').value      = room.number;
      form.querySelector('[name="type"]').value        = room.type;
      form.querySelector('[name="floor"]').value       = room.floor;
      form.querySelector('[name="pricePerNight"]').value = room.pricePerNight;
      form.querySelector('[name="capacity"]').value   = room.capacity;
      form.querySelector('[name="status"]').value     = room.status;
      form.querySelector('[name="description"]').value = room.description || '';
      (room.amenities || []).forEach(function (a) {
        var cb = amenGroup.querySelector('input[value="' + a + '"]');
        if (cb) cb.checked = true;
      });
    }
    U.openModal(backdrop, document.getElementById('btn-add-room'));
  }

  function closeModal() { U.closeModal(backdrop); }

  document.getElementById('room-modal-close').addEventListener('click', closeModal);
  document.getElementById('room-modal-cancel').addEventListener('click', closeModal);

  document.getElementById('room-modal-save').addEventListener('click', function () {
    var form = document.getElementById('room-form');
    var data = {
      number:       form.querySelector('[name="number"]').value.trim(),
      type:         form.querySelector('[name="type"]').value,
      floor:        Number(form.querySelector('[name="floor"]').value),
      pricePerNight:Number(form.querySelector('[name="pricePerNight"]').value),
      capacity:     Number(form.querySelector('[name="capacity"]').value),
      status:       form.querySelector('[name="status"]').value,
      description:  form.querySelector('[name="description"]').value.trim(),
      amenities:    Array.from(amenGroup.querySelectorAll('input:checked')).map(function (cb) { return cb.value; })
    };

    var result = U.validateForm(data, {
      number:        [{ type: 'required', message: 'Room number is required.' }],
      type:          [{ type: 'required', message: 'Room type is required.' }],
      pricePerNight: [{ type: 'positive', message: 'Enter a valid price.' }],
      capacity:      [{ type: 'positive', message: 'Enter valid capacity.' }]
    });

    if (!result.valid) { U.showFieldErrors(form, result.errors); return; }

    if (state.editId) {
      D.update('rooms', state.editId, data);
      U.toast('success', 'Room Updated', 'Room ' + data.number + ' has been updated.');
    } else {
      D.create('rooms', data);
      U.toast('success', 'Room Added', 'Room ' + data.number + ' has been added.');
    }
    closeModal();
    state.page = 1;
    render();
  });

  // --------------------------------------------------------------------------
  // Delete
  // --------------------------------------------------------------------------
  function deleteRoom(id, trigger) {
    var room = D.getById('rooms', id);
    if (!room) return;
    U.confirmDialog({
      title: 'Delete Room ' + room.number + '?',
      message: 'This will permanently remove the room and cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    }).then(function (confirmed) {
      if (!confirmed) return;
      D.remove('rooms', id);
      U.toast('success', 'Room Deleted', 'Room ' + room.number + ' has been removed.');
      render();
    });
  }

  // --------------------------------------------------------------------------
  // Toolbar wiring
  // --------------------------------------------------------------------------
  document.getElementById('btn-add-room').addEventListener('click', function () { openModal(null); });
  document.getElementById('btn-grid-view').addEventListener('click', function () { setView('grid'); });
  document.getElementById('btn-list-view').addEventListener('click', function () { setView('list'); });

  function setView(v) {
    state.view = v; state.page = 1;
    document.getElementById('btn-grid-view').classList.toggle('active', v === 'grid');
    document.getElementById('btn-list-view').classList.toggle('active', v === 'list');
    document.getElementById('btn-grid-view').setAttribute('aria-pressed', v === 'grid');
    document.getElementById('btn-list-view').setAttribute('aria-pressed', v === 'list');
    render();
  }

  var debouncedSearch = U.debounce(function (val) {
    state.search = val; state.page = 1; render();
  }, 300);
  document.getElementById('room-search').addEventListener('input', function () { debouncedSearch(this.value); });
  document.getElementById('filter-type').addEventListener('change',   function () { state.filterType = this.value;   state.page = 1; render(); });
  document.getElementById('filter-status').addEventListener('change', function () { state.filterStatus = this.value; state.page = 1; render(); });
  document.getElementById('filter-price').addEventListener('change',  function () { state.filterPrice = this.value;  state.page = 1; render(); });

  function clearFilters() {
    state.search = ''; state.filterType = ''; state.filterStatus = ''; state.filterPrice = ''; state.page = 1;
    document.getElementById('room-search').value   = '';
    document.getElementById('filter-type').value   = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-price').value  = '';
    render();
  }

  // Initial render
  render();

}());
