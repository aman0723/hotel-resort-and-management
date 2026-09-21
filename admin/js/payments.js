/* ==========================================================================
   payments.js — Payments: summary KPIs, table, record modal, invoice print
   ========================================================================== */

(function () {
  'use strict';

  var D = window.HRMS.data;
  var U = window.HRMS.utils;
  var L = window.HRMS.layout;

  L.inject({ title: 'Payments', breadcrumb: [{ label: 'Payments' }] });

  var state = { search: '', filterStatus: '', filterMethod: '', dateFrom: '', dateTo: '', page: 1, perPage: 10, editId: null };

  var todayStr = U.todayISO();

  // --------------------------------------------------------------------------
  // Summary KPIs
  // --------------------------------------------------------------------------
  function renderKPIs() {
    var payments = D.getAll('payments');
    var totalRevenue   = payments.filter(function (p) { return p.status === 'paid'; }).reduce(function (s, p) { return s + p.amount; }, 0);
    var totalPending   = payments.filter(function (p) { return p.status === 'pending'; }).reduce(function (s, p) { return s + p.amount; }, 0);
    var totalRefunded  = payments.filter(function (p) { return p.status === 'refunded'; }).reduce(function (s, p) { return s + p.amount; }, 0);
    var todayRevenue   = payments.filter(function (p) { return p.status === 'paid' && p.date === todayStr; }).reduce(function (s, p) { return s + p.amount; }, 0);

    var kpis = [
      { label: 'Total Revenue', value: U.formatINR(totalRevenue), iconBg: 'background:var(--success-bg);color:var(--success-text)', icon: 'credit-card' },
      { label: 'Pending Payments', value: U.formatINR(totalPending), iconBg: 'background:var(--warning-bg);color:var(--warning-text)', icon: 'refresh' },
      { label: 'Refunded', value: U.formatINR(totalRefunded), iconBg: 'background:var(--info-bg);color:var(--info-text)', icon: 'arrow-up' },
      { label: 'Revenue Today', value: U.formatINR(todayRevenue), iconBg: 'background:var(--gold-soft);color:var(--gold)', icon: 'star' }
    ];

    document.getElementById('payment-kpi-grid').innerHTML = kpis.map(function (k) {
      return '<article class="kpi-card">' +
        '<div class="kpi-icon" style="' + k.iconBg + '"><svg width="22" height="22"><use href="#icon-' + k.icon + '"/></svg></div>' +
        '<div class="kpi-number" style="font-size:1.4rem">' + k.value + '</div>' +
        '<div class="kpi-label">' + k.label + '</div>' +
      '</article>';
    }).join('');
  }

  // --------------------------------------------------------------------------
  // Filter + table
  // --------------------------------------------------------------------------
  function getFiltered() {
    var payments = D.getAll('payments');
    if (state.search) {
      var q = state.search.toLowerCase();
      var guests = D.getAll('guests');
      payments = payments.filter(function (p) {
        var g = guests.find(function (x) { return x._id === p.guestId; });
        return p._id.toLowerCase().includes(q) || (g && g.name.toLowerCase().includes(q));
      });
    }
    if (state.filterStatus) payments = payments.filter(function (p) { return p.status === state.filterStatus; });
    if (state.filterMethod) payments = payments.filter(function (p) { return p.method === state.filterMethod; });
    if (state.dateFrom) payments = payments.filter(function (p) { return p.date >= state.dateFrom; });
    if (state.dateTo)   payments = payments.filter(function (p) { return p.date <= state.dateTo; });
    return payments.sort(function (a, b) { return b.date.localeCompare(a.date); });
  }

  function render() {
    var filtered = getFiltered();
    var total = filtered.length;
    var start = (state.page - 1) * state.perPage;
    var pageItems = filtered.slice(start, start + state.perPage);

    document.getElementById('pay-count').textContent = total + ' payment' + (total !== 1 ? 's' : '');

    var tbody = document.getElementById('pay-body');
    if (!total) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state" style="padding:var(--s8)"><div class="empty-icon"><svg width="28" height="28"><use href="#icon-credit-card"/></svg></div><p>No payments found.</p></div></td></tr>';
    } else {
      tbody.innerHTML = pageItems.map(function (p) {
        var g = D.getById('guests', p.guestId);
        return '<tr>' +
          '<td class="font-semibold text-sm text-primary">' + p._id + '</td>' +
          '<td class="text-sm">' + p.bookingId + '</td>' +
          '<td>' + U.escapeHtml(g ? g.name : '—') + '</td>' +
          '<td class="font-semibold">' + U.formatINR(p.amount) + '</td>' +
          '<td><span class="badge badge-neutral">' + p.method + '</span></td>' +
          '<td>' + U.formatDate(p.date) + '</td>' +
          '<td>' + U.statusBadge(p.status) + '</td>' +
          '<td><div class="table-actions">' +
            '<button class="btn btn-icon btn-sm btn-secondary btn-view-invoice" data-id="' + p._id + '" data-tooltip="Invoice"><svg width="14" height="14"><use href="#icon-eye"/></svg></button>' +
          '</div></td>' +
        '</tr>';
      }).join('');
    }

    tbody.querySelectorAll('.btn-view-invoice').forEach(function (btn) { btn.addEventListener('click', function () { openInvoice(btn.dataset.id); }); });
    U.renderPagination(document.getElementById('pay-pagination'), total, state.page, state.perPage, function (p) { state.page = p; render(); });
  }

  // --------------------------------------------------------------------------
  // Record Payment modal
  // --------------------------------------------------------------------------
  var backdrop = document.getElementById('pay-modal-backdrop');

  function openPayModal() {
    var form = document.getElementById('pay-form');
    U.clearFieldErrors(form);
    form.reset();
    document.getElementById('p-date').value = todayStr;
    document.getElementById('p-guest').value = '';

    // Populate booking select
    var bSel = document.getElementById('p-booking');
    bSel.innerHTML = '<option value="">Select booking...</option>' +
      D.getAll('bookings').filter(function (b) { return b.status !== 'cancelled'; }).map(function (b) {
        var g = D.getById('guests', b.guestId);
        return '<option value="' + b._id + '" data-guest="' + U.escapeHtml(g ? g.name : '') + '" data-amount="' + b.totalAmount + '">' +
          b._id + ' — ' + (g ? g.name : '?') + ' — ' + U.formatINR(b.totalAmount) + '</option>';
      }).join('');

    U.openModal(backdrop, document.getElementById('btn-record-payment'));
  }

  // Auto-fill guest/amount on booking select
  document.getElementById('p-booking').addEventListener('change', function () {
    var opt = this.options[this.selectedIndex];
    document.getElementById('p-guest').value  = opt.dataset.guest || '';
    document.getElementById('p-amount').value = opt.dataset.amount || '';
  });

  function closePayModal() { U.closeModal(backdrop); }
  document.getElementById('pay-modal-close').addEventListener('click', closePayModal);
  document.getElementById('pay-modal-cancel').addEventListener('click', closePayModal);
  document.getElementById('btn-record-payment').addEventListener('click', openPayModal);

  document.getElementById('pay-modal-save').addEventListener('click', function () {
    var form = document.getElementById('pay-form');
    var data = {
      bookingId: document.getElementById('p-booking').value,
      amount:    Number(document.getElementById('p-amount').value),
      method:    document.getElementById('p-method').value,
      date:      document.getElementById('p-date').value,
      status:    document.getElementById('p-status').value
    };
    // Resolve guestId from booking
    var booking = D.getById('bookings', data.bookingId);
    if (booking) data.guestId = booking.guestId;

    var errors = {};
    if (!data.bookingId) errors.bookingId = 'Please select a booking.';
    if (!data.amount || data.amount <= 0) errors.amount = 'Enter a valid amount.';
    if (!data.method) errors.method = 'Select a payment method.';
    if (!data.date)   errors.date   = 'Date is required.';

    if (Object.keys(errors).length) { U.showFieldErrors(form, errors); return; }

    D.create('payments', data);
    U.toast('success', 'Payment Recorded', U.formatINR(data.amount) + ' via ' + data.method + '.');
    closePayModal();
    renderKPIs();
    render();
  });

  // --------------------------------------------------------------------------
  // Invoice modal
  // --------------------------------------------------------------------------
  var invoiceBackdrop = document.getElementById('invoice-modal-backdrop');

  function openInvoice(paymentId) {
    var p = D.getById('payments', paymentId);
    if (!p) return;
    var booking = D.getById('bookings', p.bookingId);
    var guest   = D.getById('guests', p.guestId || (booking && booking.guestId));
    var room    = booking ? D.getById('rooms', booking.roomId) : null;
    var nights  = booking ? U.nightCount(booking.checkIn, booking.checkOut) : 0;
    var base    = room ? room.pricePerNight * nights : (p.amount / 1.12);
    var tax     = booking ? booking.tax : Math.round(base * 0.12);

    document.getElementById('invoice-print-area').innerHTML =
      '<div style="font-family:\'Inter\',sans-serif;max-width:620px;margin:0 auto">' +
        '<!-- Hotel header -->' +
        '<div style="text-align:center;border-bottom:2px solid #C9A85C;padding-bottom:20px;margin-bottom:24px">' +
          '<div style="font-family:\'Playfair Display\',Georgia,serif;font-size:24px;font-weight:700;color:#0B5560">Hotel &amp; Resort</div>' +
          '<div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#C9A85C;margin-top:4px">Luxury Stay &bull; Beautiful Memories</div>' +
          '<div style="font-size:12px;color:#6B7280;margin-top:8px">123 Resort Boulevard, Goa, India · info@hotelresort.in · +91-832-123-4567</div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:24px">' +
          '<div><div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;margin-bottom:4px">Invoice To</div>' +
            '<div style="font-weight:700">' + U.escapeHtml(guest ? guest.name : '—') + '</div>' +
            '<div style="font-size:13px;color:#6B7280">' + U.escapeHtml(guest ? guest.email : '') + '</div>' +
            '<div style="font-size:13px;color:#6B7280">' + U.escapeHtml(guest ? guest.phone : '') + '</div>' +
          '</div>' +
          '<div style="text-align:right"><div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;margin-bottom:4px">Invoice Details</div>' +
            '<div><strong>Invoice #:</strong> ' + U.escapeHtml(p._id) + '</div>' +
            '<div><strong>Date:</strong> ' + U.formatDate(p.date) + '</div>' +
            '<div><strong>Method:</strong> ' + U.escapeHtml(p.method) + '</div>' +
          '</div>' +
        '</div>' +
        '<table style="width:100%;border-collapse:collapse;margin-bottom:24px">' +
          '<thead><tr style="background:#E6F0F1">' +
            '<th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6B7280">Description</th>' +
            '<th style="padding:10px 12px;text-align:right;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6B7280">Nights</th>' +
            '<th style="padding:10px 12px;text-align:right;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6B7280">Rate</th>' +
            '<th style="padding:10px 12px;text-align:right;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6B7280">Amount</th>' +
          '</tr></thead>' +
          '<tbody>' +
            '<tr style="border-bottom:1px solid #E5E7EB">' +
              '<td style="padding:12px;font-size:14px">Room ' + U.escapeHtml(room ? room.number : '—') + ' — ' + U.escapeHtml(room ? room.type : '—') + '</td>' +
              '<td style="padding:12px;text-align:right;font-size:14px">' + nights + '</td>' +
              '<td style="padding:12px;text-align:right;font-size:14px">' + U.formatINR(room ? room.pricePerNight : 0) + '</td>' +
              '<td style="padding:12px;text-align:right;font-size:14px;font-weight:600">' + U.formatINR(Math.round(base)) + '</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +
        '<div style="display:flex;justify-content:flex-end">' +
          '<div style="width:260px">' +
            '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px"><span>Subtotal</span><span>' + U.formatINR(Math.round(base)) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#6B7280"><span>GST (12%)</span><span>' + U.formatINR(tax) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;padding:10px 0;font-size:16px;font-weight:700;border-top:2px solid #C9A85C;margin-top:6px;color:#0B5560"><span>Grand Total</span><span>' + U.formatINR(p.amount) + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:32px;padding-top:16px;border-top:1px solid #E5E7EB;text-align:center;font-size:12px;color:#6B7280">' +
          'Thank you for staying with us. We look forward to welcoming you again.' +
        '</div>' +
      '</div>';

    U.openModal(invoiceBackdrop);
  }

  document.getElementById('invoice-modal-close').addEventListener('click',  function () { U.closeModal(invoiceBackdrop); });
  document.getElementById('invoice-modal-cancel').addEventListener('click', function () { U.closeModal(invoiceBackdrop); });
  document.getElementById('btn-print-invoice').addEventListener('click', function () { window.print(); });

  // --------------------------------------------------------------------------
  // Filters
  // --------------------------------------------------------------------------
  var dSearch = U.debounce(function (v) { state.search = v; state.page = 1; render(); }, 300);
  document.getElementById('pay-search').addEventListener('input', function () { dSearch(this.value); });
  document.getElementById('filter-pay-status').addEventListener('change', function () { state.filterStatus = this.value; state.page = 1; render(); });
  document.getElementById('filter-pay-method').addEventListener('change', function () { state.filterMethod = this.value; state.page = 1; render(); });
  document.getElementById('filter-pay-from').addEventListener('change',   function () { state.dateFrom = this.value; state.page = 1; render(); });
  document.getElementById('filter-pay-to').addEventListener('change',     function () { state.dateTo = this.value; state.page = 1; render(); });

  renderKPIs();
  render();

}());
