var Heatmap = (function () {

  function distance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function detectHotZones(orders, couriers, mapSize) {
    var cols = 5;
    var rows = 4;
    var cellW = mapSize.width / cols;
    var cellH = mapSize.height / rows;

    var zones = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var zone = {
          id: 'Z-' + r + '-' + c,
          col: c,
          row: r,
          x: c * cellW,
          y: r * cellH,
          w: cellW,
          h: cellH,
          cx: c * cellW + cellW / 2,
          cy: r * cellH + cellH / 2,
          orderCount: 0,
          courierCount: 0,
          deficit: 0,
          level: 0
        };
        zones.push(zone);
      }
    }

    for (var oi = 0; oi < orders.length; oi++) {
      var o = orders[oi];
      var col = Math.floor(o.pos.x / cellW);
      var row = Math.floor(o.pos.y / cellH);
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        zones[row * cols + col].orderCount++;
      }
    }

    for (var ci = 0; ci < couriers.length; ci++) {
      var c2 = couriers[ci];
      var col2 = Math.floor(c2.pos.x / cellW);
      var row2 = Math.floor(c2.pos.y / cellH);
      if (col2 >= 0 && col2 < cols && row2 >= 0 && row2 < rows) {
        zones[row2 * cols + col2].courierCount++;
      }
    }

    for (var zi = 0; zi < zones.length; zi++) {
      var z = zones[zi];
      var ratio = z.orderCount / Math.max(1, z.courierCount);
      z.deficit = Math.max(0, z.orderCount - z.courierCount * 2);
      if (z.deficit > 0 && ratio > 1.5) {
        z.level = Math.min(3, Math.floor(z.deficit / 2) + 1);
      } else if (z.orderCount > z.courierCount * 1.5 && z.orderCount >= 3) {
        z.level = 1;
      }
    }

    var hotZones = zones.filter(function (z) { return z.level > 0; });
    hotZones.sort(function (a, b) { return b.level - a.level; });

    return { zones: zones, hotZones: hotZones, cellSize: { w: cellW, h: cellH } };
  }

  function computeSurge(zones) {
    var result = [];
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      var surge = 0;
      if (z.level === 1) surge = 1.2;
      else if (z.level === 2) surge = 1.5;
      else if (z.level >= 3) surge = 2.0;

      if (surge > 0) {
        result.push({
          id: z.id,
          name: '区域[' + z.row + ',' + z.col + ']',
          cx: z.cx,
          cy: z.cy,
          w: z.w,
          h: z.h,
          x: z.x,
          y: z.y,
          level: z.level,
          deficit: z.deficit,
          orders: z.orderCount,
          couriers: z.courierCount,
          surge: surge
        });
      }
    }
    return result;
  }

  return { detectHotZones: detectHotZones, computeSurge: computeSurge };
})();
