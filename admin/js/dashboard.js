/* ==========================================================================
   dashboard.js — Dashboard page logic
   Computes KPIs from mock data, renders charts and recent bookings.
   ========================================================================== */

(function () {
  'use strict';

  var D = window.HRMS.data;
  var U = window.HRMS.utils;
  var C = window.HRMS.charts;
  var L = window.HRMS.layout;

  // Inject layout chrome (sidebar + topbar)
  L.inject({ title: 'Dashboard', breadcrumb: [] });

  // --------------------------------------------------------------------------
  // Greeting + date
  // --------------------------------------------------------------------------
  var greetEl = document.getElementById('greeting-heading');
  var dateEl  = document.getElementById('today-date');
  if (greetEl) greetEl.textContent = U.greeting() + ', Admin 👋';
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  // --------------------------------------------------------------------------
  // Compute KPIs from data
  // --------------------------------------------------------------------------
  var todayStr = U.todayISO();

  var rooms    = D.getAll('rooms');
  var bookings = D.getAll('bookings');
  var payments = D.getAll('payments');

  var totalRooms     = rooms.length;
  var occupiedRooms  = rooms.filter(function (r) { return r.status === 'occupied'; }).length;
  var availableRooms = rooms.filter(function (r) { return r.status === 'available'; }).length;

  var todayCheckIns  = bookings.filter(function (b) { return b.checkIn === todayStr && (b.status === 'confirmed' || b.status === 'checked-in'); }).length;
  var todayCheckOuts = bookings.filter(function (b) { return b.checkOut === todayStr && (b.status === 'checked-in' || b.status === 'checked-out'); }).length;

  // Revenue this month from paid payments
  var now = new Date();
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  var revenueThisMonth = payments
    .filter(function (p) { return p.status === 'paid' && p.date >= monthStart; })
    .reduce(function (s, p) { return s + p.amount; }, 0);

  // --------------------------------------------------------------------------
  // Render KPI cards
  // --------------------------------------------------------------------------
  var KPI_DATA = [
    {
      label: 'Total Rooms',
      value: totalRooms,
      icon: 'bed',
      iconBg: 'background:var(--primary-soft);color:var(--primary)',
      trend: { dir: 'up', text: 'All categories' }
    },
    {
      label: 'Occupied Rooms',
      value: occupiedRooms,
      icon: 'users',
      iconBg: 'background:var(--danger-bg);color:var(--danger-text)',
      trend: { dir: occupiedRooms > totalRooms * 0.5 ? 'up' : 'down', text: Math.round(occupiedRooms / totalRooms * 100) + '% occupancy' }
    },
    {
      label: 'Available Rooms',
      value: availableRooms,
      icon: 'check',
      iconBg: 'background:var(--success-bg);color:var(--success-text)',
      trend: { dir: 'up', text: 'Ready for check-in' }
    },
    {
      label: "Today's Check-ins",
      value: todayCheckIns,
      icon: 'arrow-down',
      iconBg: 'background:var(--info-bg);color:var(--info-text)',
      trend: { dir: 'up', text: 'Expected today' }
    },
    {
      label: "Today's Check-outs",
      value: todayCheckOuts,
      icon: 'arrow-up',
      iconBg: 'background:var(--warning-bg);color:var(--warning-text)',
      trend: { dir: 'up', text: 'Departing today' }
    },
    {
      label: 'Revenue This Month',
      value: U.formatINR(revenueThisMonth),
      isFormatted: true,
      icon: 'credit-card',
      iconBg: 'background:var(--gold-soft);color:var(--gold)',
      trend: { dir: 'up', text: 'Paid payments only' }
    }
  ];

  var kpiGrid = document.getElementById('kpi-grid');
  if (kpiGrid) {
    // Brief skeleton delay for visual polish
    setTimeout(function () {
      kpiGrid.innerHTML = KPI_DATA.map(function (k) {
        var trendClass = k.trend.dir === 'up' ? 'up' : 'down';
        var trendIcon  = k.trend.dir === 'up'
          ? '<svg width="12" height="12"><use href="#icon-trending-up"/></svg>'
          : '<svg width="12" height="12"><use href="#icon-trending-down"/></svg>';
        return '<article class="kpi-card">' +
          '<div class="flex items-center justify-between gap-4">' +
            '<div class="kpi-icon" style="' + k.iconBg + '">' +
              '<svg width="22" height="22"><use href="#icon-' + k.icon + '"/></svg>' +
            '</div>' +
            '<span class="kpi-trend ' + trendClass + '">' + trendIcon + k.trend.text + '</span>' +
          '</div>' +
          '<div class="kpi-number">' + (k.isFormatted ? k.value : k.value) + '</div>' +
          '<div class="kpi-label">' + k.label + '</div>' +
        '</article>';
      }).join('');
    }, 400);
  }

  // --------------------------------------------------------------------------
  // Revenue chart — last 6 months from paid payments
  // --------------------------------------------------------------------------
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function getRevenueByMonth() {
    var result = [];
    for (var i = 5; i >= 0; i--) {
      var d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      var y = d.getFullYear(), m = d.getMonth();
      var prefix = y + '-' + String(m + 1).padStart(2, '0');
      var total = payments
        .filter(function (p) { return p.status === 'paid' && p.date && p.date.slice(0, 7) === prefix; })
        .reduce(function (s, p) { return s + p.amount; }, 0);
      result.push({ label: MONTHS[m], value: total });
    }
    return result;
  }

  var revenueData = getRevenueByMonth();
  var totalRevenue = revenueData.reduce(function (s, d) { return s + d.value; }, 0);

  var revLabel = document.getElementById('revenue-total-label');
  if (revLabel) revLabel.textContent = U.formatINR(totalRevenue) + ' total';

  setTimeout(function () {
    var chartEl = document.getElementById('revenue-chart');
    if (chartEl) {
      C.lineAreaChart(chartEl, revenueData, {
        formatY: function (v) { return '₹' + (v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v); },
        formatTooltip: function (v) { return U.formatINR(v); },
        title: 'Monthly Revenue'
      });
    }
  }, 500);

  // --------------------------------------------------------------------------
  // Donut chart — room type distribution
  // --------------------------------------------------------------------------
  var TYPE_COLORS = {
    'Standard':     '#0B5560',
    'Deluxe':       '#C9A85C',
    'Ocean Suite':  '#1a7a8a',
    'Garden Suite': '#3BA89E',
    'Villa':        '#E6A817'
  };

  var typeCount = {};
  rooms.forEach(function (r) {
    typeCount[r.type] = (typeCount[r.type] || 0) + 1;
  });

  var donutSegs = Object.keys(typeCount).map(function (t) {
    return { label: t, value: typeCount[t], color: TYPE_COLORS[t] || '#6B7280' };
  });

  setTimeout(function () {
    var donutEl = document.getElementById('donut-chart');
    var legendEl = document.getElementById('donut-legend');
    if (donutEl) {
      C.donutChart(donutEl, donutSegs, {
        size: 180,
        strokeWidth: 32,
        centerLabel: totalRooms,
        centerSub: 'Total Rooms',
        title: 'Room type distribution'
      });
    }
    if (legendEl) {
      legendEl.innerHTML = donutSegs.map(function (s) {
        return '<div class="flex items-center justify-between gap-2" style="padding:4px 0;border-bottom:1px solid var(--border)">' +
          '<div class="flex items-center gap-2">' +
            '<span style="width:10px;height:10px;border-radius:50%;background:' + s.color + ';display:inline-block;flex-shrink:0"></span>' +
            '<span style="font-size:.875rem">' + s.label + '</span>' +
          '</div>' +
          '<span style="font-size:.875rem;font-weight:600">' + s.value + ' rooms</span>' +
        '</div>';
      }).join('');
    }
  }, 500);

  // --------------------------------------------------------------------------
  // Room status grid
  // --------------------------------------------------------------------------
  var statusGrid = document.getElementById('room-status-grid');
  var statusLegend = document.getElementById('room-status-legend');
  if (statusGrid) {
    statusGrid.innerHTML = rooms.map(function (r) {
      return '<div class="room-cell ' + r.status + '" title="Room ' + r.number + ' — ' + r.status + '" aria-label="Room ' + r.number + ': ' + r.status + '">' +
        r.number +
      '</div>';
    }).join('');
  }
  if (statusLegend) {
    var legends = [
      { status: 'available',   label: 'Available' },
      { status: 'occupied',    label: 'Occupied' },
      { status: 'cleaning',    label: 'Cleaning' },
      { status: 'maintenance', label: 'Maintenance' }
    ];
    statusLegend.innerHTML = legends.map(function (l) {
      return '<span class="badge badge-' + ({ available: 'success', occupied: 'danger', cleaning: 'warning', maintenance: 'info' }[l.status]) + '">' + l.label + '</span>';
    }).join('');
  }

  // --------------------------------------------------------------------------
  // Recent Bookings (last 5 by check-in date)
  // --------------------------------------------------------------------------
  var guests = D.getAll('guests');

  function guestName(gid) {
    var g = guests.find(function (x) { return x._id === gid; });
    return g ? g.name : '—';
  }
  function roomNumber(rid) {
    var r = rooms.find(function (x) { return x._id === rid; });
    return r ? r.number : '—';
  }

  var recentBookings = bookings.slice().sort(function (a, b) {
    return b.checkIn.localeCompare(a.checkIn);
  }).slice(0, 5);

  var tbody = document.getElementById('recent-bookings-body');
  if (tbody) {
    tbody.innerHTML = recentBookings.map(function (b) {
      return '<tr>' +
        '<td><span class="font-semibold text-primary">' + b._id + '</span></td>' +
        '<td>' + U.escapeHtml(guestName(b.guestId)) + '</td>' +
        '<td>Room ' + U.escapeHtml(roomNumber(b.roomId)) + '</td>' +
        '<td>' + U.formatDate(b.checkIn) + '</td>' +
        '<td>' + U.formatDate(b.checkOut) + '</td>' +
        '<td class="font-semibold">' + U.formatINR(b.totalAmount) + '</td>' +
        '<td>' + U.statusBadge(b.status) + '</td>' +
      '</tr>';
    }).join('');
  }

  // --------------------------------------------------------------------------
  // Reset demo data button
  // --------------------------------------------------------------------------
  var btnReset = document.getElementById('btn-reset-data');
  if (btnReset) {
    btnReset.addEventListener('click', function () {
      U.confirmDialog({
        title: 'Reset Demo Data?',
        message: 'This will restore all data to the original seed values.',
        confirmText: 'Yes, Reset',
        cancelText: 'Cancel'
      }).then(function (confirmed) {
        if (confirmed) {
          D.resetToSeed();
          U.toast('success', 'Data Reset', 'Demo data restored to defaults.');
          setTimeout(function () { location.reload(); }, 800);
        }
      });
    });
  }

}());
