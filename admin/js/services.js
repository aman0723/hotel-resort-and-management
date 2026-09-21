/* ==========================================================================
   services.js — Services: card/list CRUD, availability toggle, requests table
   ========================================================================== */

(function () {
  'use strict';

  var D = window.HRMS.data;
  var U = window.HRMS.utils;
  var L = window.HRMS.layout;

  L.inject({ title: 'Services', breadcrumb: [{ label: 'Services' }] });

  var state = { view: 'grid', search: '', category: '', editId: null };

  var CATEGORY_ICONS = {
    'Restaurant':    'concierge-bell',
    'Spa & Wellness':'star',
    'Swimming Pool': 'users',
    'Laundry':       'refresh',
    'Room Service':  'bed',
    'Transport':     'arrow-up',
    'Events':        'calendar'
  };

  // --------------------------------------------------------------------------
  // Render services
  // --------------------------------------------------------------------------
  function getFiltered() {
    var services = D.getAll('services');
    if (state.search) {
      var q = state.search.toLowerCase();
      services = services.filter(function (s) { return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q); });
    }
    if (state.category) services = services.filter(function (s) { return s.category === state.category; });
    return services;
  }

  function render() {
    var filtered = getFiltered();
    var container = document.getElementById('svc-container');
    if (!container) return;

    if (!filtered.length) {
      container.innerHTML = '<div class="card"><div class="empty-state"><div class="empty-icon"><svg width="28" height="28"><use href="#icon-concierge-bell"/></svg></div><p>No services found.</p></div></div>';
    } else if (state.view === 'grid') {
      container.innerHTML = '<div class="cards-grid">' + filtered.map(svcCard).join('') + '</div>';
    } else {
      var rows = filtered.map(function (s) {
        return '<tr>' +
          '<td class="font-semibold">' + U.escapeHtml(s.name) + '</td>' +
          '<td><span class="badge badge-primary">' + U.escapeHtml(s.category) + '</span></td>' +
          '<td class="text-sm text-muted line-clamp-2">' + U.escapeHtml(s.description || '') + '</td>' +
          '<td class="font-semibold">' + U.formatINR(s.price) + '</td>' +
          '<td>' + (s.available ? '<span class="badge badge-success">Available</span>' : '<span class="badge badge-neutral">Unavailable</span>') + '</td>' +
          '<td><div class="table-actions">' +
            '<button class="btn btn-icon btn-sm btn-secondary btn-edit-svc" data-id="' + s._id + '" data-tooltip="Edit"><svg width="14" height="14"><use href="#icon-edit"/></svg></button>' +
            '<button class="btn btn-icon btn-sm btn-danger btn-delete-svc" data-id="' + s._id + '" data-tooltip="Delete"><svg width="14" height="14"><use href="#icon-trash"/></svg></button>' +
          '</div></td>' +
        '</tr>';
      }).join('');
      container.innerHTML = '<div class="card" style="overflow:hidden"><div class="table-wrap" style="border:none;box-shadow:none"><table class="table"><thead><tr><th>Name</th><th>Category</th><th>Description</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    }

    // Attach events
    container.querySelectorAll('.btn-edit-svc').forEach(function (btn) { btn.addEventListener('click', function () { openSvcModal(btn.dataset.id); }); });
    container.querySelectorAll('.btn-delete-svc').forEach(function (btn) { btn.addEventListener('click', function () { deleteSvc(btn.dataset.id); }); });
    container.querySelectorAll('.btn-toggle-svc').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var svc = D.getById('services', btn.dataset.id);
        if (!svc) return;
        D.update('services', btn.dataset.id, { available: !svc.available });
        U.toast('info', 'Availability Updated', svc.name + ' is now ' + (!svc.available ? 'available' : 'unavailable') + '.');
        render();
      });
    });
  }

  function svcCard(s) {
    var iconName = CATEGORY_ICONS[s.category] || 'star';
    return '<article class="card" style="display:flex;flex-direction:column;gap:0">' +
      '<div style="height:100px;background:linear-gradient(135deg,var(--primary-dark),var(--primary-mid));display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.4)">' +
        '<svg width="40" height="40"><use href="#icon-' + iconName + '"/></svg>' +
      '</div>' +
      '<div style="padding:var(--s4) var(--s5);flex:1;display:flex;flex-direction:column;gap:var(--s2)">' +
        '<div class="flex items-start justify-between gap-2">' +
          '<span class="font-semibold" style="font-size:.95rem">' + U.escapeHtml(s.name) + '</span>' +
          (s.available ? '<span class="badge badge-success">Available</span>' : '<span class="badge badge-neutral">Off</span>') +
        '</div>' +
        '<span class="badge badge-primary" style="align-self:flex-start">' + U.escapeHtml(s.category) + '</span>' +
        '<p class="text-sm text-muted line-clamp-2" style="max-width:none;margin:0">' + U.escapeHtml(s.description || '') + '</p>' +
        '<div class="font-semibold text-primary" style="font-size:1rem;margin-top:auto">' + U.formatINR(s.price) + '</div>' +
      '</div>' +
      '<div style="padding:var(--s3) var(--s5);border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:var(--s2)">' +
        '<button class="btn btn-icon btn-sm btn-secondary btn-toggle-svc" data-id="' + s._id + '" data-tooltip="' + (s.available ? 'Disable' : 'Enable') + '">' +
          '<svg width="14" height="14"><use href="#icon-' + (s.available ? 'x' : 'check') + '"/></svg>' +
        '</button>' +
        '<div class="flex gap-1">' +
          '<button class="btn btn-icon btn-sm btn-secondary btn-edit-svc" data-id="' + s._id + '" data-tooltip="Edit"><svg width="14" height="14"><use href="#icon-edit"/></svg></button>' +
          '<button class="btn btn-icon btn-sm btn-danger btn-delete-svc" data-id="' + s._id + '" data-tooltip="Delete"><svg width="14" height="14"><use href="#icon-trash"/></svg></button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  // --------------------------------------------------------------------------
  // Service Requests table
  // --------------------------------------------------------------------------
  function renderRequests() {
    var sreqs = D.getAll('serviceRequests');
    var guests = D.getAll('guests');
    var rooms  = D.getAll('rooms');
    var services = D.getAll('services');

    var tbody = document.getElementById('sreq-body');
    if (!sreqs.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state" style="padding:var(--s6)"><p>No service requests yet.</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = sreqs.map(function (req) {
      var g   = guests.find(function (x) { return x._id === req.guestId; });
      var r   = rooms.find(function (x)  { return x._id === req.roomId;  });
      var svc = services.find(function (x){ return x._id === req.serviceId; });
      return '<tr>' +
        '<td class="font-semibold text-sm">' + U.escapeHtml(req._id) + '</td>' +
        '<td>' + U.escapeHtml(g ? g.name : '—') + '</td>' +
        '<td>' + (r ? 'Room ' + r.number : '—') + '</td>' +
        '<td>' + U.escapeHtml(svc ? svc.name : '—') + '</td>' +
        '<td>' + U.formatDate(req.date) + '</td>' +
        '<td>' +
          '<select class="select sreq-status" data-id="' + req._id + '" style="height:30px;font-size:.75rem;padding:0 28px 0 8px;width:auto" aria-label="Request status">' +
            ['requested','in-progress','completed'].map(function (s) {
              return '<option value="' + s + '"' + (req.status === s ? ' selected' : '') + '>' + s.replace(/-/g,' ').replace(/\b\w/g, function(c){return c.toUpperCase();}) + '</option>';
            }).join('') +
          '</select>' +
        '</td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('.sreq-status').forEach(function (sel) {
      sel.addEventListener('change', function () {
        D.update('serviceRequests', sel.dataset.id, { status: sel.value });
        U.toast('info', 'Status Updated', 'Service request updated.');
        renderRequests();
      });
    });
  }

  // --------------------------------------------------------------------------
  // Service modal
  // --------------------------------------------------------------------------
  var backdrop = document.getElementById('svc-modal-backdrop');

  function openSvcModal(id) {
    state.editId = id || null;
    var form = document.getElementById('svc-form');
    U.clearFieldErrors(form);
    document.getElementById('svc-modal-title').textContent = id ? 'Edit Service' : 'Add Service';
    form.reset();
    document.getElementById('s-available').checked = true;
    if (id) {
      var s = D.getById('services', id);
      if (!s) return;
      document.getElementById('s-name').value        = s.name;
      document.getElementById('s-category').value    = s.category;
      document.getElementById('s-price').value       = s.price;
      document.getElementById('s-description').value = s.description || '';
      document.getElementById('s-available').checked = !!s.available;
    }
    U.openModal(backdrop, document.getElementById('btn-add-svc'));
  }

  function closeSvcModal() { U.closeModal(backdrop); }
  document.getElementById('svc-modal-close').addEventListener('click', closeSvcModal);
  document.getElementById('svc-modal-cancel').addEventListener('click', closeSvcModal);
  document.getElementById('btn-add-svc').addEventListener('click', function () { openSvcModal(null); });

  document.getElementById('svc-modal-save').addEventListener('click', function () {
    var form = document.getElementById('svc-form');
    var data = {
      name:        document.getElementById('s-name').value.trim(),
      category:    document.getElementById('s-category').value,
      price:       Number(document.getElementById('s-price').value),
      description: document.getElementById('s-description').value.trim(),
      available:   document.getElementById('s-available').checked
    };
    var result = U.validateForm(data, {
      name:     [{ type: 'required', message: 'Service name is required.' }],
      category: [{ type: 'required', message: 'Category is required.' }],
      price:    [{ type: 'positive', message: 'Enter a valid price.' }]
    });
    if (!result.valid) { U.showFieldErrors(form, result.errors); return; }

    if (state.editId) {
      D.update('services', state.editId, data);
      U.toast('success', 'Service Updated', data.name + ' updated.');
    } else {
      D.create('services', data);
      U.toast('success', 'Service Added', data.name + ' added.');
    }
    closeSvcModal();
    render();
    renderRequests();
  });

  function deleteSvc(id) {
    var s = D.getById('services', id);
    if (!s) return;
    U.confirmDialog({ title: 'Delete Service?', message: 'Remove "' + s.name + '"?', confirmText: 'Delete' }).then(function (ok) {
      if (!ok) return;
      D.remove('services', id);
      U.toast('success', 'Service Deleted', s.name + ' removed.');
      render();
    });
  }

  // --------------------------------------------------------------------------
  // Controls
  // --------------------------------------------------------------------------
  document.getElementById('btn-svc-grid').addEventListener('click', function () { setView('grid'); });
  document.getElementById('btn-svc-list').addEventListener('click', function () { setView('list'); });
  function setView(v) {
    state.view = v;
    document.getElementById('btn-svc-grid').classList.toggle('active', v === 'grid');
    document.getElementById('btn-svc-list').classList.toggle('active', v === 'list');
    render();
  }
  var dSearch = U.debounce(function (val) { state.search = val; render(); }, 300);
  document.getElementById('svc-search').addEventListener('input', function () { dSearch(this.value); });
  document.getElementById('filter-svc-category').addEventListener('change', function () { state.category = this.value; render(); });

  render();
  renderRequests();

}());
