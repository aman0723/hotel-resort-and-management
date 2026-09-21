/* ==========================================================================
   utils.js — Formatters · Validators · Toast · Modal · Pagination · Sort
   Hotel & Resort Management System
   ========================================================================== */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. Formatters
  // --------------------------------------------------------------------------

  /** Format a number as Indian Rupee string (₹1,23,456) */
  function formatINR(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  /** Format ISO date string as "21 Sep 2026" */
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    var d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /** Return "today" / "yesterday" / "tomorrow" or formatted date */
  function formatDateRelative(dateStr) {
    if (!dateStr) return '—';
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var d = new Date(dateStr + 'T00:00:00');
    var diff = Math.round((d - today) / 86400000);
    if (diff === 0)  return 'Today';
    if (diff === 1)  return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return formatDate(dateStr);
  }

  /** Night count between two ISO date strings */
  function nightCount(checkIn, checkOut) {
    var a = new Date(checkIn + 'T00:00:00');
    var b = new Date(checkOut + 'T00:00:00');
    return Math.max(0, Math.round((b - a) / 86400000));
  }

  /** Compute total (with 12% tax) for booking */
  function computeTotal(pricePerNight, nights) {
    var base = pricePerNight * nights;
    var tax  = Math.round(base * 0.12);
    return { base: base, tax: tax, total: base + tax };
  }

  /** Return initials from a full name ("Arjun Mehta" → "AM") */
  function initials(name) {
    return (name || '').split(' ')
      .filter(Boolean)
      .map(function (w) { return w[0]; })
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  /** Today's ISO date string */
  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  /** Greeting based on hour */
  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  // --------------------------------------------------------------------------
  // 2. Validators
  // --------------------------------------------------------------------------

  function validateEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }

  function validatePhone(val) {
    return /^[6-9]\d{9}$/.test(val.replace(/\s/g, ''));
  }

  function validateRequired(val) {
    return typeof val === 'string' ? val.trim().length > 0 : val != null;
  }

  /**
   * Validate a form. Rules: { fieldName: [{ type, message }] }
   * Types: 'required', 'email', 'phone', 'minLength', 'positive'
   * Returns { valid: bool, errors: { fieldName: message } }
   */
  function validateForm(data, rules) {
    var errors = {};
    Object.keys(rules).forEach(function (field) {
      var val = data[field];
      rules[field].forEach(function (rule) {
        if (errors[field]) return; // first error wins
        var msg = rule.message || 'Invalid value';
        if (rule.type === 'required' && !validateRequired(val)) errors[field] = msg;
        else if (rule.type === 'email' && val && !validateEmail(val)) errors[field] = msg;
        else if (rule.type === 'phone' && val && !validatePhone(val)) errors[field] = msg;
        else if (rule.type === 'minLength' && val && String(val).length < rule.value) errors[field] = msg;
        else if (rule.type === 'positive' && (isNaN(val) || Number(val) <= 0)) errors[field] = msg;
        else if (rule.type === 'custom' && !rule.check(val)) errors[field] = msg;
      });
    });
    return { valid: Object.keys(errors).length === 0, errors: errors };
  }

  /**
   * Show validation errors on form fields.
   * errorsMap: { fieldName: errorMsg }
   * formEl: the form or modal element to scope selectors within
   */
  function showFieldErrors(formEl, errorsMap) {
    // First, clear previous errors
    formEl.querySelectorAll('.field').forEach(function (f) {
      f.classList.remove('error');
      var em = f.querySelector('.error-msg');
      if (em) em.textContent = '';
    });
    Object.keys(errorsMap).forEach(function (fieldName) {
      var input = formEl.querySelector('[name="' + fieldName + '"]');
      if (!input) return;
      var field = input.closest('.field');
      if (!field) return;
      field.classList.add('error');
      var em = field.querySelector('.error-msg');
      if (em) em.textContent = errorsMap[fieldName];
      input.setAttribute('aria-invalid', 'true');
    });
  }

  function clearFieldErrors(formEl) {
    formEl.querySelectorAll('.field').forEach(function (f) {
      f.classList.remove('error');
      var em = f.querySelector('.error-msg');
      if (em) em.textContent = '';
    });
    formEl.querySelectorAll('[aria-invalid]').forEach(function (el) {
      el.removeAttribute('aria-invalid');
    });
  }

  // --------------------------------------------------------------------------
  // 3. Toast Notifications
  // --------------------------------------------------------------------------

  var _toastContainer = null;

  function getToastContainer() {
    if (!_toastContainer) {
      _toastContainer = document.getElementById('toast-container');
      if (!_toastContainer) {
        _toastContainer = document.createElement('div');
        _toastContainer.id = 'toast-container';
        _toastContainer.setAttribute('aria-live', 'polite');
        _toastContainer.setAttribute('aria-atomic', 'false');
        document.body.appendChild(_toastContainer);
      }
    }
    return _toastContainer;
  }

  var _iconMap = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
  };

  /**
   * Show a toast notification.
   * @param {string} type  — 'success' | 'error' | 'warning' | 'info'
   * @param {string} title — bold heading
   * @param {string} msg   — optional body text
   * @param {number} duration — ms before auto-dismiss (default 4000)
   */
  function toast(type, title, msg, duration) {
    var container = getToastContainer();
    var el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', 'alert');
    el.innerHTML =
      '<span class="toast-icon ' + type + '">' + (_iconMap[type] || '') + '</span>' +
      '<div class="toast-content">' +
        '<div class="toast-title">' + escapeHtml(title) + '</div>' +
        (msg ? '<div class="toast-msg">' + escapeHtml(msg) + '</div>' : '') +
      '</div>' +
      '<button class="toast-close" aria-label="Dismiss">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>';
    container.appendChild(el);

    var tid = setTimeout(function () { dismissToast(el); }, duration || 4000);
    el.querySelector('.toast-close').addEventListener('click', function () {
      clearTimeout(tid);
      dismissToast(el);
    });
  }

  function dismissToast(el) {
    el.classList.add('hiding');
    el.addEventListener('animationend', function () { el.remove(); }, { once: true });
  }

  // --------------------------------------------------------------------------
  // 4. Confirm Dialog
  // --------------------------------------------------------------------------

  /**
   * Show a branded confirm dialog before destructive actions.
   * Returns a Promise that resolves true (confirmed) or false (cancelled).
   */
  function confirmDialog(options) {
    options = options || {};
    var title   = options.title   || 'Are you sure?';
    var message = options.message || 'This action cannot be undone.';
    var confirmText = options.confirmText || 'Delete';
    var cancelText  = options.cancelText  || 'Cancel';

    return new Promise(function (resolve) {
      // Build modal markup
      var backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML =
        '<div class="modal modal-sm confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">' +
          '<div class="modal-header">' +
            '<h3 id="confirm-title">' + escapeHtml(title) + '</h3>' +
            '<button class="modal-close" aria-label="Close">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div class="confirm-icon danger">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>' +
            '</div>' +
            '<p style="color:var(--text);max-width:none;text-align:center;">' + escapeHtml(message) + '</p>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-secondary btn-cancel">' + escapeHtml(cancelText) + '</button>' +
            '<button class="btn btn-danger btn-confirm">' + escapeHtml(confirmText) + '</button>' +
          '</div>' +
        '</div>';

      document.body.appendChild(backdrop);
      requestAnimationFrame(function () { backdrop.classList.add('open'); });

      var firstFocus = backdrop.querySelector('.btn-cancel');
      if (firstFocus) firstFocus.focus();

      function close(result) {
        backdrop.classList.remove('open');
        setTimeout(function () { backdrop.remove(); }, 250);
        resolve(result);
      }

      backdrop.querySelector('.btn-confirm').addEventListener('click', function () { close(true); });
      backdrop.querySelector('.btn-cancel').addEventListener('click',  function () { close(false); });
      backdrop.querySelector('.modal-close').addEventListener('click', function () { close(false); });
      backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(false); });
      backdrop.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(false); });
    });
  }

  // --------------------------------------------------------------------------
  // 5. Modal Helpers
  // --------------------------------------------------------------------------

  /**
   * Open a modal backdrop by ID or element.
   * Manages focus trapping and Esc-to-close.
   */
  function openModal(backdropEl, triggerEl) {
    if (typeof backdropEl === 'string') backdropEl = document.getElementById(backdropEl);
    if (!backdropEl) return;
    backdropEl.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Focus first focusable element
    var focusable = getFocusableElements(backdropEl);
    if (focusable.length) focusable[0].focus();
    // Store trigger for focus restoration
    if (triggerEl) backdropEl._trigger = triggerEl;

    // Trap focus
    backdropEl._trapFocus = function (e) {
      if (e.key !== 'Tab') return;
      var els = getFocusableElements(backdropEl);
      if (!els.length) return;
      var first = els[0], last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    backdropEl._escClose = function (e) { if (e.key === 'Escape') closeModal(backdropEl); };
    document.addEventListener('keydown', backdropEl._trapFocus);
    document.addEventListener('keydown', backdropEl._escClose);

    // Click outside to close
    backdropEl._bgClick = function (e) { if (e.target === backdropEl) closeModal(backdropEl); };
    backdropEl.addEventListener('click', backdropEl._bgClick);
  }

  function closeModal(backdropEl) {
    if (typeof backdropEl === 'string') backdropEl = document.getElementById(backdropEl);
    if (!backdropEl) return;
    backdropEl.classList.remove('open');
    document.body.style.overflow = '';
    if (backdropEl._trapFocus) document.removeEventListener('keydown', backdropEl._trapFocus);
    if (backdropEl._escClose)  document.removeEventListener('keydown', backdropEl._escClose);
    if (backdropEl._bgClick)   backdropEl.removeEventListener('click', backdropEl._bgClick);
    // Restore focus to trigger
    if (backdropEl._trigger) {
      try { backdropEl._trigger.focus(); } catch (e) {}
    }
  }

  function getFocusableElements(container) {
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(function (el) { return !el.closest('[hidden]') && el.offsetParent !== null; });
  }

  // --------------------------------------------------------------------------
  // 6. Pagination
  // --------------------------------------------------------------------------

  /**
   * Render pagination controls.
   * @param {HTMLElement} container — where to inject pagination
   * @param {number} totalItems
   * @param {number} currentPage  — 1-based
   * @param {number} perPage      — default 10
   * @param {function} onPageChange — called with new page number
   */
  function renderPagination(container, totalItems, currentPage, perPage, onPageChange) {
    perPage = perPage || 10;
    var totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    container.innerHTML = '';

    if (totalPages <= 1 && totalItems <= perPage) {
      // Show info but no controls needed
      var info = document.createElement('span');
      info.className = 'page-info';
      info.textContent = totalItems + ' item' + (totalItems !== 1 ? 's' : '');
      container.appendChild(info);
      return;
    }

    // Info label
    var start = (currentPage - 1) * perPage + 1;
    var end   = Math.min(currentPage * perPage, totalItems);
    var info = document.createElement('span');
    info.className = 'page-info';
    info.textContent = start + '–' + end + ' of ' + totalItems;
    container.appendChild(info);

    // Prev button
    var prev = document.createElement('button');
    prev.className = 'page-btn';
    prev.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>';
    prev.setAttribute('aria-label', 'Previous page');
    if (currentPage === 1) prev.disabled = true;
    prev.addEventListener('click', function () { onPageChange(currentPage - 1); });
    container.appendChild(prev);

    // Page numbers (max 7 shown with ellipsis)
    var pages = buildPageRange(currentPage, totalPages);
    pages.forEach(function (p) {
      if (p === '...') {
        var ellipsis = document.createElement('span');
        ellipsis.className = 'page-info';
        ellipsis.textContent = '...';
        container.appendChild(ellipsis);
      } else {
        var btn = document.createElement('button');
        btn.className = 'page-btn' + (p === currentPage ? ' active' : '');
        btn.textContent = p;
        btn.setAttribute('aria-label', 'Page ' + p);
        if (p === currentPage) btn.setAttribute('aria-current', 'page');
        btn.addEventListener('click', function () { onPageChange(p); });
        container.appendChild(btn);
      }
    });

    // Next button
    var next = document.createElement('button');
    next.className = 'page-btn';
    next.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';
    next.setAttribute('aria-label', 'Next page');
    if (currentPage === totalPages) next.disabled = true;
    next.addEventListener('click', function () { onPageChange(currentPage + 1); });
    container.appendChild(next);
  }

  function buildPageRange(current, total) {
    if (total <= 7) {
      var r = [];
      for (var i = 1; i <= total; i++) r.push(i);
      return r;
    }
    var pages = [1];
    if (current > 3) pages.push('...');
    var start = Math.max(2, current - 1);
    var end   = Math.min(total - 1, current + 1);
    for (var j = start; j <= end; j++) pages.push(j);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  // --------------------------------------------------------------------------
  // 7. Sorting
  // --------------------------------------------------------------------------

  /**
   * Sort an array of objects by a key.
   * @param {Array}  arr
   * @param {string} key
   * @param {string} dir  — 'asc' | 'desc'
   */
  function sortBy(arr, key, dir) {
    return arr.slice().sort(function (a, b) {
      var av = a[key], bv = b[key];
      if (av == null) av = '';
      if (bv == null) bv = '';
      if (typeof av === 'number' && typeof bv === 'number') {
        return dir === 'desc' ? bv - av : av - bv;
      }
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
      if (av < bv) return dir === 'desc' ?  1 : -1;
      if (av > bv) return dir === 'desc' ? -1 :  1;
      return 0;
    });
  }

  // --------------------------------------------------------------------------
  // 8. Debounce
  // --------------------------------------------------------------------------

  function debounce(fn, delay) {
    var tid;
    return function () {
      clearTimeout(tid);
      var args = arguments;
      var ctx  = this;
      tid = setTimeout(function () { fn.apply(ctx, args); }, delay || 300);
    };
  }

  // --------------------------------------------------------------------------
  // 9. HTML escape (XSS guard)
  // --------------------------------------------------------------------------

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --------------------------------------------------------------------------
  // 10. Status badge helper
  // --------------------------------------------------------------------------

  var STATUS_CLASS = {
    'available':    'badge-success',
    'occupied':     'badge-danger',
    'cleaning':     'badge-warning',
    'maintenance':  'badge-info',
    'confirmed':    'badge-info',
    'pending':      'badge-warning',
    'checked-in':   'badge-success',
    'checked-out':  'badge-neutral',
    'cancelled':    'badge-danger',
    'paid':         'badge-success',
    'refunded':     'badge-warning',
    'failed':       'badge-danger',
    'active':       'badge-success',
    'on-leave':     'badge-warning',
    'completed':    'badge-success',
    'in-progress':  'badge-info',
    'requested':    'badge-neutral'
  };

  function statusBadge(status) {
    var cls = STATUS_CLASS[status] || 'badge-neutral';
    var label = status ? status.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : '—';
    return '<span class="badge ' + cls + '">' + escapeHtml(label) + '</span>';
  }

  // --------------------------------------------------------------------------
  // 11. Skeleton shimmer helper
  // --------------------------------------------------------------------------

  function showSkeletons(container, rows, cols) {
    container.innerHTML = '';
    for (var r = 0; r < (rows || 5); r++) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border)';
      for (var c = 0; c < (cols || 5); c++) {
        var cell = document.createElement('div');
        cell.className = 'skeleton';
        cell.style.cssText = 'height:16px;flex:1;border-radius:6px';
        row.appendChild(cell);
      }
      container.appendChild(row);
    }
  }

  // --------------------------------------------------------------------------
  // 12. Dropdown toggle utility
  // --------------------------------------------------------------------------

  /** Toggle an .open class on a dropdown, close others on outside click */
  function initDropdown(triggerEl, menuEl) {
    triggerEl.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = menuEl.classList.contains('open');
      // Close all dropdowns
      document.querySelectorAll('.dropdown-menu.open').forEach(function (m) { m.classList.remove('open'); });
      if (!isOpen) menuEl.classList.add('open');
    });
    document.addEventListener('click', function () {
      menuEl.classList.remove('open');
    });
  }

  // Expose on global namespace
  window.HRMS = window.HRMS || {};
  window.HRMS.utils = {
    formatINR: formatINR,
    formatDate: formatDate,
    formatDateRelative: formatDateRelative,
    nightCount: nightCount,
    computeTotal: computeTotal,
    initials: initials,
    todayISO: todayISO,
    greeting: greeting,
    validateEmail: validateEmail,
    validatePhone: validatePhone,
    validateRequired: validateRequired,
    validateForm: validateForm,
    showFieldErrors: showFieldErrors,
    clearFieldErrors: clearFieldErrors,
    toast: toast,
    confirmDialog: confirmDialog,
    openModal: openModal,
    closeModal: closeModal,
    renderPagination: renderPagination,
    sortBy: sortBy,
    debounce: debounce,
    escapeHtml: escapeHtml,
    statusBadge: statusBadge,
    showSkeletons: showSkeletons,
    initDropdown: initDropdown
  };

}());
