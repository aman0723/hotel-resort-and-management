/* ==========================================================================
   staff.js — Staff page: table, CRUD, filters, sort, pagination
   ========================================================================== */

(function () {
  'use strict';

  var D = window.HRMS.data;
  var U = window.HRMS.utils;
  var L = window.HRMS.layout;

  L.inject({ title: 'Staff', breadcrumb: [{ label: 'Staff' }] });

  var state = { search: '', filterRole: '', filterShift: '', filterStatus: '', sortKey: 'name', sortDir: 'asc', page: 1, perPage: 10, editId: null };

  var SHIFT_BADGE = { Morning: 'badge-info', Evening: 'badge-warning', Night: 'badge-neutral' };

  // --------------------------------------------------------------------------
  // Filter + render
  // --------------------------------------------------------------------------
  function getFiltered() {
    var staff = D.getAll('staff');
    if (state.search) {
      var q = state.search.toLowerCase();
      staff = staff.filter(function (s) { return s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.department.toLowerCase().includes(q); });
    }
    if (state.filterRole)   staff = staff.filter(function (s) { return s.role === state.filterRole; });
    if (state.filterShift)  staff = staff.filter(function (s) { return s.shift === state.filterShift; });
    if (state.filterStatus) staff = staff.filter(function (s) { return s.status === state.filterStatus; });
    return U.sortBy(staff, state.sortKey, state.sortDir);
  }

  function render() {
    var filtered = getFiltered();
    var total = filtered.length;
    var start = (state.page - 1) * state.perPage;
    var pageItems = filtered.slice(start, start + state.perPage);

    document.getElementById('staff-count').textContent = total + ' staff member' + (total !== 1 ? 's' : '');

    var tbody = document.getElementById('staff-body');
    if (!total) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state" style="padding:var(--s8)"><div class="empty-icon"><svg width="28" height="28"><use href="#icon-id-badge"/></svg></div><p>No staff members found.</p></div></td></tr>';
    } else {
      tbody.innerHTML = pageItems.map(function (s) {
        var shiftCls = SHIFT_BADGE[s.shift] || 'badge-neutral';
        return '<tr>' +
          '<td>' +
            '<div class="flex items-center gap-3">' +
              '<div class="avatar">' + U.initials(s.name) + '</div>' +
              '<div><div class="font-semibold">' + U.escapeHtml(s.name) + '</div><div class="text-xs text-muted">' + U.escapeHtml(s.email) + '</div></div>' +
            '</div>' +
          '</td>' +
          '<td><span class="badge badge-primary">' + U.escapeHtml(s.role) + '</span></td>' +
          '<td class="text-sm">' + U.escapeHtml(s.department) + '</td>' +
          '<td class="text-sm">' + U.escapeHtml(s.phone) + '</td>' +
          '<td><span class="badge ' + shiftCls + '">' + U.escapeHtml(s.shift) + '</span></td>' +
          '<td class="text-sm">' + U.formatDate(s.joiningDate) + '</td>' +
          '<td>' + U.statusBadge(s.status) + '</td>' +
          '<td><div class="table-actions">' +
            '<button class="btn btn-icon btn-sm btn-secondary btn-edit-staff" data-id="' + s._id + '" data-tooltip="Edit"><svg width="14" height="14"><use href="#icon-edit"/></svg></button>' +
            '<button class="btn btn-icon btn-sm btn-danger btn-delete-staff" data-id="' + s._id + '" data-tooltip="Delete"><svg width="14" height="14"><use href="#icon-trash"/></svg></button>' +
          '</div></td>' +
        '</tr>';
      }).join('');
    }

    // Sort indicators
    document.querySelectorAll('.sortable').forEach(function (th) {
      th.classList.remove('sort-asc', 'sort-desc');
      if (th.dataset.sort === state.sortKey) th.classList.add('sort-' + state.sortDir);
    });

    // Events
    tbody.querySelectorAll('.btn-edit-staff').forEach(function (btn) { btn.addEventListener('click', function () { openStaffModal(btn.dataset.id); }); });
    tbody.querySelectorAll('.btn-delete-staff').forEach(function (btn) { btn.addEventListener('click', function () { deleteStaff(btn.dataset.id); }); });

    U.renderPagination(document.getElementById('staff-pagination'), total, state.page, state.perPage, function (p) { state.page = p; render(); });
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
  // Modal
  // --------------------------------------------------------------------------
  var backdrop = document.getElementById('staff-modal-backdrop');

  function openStaffModal(id) {
    state.editId = id || null;
    var form = document.getElementById('staff-form');
    U.clearFieldErrors(form);
    document.getElementById('staff-modal-title').textContent = id ? 'Edit Staff Member' : 'Add Staff Member';
    form.reset();
    document.getElementById('sf-joining').value = U.todayISO();
    if (id) {
      var s = D.getById('staff', id);
      if (!s) return;
      document.getElementById('sf-name').value       = s.name;
      document.getElementById('sf-role').value       = s.role;
      document.getElementById('sf-department').value = s.department;
      document.getElementById('sf-phone').value      = s.phone;
      document.getElementById('sf-email').value      = s.email;
      document.getElementById('sf-shift').value      = s.shift;
      document.getElementById('sf-joining').value    = s.joiningDate;
      document.getElementById('sf-status').value     = s.status;
    }
    U.openModal(backdrop, document.getElementById('btn-add-staff'));
  }

  function closeStaffModal() { U.closeModal(backdrop); }
  document.getElementById('staff-modal-close').addEventListener('click', closeStaffModal);
  document.getElementById('staff-modal-cancel').addEventListener('click', closeStaffModal);
  document.getElementById('btn-add-staff').addEventListener('click', function () { openStaffModal(null); });

  document.getElementById('staff-modal-save').addEventListener('click', function () {
    var form = document.getElementById('staff-form');
    var data = {
      name:        document.getElementById('sf-name').value.trim(),
      role:        document.getElementById('sf-role').value,
      department:  document.getElementById('sf-department').value.trim(),
      phone:       document.getElementById('sf-phone').value.trim(),
      email:       document.getElementById('sf-email').value.trim(),
      shift:       document.getElementById('sf-shift').value,
      joiningDate: document.getElementById('sf-joining').value,
      status:      document.getElementById('sf-status').value
    };
    var result = U.validateForm(data, {
      name:  [{ type: 'required', message: 'Name is required.' }],
      role:  [{ type: 'required', message: 'Role is required.' }],
      phone: [{ type: 'required', message: 'Phone is required.' }, { type: 'phone', message: '10-digit mobile required.' }],
      email: [{ type: 'required', message: 'Email is required.' }, { type: 'email', message: 'Enter a valid email.' }]
    });
    if (!result.valid) { U.showFieldErrors(form, result.errors); return; }

    if (state.editId) {
      D.update('staff', state.editId, data);
      U.toast('success', 'Staff Updated', data.name + ' has been updated.');
    } else {
      D.create('staff', data);
      U.toast('success', 'Staff Added', data.name + ' has been added.');
    }
    closeStaffModal();
    render();
  });

  // --------------------------------------------------------------------------
  // Delete
  // --------------------------------------------------------------------------
  function deleteStaff(id) {
    var s = D.getById('staff', id);
    if (!s) return;
    U.confirmDialog({ title: 'Remove Staff Member?', message: 'Remove ' + s.name + '? This cannot be undone.', confirmText: 'Delete' }).then(function (ok) {
      if (!ok) return;
      D.remove('staff', id);
      U.toast('success', 'Staff Removed', s.name + ' has been removed.');
      render();
    });
  }

  // --------------------------------------------------------------------------
  // Filters
  // --------------------------------------------------------------------------
  var dSearch = U.debounce(function (v) { state.search = v; state.page = 1; render(); }, 300);
  document.getElementById('staff-search').addEventListener('input', function () { dSearch(this.value); });
  document.getElementById('filter-staff-role').addEventListener('change', function () { state.filterRole = this.value; state.page = 1; render(); });
  document.getElementById('filter-staff-shift').addEventListener('change', function () { state.filterShift = this.value; state.page = 1; render(); });
  document.getElementById('filter-staff-status').addEventListener('change', function () { state.filterStatus = this.value; state.page = 1; render(); });

  render();

}());
