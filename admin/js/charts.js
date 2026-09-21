/* ==========================================================================
   charts.js — Hand-written SVG charts (no libraries)
   Exports: HRMS.charts.lineAreaChart(container, data, options)
            HRMS.charts.donutChart(container, segments, options)
   ========================================================================== */

(function () {
  'use strict';

  var u = window.HRMS.utils;

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  function svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  function lerp(min, max, t) { return min + (max - min) * t; }

  // --------------------------------------------------------------------------
  // 1. Line / Area Chart
  //    data: [{ label: 'Jan', value: 120000 }, ...]
  //    options: { color, fillColor, width, height, formatY, title }
  // --------------------------------------------------------------------------
  function lineAreaChart(container, data, options) {
    options = options || {};
    var W = options.width  || container.clientWidth  || 560;
    var H = options.height || 260;
    var PAD_L = 72, PAD_R = 20, PAD_T = 20, PAD_B = 50;
    var chartW = W - PAD_L - PAD_R;
    var chartH = H - PAD_T - PAD_B;
    var color     = options.color     || '#0B5560';
    var fillColor = options.fillColor || 'rgba(11,85,96,.10)';
    var formatY   = options.formatY   || function (v) { return v; };

    var values = data.map(function (d) { return d.value; });
    var minV = Math.min.apply(null, values) * 0.9;
    var maxV = Math.max.apply(null, values) * 1.05;
    if (maxV === minV) { minV = 0; maxV = maxV || 100; }

    function xOf(i) { return PAD_L + (i / (data.length - 1)) * chartW; }
    function yOf(v) { return PAD_T + chartH - ((v - minV) / (maxV - minV)) * chartH; }

    // Build SVG
    var svg = svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      width: '100%',
      height: H,
      role: 'img',
      'aria-label': (options.title || 'Line chart')
    });

    // Y-axis grid lines + labels
    var yTicks = 5;
    for (var t = 0; t <= yTicks; t++) {
      var tv = lerp(minV, maxV, t / yTicks);
      var ty = yOf(tv);
      // Grid line
      var gl = svgEl('line', { x1: PAD_L, y1: ty, x2: W - PAD_R, y2: ty, stroke: '#E5E7EB', 'stroke-width': '1', 'stroke-dasharray': '4 3' });
      svg.appendChild(gl);
      // Y label
      var yl = svgEl('text', { x: PAD_L - 6, y: ty + 4, 'text-anchor': 'end', 'font-size': '11', fill: '#6B7280', 'font-family': 'Inter,system-ui,sans-serif' });
      yl.textContent = formatY(Math.round(tv));
      svg.appendChild(yl);
    }

    // X-axis labels
    data.forEach(function (d, i) {
      var xl = svgEl('text', { x: xOf(i), y: H - PAD_B + 18, 'text-anchor': 'middle', 'font-size': '11', fill: '#6B7280', 'font-family': 'Inter,system-ui,sans-serif' });
      xl.textContent = d.label;
      svg.appendChild(xl);
    });

    // Area fill path
    var areaD = 'M ' + xOf(0) + ',' + yOf(values[0]);
    values.forEach(function (v, i) { if (i > 0) areaD += ' L ' + xOf(i) + ',' + yOf(v); });
    areaD += ' L ' + xOf(data.length - 1) + ',' + (PAD_T + chartH);
    areaD += ' L ' + xOf(0) + ',' + (PAD_T + chartH) + ' Z';
    var area = svgEl('path', { d: areaD, fill: fillColor, stroke: 'none' });
    svg.appendChild(area);

    // Line path
    var lineD = 'M ' + xOf(0) + ',' + yOf(values[0]);
    values.forEach(function (v, i) { if (i > 0) lineD += ' L ' + xOf(i) + ',' + yOf(v); });
    var line = svgEl('path', { d: lineD, fill: 'none', stroke: color, 'stroke-width': '2.5', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    svg.appendChild(line);

    // Data points + invisible hover targets + tooltip group
    var tooltip = svgEl('g', { style: 'pointer-events:none;', opacity: '0' });
    var tRect = svgEl('rect', { rx: '6', ry: '6', fill: '#1A1A1A', x: '0', y: '0', width: '110', height: '36' });
    var tText = svgEl('text', { 'font-size': '12', fill: '#fff', 'font-family': 'Inter,system-ui,sans-serif', 'font-weight': '600' });
    var tSub  = svgEl('text', { 'font-size': '10', fill: 'rgba(255,255,255,.7)', 'font-family': 'Inter,system-ui,sans-serif' });
    var tLine = svgEl('line', { stroke: color, 'stroke-width': '1.5', 'stroke-dasharray': '4 3', y1: PAD_T, y2: PAD_T + chartH });
    tooltip.appendChild(tLine);
    tooltip.appendChild(tRect);
    tooltip.appendChild(tText);
    tooltip.appendChild(tSub);
    svg.appendChild(tooltip);

    values.forEach(function (v, i) {
      var cx = xOf(i), cy = yOf(v);
      // Dot
      var dot = svgEl('circle', { cx: cx, cy: cy, r: '5', fill: '#fff', stroke: color, 'stroke-width': '2.5' });
      svg.appendChild(dot);
      // Hover hit area
      var hit = svgEl('rect', { x: cx - 20, y: PAD_T, width: '40', height: chartH + 16, fill: 'transparent', style: 'cursor:crosshair' });
      svg.appendChild(hit);

      hit.addEventListener('mouseenter', function () {
        var tw = 120;
        var tx = Math.min(cx - tw / 2, W - PAD_R - tw);
        tx = Math.max(PAD_L, tx);
        tRect.setAttribute('x', tx); tRect.setAttribute('y', PAD_T - 40);
        tRect.setAttribute('width', tw);
        tText.setAttribute('x', tx + 8); tText.setAttribute('y', PAD_T - 22);
        tText.textContent = options.formatTooltip ? options.formatTooltip(v) : formatY(v);
        tSub.setAttribute('x', tx + 8); tSub.setAttribute('y', PAD_T - 10);
        tSub.textContent = data[i].label;
        tLine.setAttribute('x1', cx); tLine.setAttribute('x2', cx);
        tooltip.setAttribute('opacity', '1');
      });
      hit.addEventListener('mouseleave', function () {
        tooltip.setAttribute('opacity', '0');
      });
    });

    container.innerHTML = '';
    container.appendChild(svg);
  }

  // --------------------------------------------------------------------------
  // 2. Donut Chart
  //    segments: [{ label, value, color }, ...]
  //    options: { size, strokeWidth, title, formatCenter }
  // --------------------------------------------------------------------------
  function donutChart(container, segments, options) {
    options = options || {};
    var SIZE  = options.size || 200;
    var SW    = options.strokeWidth || 36;
    var R     = (SIZE / 2) - SW / 2 - 2;
    var CX    = SIZE / 2, CY = SIZE / 2;
    var CIRC  = 2 * Math.PI * R;
    var total = segments.reduce(function (s, g) { return s + g.value; }, 0);
    if (!total) total = 1;

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + SIZE + ' ' + SIZE,
      width: SIZE, height: SIZE,
      role: 'img',
      'aria-label': (options.title || 'Donut chart')
    });

    // Background ring
    var bg = svgEl('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: '#E5E7EB', 'stroke-width': SW });
    svg.appendChild(bg);

    // Segments
    var offset = 0;
    var tooltip = document.createElement('div');
    tooltip.style.cssText = 'position:fixed;background:#1A1A1A;color:#fff;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:600;pointer-events:none;opacity:0;transition:opacity .15s;z-index:999;font-family:Inter,sans-serif';
    document.body.appendChild(tooltip);

    segments.forEach(function (seg) {
      var frac = seg.value / total;
      var dash = frac * CIRC;
      var gap  = CIRC - dash;
      var rotation = (offset / total) * 360 - 90;
      var path = svgEl('circle', {
        cx: CX, cy: CY, r: R,
        fill: 'none',
        stroke: seg.color,
        'stroke-width': SW,
        'stroke-dasharray': dash + ' ' + gap,
        transform: 'rotate(' + rotation + ' ' + CX + ' ' + CY + ')',
        style: 'transition:stroke-width .15s,opacity .15s;cursor:pointer'
      });

      path.addEventListener('mouseenter', function (e) {
        path.setAttribute('stroke-width', SW + 6);
        tooltip.style.opacity = '1';
        tooltip.innerHTML = '<span style="color:' + seg.color + '">●</span> ' + seg.label + ': ' + seg.value +
          ' <span style="color:rgba(255,255,255,.6);font-weight:400">(' + Math.round(frac * 100) + '%)</span>';
      });
      path.addEventListener('mousemove', function (e) {
        tooltip.style.left = (e.clientX + 12) + 'px';
        tooltip.style.top  = (e.clientY - 32) + 'px';
      });
      path.addEventListener('mouseleave', function () {
        path.setAttribute('stroke-width', SW);
        tooltip.style.opacity = '0';
      });

      svg.appendChild(path);
      offset += seg.value;
    });

    // Center text
    if (options.centerLabel) {
      var ct = svgEl('text', { x: CX, y: CY - 6, 'text-anchor': 'middle', 'font-size': '22', 'font-weight': '700', fill: '#1A1A1A', 'font-family': 'Playfair Display,Georgia,serif' });
      ct.textContent = options.centerLabel;
      svg.appendChild(ct);
    }
    if (options.centerSub) {
      var cs = svgEl('text', { x: CX, y: CY + 14, 'text-anchor': 'middle', 'font-size': '11', fill: '#6B7280', 'font-family': 'Inter,system-ui,sans-serif' });
      cs.textContent = options.centerSub;
      svg.appendChild(cs);
    }

    container.innerHTML = '';
    container.appendChild(svg);

    return function cleanup() { tooltip.remove(); };
  }

  // Expose
  window.HRMS = window.HRMS || {};
  window.HRMS.charts = { lineAreaChart: lineAreaChart, donutChart: donutChart };

}());
