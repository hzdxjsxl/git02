var Renderer = (function () {

  var canvas, ctx;
  var mapSize = { width: 1000, height: 700 };
  var scaleX = 1, scaleY = 1;

  var LERP = 0.15;
  var FADE_SPEED = 0.12;

  var target = null;
  var display = {
    couriers: {},
    orders: {},
    matches: {},
    hotZones: {}
  };

  function init(canvasEl, size) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    mapSize = size || { width: 1000, height: 700 };
    canvas.width = mapSize.width;
    canvas.height = mapSize.height;
    scaleX = canvas.width / mapSize.width;
    scaleY = canvas.height / mapSize.height;
  }

  function setData(data) {
    target = data;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function ensureDisplay(obj, id, defaults) {
    if (!obj[id]) {
      obj[id] = {};
      for (var k in defaults) {
        if (defaults.hasOwnProperty(k)) {
          obj[id][k] = defaults[k];
        }
      }
    }
    return obj[id];
  }

  function syncDisplay() {
    if (!target) return;

    if (target.couriers) {
      var liveCourierIds = {};
      for (var i = 0; i < target.couriers.length; i++) {
        var c = target.couriers[i];
        liveCourierIds[c.id] = true;
        var dc = ensureDisplay(display.couriers, c.id, {
          x: c.pos.x, y: c.pos.y,
          tx: c.pos.x, ty: c.pos.y
        });
        dc.tx = c.pos.x;
        dc.ty = c.pos.y;
        dc.x = lerp(dc.x, dc.tx, LERP);
        dc.y = lerp(dc.y, dc.ty, LERP);
      }
      for (var cid in display.couriers) {
        if (display.couriers.hasOwnProperty(cid) && !liveCourierIds[cid]) {
          delete display.couriers[cid];
        }
      }
    }

    if (target.orders) {
      var liveOrderIds = {};
      for (var j = 0; j < target.orders.length; j++) {
        var o = target.orders[j];
        liveOrderIds[o.id] = true;
        var do_ = ensureDisplay(display.orders, o.id, {
          x: o.pos.x, y: o.pos.y,
          tx: o.pos.x, ty: o.pos.y,
          amount: o.amount
        });
        do_.tx = o.pos.x;
        do_.ty = o.pos.y;
        do_.x = lerp(do_.x, do_.tx, LERP);
        do_.y = lerp(do_.y, do_.ty, LERP);
        do_.amount = o.amount;
      }
      for (var oid in display.orders) {
        if (display.orders.hasOwnProperty(oid) && !liveOrderIds[oid]) {
          delete display.orders[oid];
        }
      }
    }

    if (target.matches) {
      var liveMatchKeys = {};
      for (var k = 0; k < target.matches.length; k++) {
        var p = target.matches[k];
        var mk = p.orderId + '_' + p.courierId;
        liveMatchKeys[mk] = true;
        var dm = ensureDisplay(display.matches, mk, {
          alpha: 0, stable: p.stable
        });
        dm.alpha = Math.min(1, dm.alpha + FADE_SPEED);
        dm.stable = p.stable;
      }
      for (var mkid in display.matches) {
        if (display.matches.hasOwnProperty(mkid) && !liveMatchKeys[mkid]) {
          display.matches[mkid].alpha -= FADE_SPEED * 2;
          if (display.matches[mkid].alpha <= 0) {
            delete display.matches[mkid];
          }
        }
      }
    }

    if (target.hotZones) {
      var liveHotIds = {};
      for (var h = 0; h < target.hotZones.length; h++) {
        var z = target.hotZones[h];
        liveHotIds[z.id] = true;
        var dh = ensureDisplay(display.hotZones, z.id, {
          cx: z.cx, cy: z.cy,
          tcx: z.cx, tcy: z.cy,
          radius: z.radius,
          tradius: z.radius,
          alpha: 0,
          level: z.level,
          surge: z.surge
        });
        dh.tcx = z.cx;
        dh.tcy = z.cy;
        dh.tradius = z.radius;
        dh.cx = lerp(dh.cx, dh.tcx, LERP);
        dh.cy = lerp(dh.cy, dh.tcy, LERP);
        dh.radius = lerp(dh.radius, dh.tradius, LERP);
        dh.alpha = Math.min(1, dh.alpha + FADE_SPEED);
        dh.level = z.level;
        dh.surge = z.surge;
      }
      for (var hid in display.hotZones) {
        if (display.hotZones.hasOwnProperty(hid) && !liveHotIds[hid]) {
          display.hotZones[hid].alpha -= FADE_SPEED;
          if (display.hotZones[hid].alpha <= 0) {
            delete display.hotZones[hid];
          }
        }
      }
    }
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(30, 58, 95, 0.35)';
    ctx.lineWidth = 1;
    var step = 50;
    for (var x = 0; x <= mapSize.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x * scaleX, 0);
      ctx.lineTo(x * scaleX, mapSize.height * scaleY);
      ctx.stroke();
    }
    for (var y = 0; y <= mapSize.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y * scaleY);
      ctx.lineTo(mapSize.width * scaleX, y * scaleY);
      ctx.stroke();
    }
  }

  function drawHotZones() {
    for (var hid in display.hotZones) {
      if (!display.hotZones.hasOwnProperty(hid)) continue;
      var z = display.hotZones[hid];
      if (z.alpha <= 0) continue;

      var x = z.cx * scaleX;
      var y = z.cy * scaleY;
      var r = z.radius * scaleX;

      var glow = ctx.createRadialGradient(x, y, 0, x, y, r);
      var baseAlpha = 0.05 + z.level * 0.1;
      glow.addColorStop(0, 'rgba(239, 83, 80, ' + (baseAlpha * z.alpha) + ')');
      glow.addColorStop(0.6, 'rgba(239, 83, 80, ' + (baseAlpha * 0.5 * z.alpha) + ')');
      glow.addColorStop(1, 'rgba(239, 83, 80, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(239, 83, 80, ' + (0.25 + z.level * 0.15) * z.alpha + ')';
      ctx.lineWidth = 1 + z.level;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
      ctx.stroke();

      if (z.level >= 2 && z.alpha > 0.5) {
        ctx.fillStyle = 'rgba(239, 83, 80, ' + (0.85 * z.alpha) + ')';
        ctx.font = 'bold 15px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('🔥 +' + Math.round((z.surge - 1) * 100) + '%', x, y + 5);
      }
    }
  }

  function drawMatches() {
    if (!target) return;

    for (var mk in display.matches) {
      if (!display.matches.hasOwnProperty(mk)) continue;
      var dm = display.matches[mk];
      if (dm.alpha <= 0) continue;

      var parts = mk.split('_');
      var orderId = parts[0];
      var courierId = parts.slice(1).join('_');

      var dc = display.couriers[courierId];
      var do_ = display.orders[orderId];
      if (!dc || !do_) continue;

      var gx = dc.x * scaleX;
      var gy = dc.y * scaleY;
      var ox = do_.x * scaleX;
      var oy = do_.y * scaleY;

      var gradient = ctx.createLinearGradient(gx, gy, ox, oy);
      gradient.addColorStop(0, 'rgba(79, 195, 247, ' + (0.8 * dm.alpha) + ')');
      gradient.addColorStop(1, 'rgba(102, 187, 106, ' + (0.8 * dm.alpha) + ')');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(ox, oy);
      ctx.stroke();

      var midX = (gx + ox) / 2;
      var midY = (gy + oy) / 2;
      var dotColor = dm.stable ? 'rgba(129, 212, 250,' : 'rgba(102, 187, 106,';
      ctx.fillStyle = dotColor + (0.9 * dm.alpha) + ')';
      ctx.beginPath();
      ctx.arc(midX, midY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCouriers() {
    for (var cid in display.couriers) {
      if (!display.couriers.hasOwnProperty(cid)) continue;
      var c = display.couriers[cid];
      var x = c.x * scaleX;
      var y = c.y * scaleY;

      var gradient = ctx.createRadialGradient(x, y, 0, x, y, 18);
      gradient.addColorStop(0, 'rgba(79, 195, 247, 0.4)');
      gradient.addColorStop(1, 'rgba(79, 195, 247, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4fc3f7';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#81d4fa';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(cid, x, y + 3);
    }
  }

  function drawOrders() {
    for (var oid in display.orders) {
      if (!display.orders.hasOwnProperty(oid)) continue;
      var o = display.orders[oid];
      var x = o.x * scaleX;
      var y = o.y * scaleY;

      var color = o.amount >= 70 ? '#ff5722' : o.amount >= 40 ? '#ff9800' : '#ffb74d';

      var gradient = ctx.createRadialGradient(x, y, 0, x, y, 16);
      gradient.addColorStop(0, color + '66');
      gradient.addColorStop(1, color + '00');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x + 9, y);
      ctx.lineTo(x, y + 10);
      ctx.lineTo(x - 9, y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#fff3e0';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText('¥' + o.amount, x, y + 3);
    }
  }

  function render() {
    if (!target) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawHotZones();
    drawMatches();
    drawOrders();
    drawCouriers();
  }

  function tick() {
    syncDisplay();
    render();
    requestAnimationFrame(tick);
  }

  function start() {
    requestAnimationFrame(tick);
  }

  return {
    init: init,
    setData: setData,
    render: render,
    start: start
  };
})();
