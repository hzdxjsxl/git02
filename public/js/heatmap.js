var Heatmap = (function () {

  var EMA_ALPHA = 0.35;
  var BANDWIDTH = 120;
  var GRID_COLS = 10;
  var GRID_ROWS = 7;

  var smoothedField = null;
  var smoothedZones = {};

  function distance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function gaussianKernel(dist, bw) {
    var u = dist / bw;
    return Math.exp(-0.5 * u * u);
  }

  function computeDensityField(orders, couriers, mapSize) {
    var cellW = mapSize.width / GRID_COLS;
    var cellH = mapSize.height / GRID_ROWS;
    var field = [];

    for (var r = 0; r < GRID_ROWS; r++) {
      for (var c = 0; c < GRID_COLS; c++) {
        var cx = c * cellW + cellW / 2;
        var cy = r * cellH + cellH / 2;

        var orderDensity = 0;
        for (var oi = 0; oi < orders.length; oi++) {
          var d = distance({ x: cx, y: cy }, orders[oi].pos);
          orderDensity += gaussianKernel(d, BANDWIDTH);
        }

        var courierDensity = 0;
        for (var ci = 0; ci < couriers.length; ci++) {
          var d2 = distance({ x: cx, y: cy }, couriers[ci].pos);
          courierDensity += gaussianKernel(d2, BANDWIDTH);
        }

        var deficit = orderDensity - courierDensity * 2;
        field.push({
          col: c, row: r,
          cx: cx, cy: cy,
          x: c * cellW, y: r * cellH,
          w: cellW, h: cellH,
          orderDensity: orderDensity,
          courierDensity: courierDensity,
          deficit: deficit
        });
      }
    }
    return field;
  }

  function smoothField(field) {
    if (!smoothedField || smoothedField.length !== field.length) {
      smoothedField = field.map(function (f) {
        return {
          col: f.col, row: f.row,
          cx: f.cx, cy: f.cy,
          x: f.x, y: f.y, w: f.w, h: f.h,
          orderDensity: f.orderDensity,
          courierDensity: f.courierDensity,
          deficit: f.deficit
        };
      });
    } else {
      for (var i = 0; i < field.length; i++) {
        smoothedField[i].orderDensity = EMA_ALPHA * field[i].orderDensity + (1 - EMA_ALPHA) * smoothedField[i].orderDensity;
        smoothedField[i].courierDensity = EMA_ALPHA * field[i].courierDensity + (1 - EMA_ALPHA) * smoothedField[i].courierDensity;
        smoothedField[i].deficit = EMA_ALPHA * field[i].deficit + (1 - EMA_ALPHA) * smoothedField[i].deficit;
      }
    }
    return smoothedField;
  }

  function clusterHotZones(smoothed) {
    var threshold = 0.8;
    var zones = [];
    var visited = {};

    function key(r, c) { return r + '_' + c; }
    function getCell(r, c) {
      for (var i = 0; i < smoothed.length; i++) {
        if (smoothed[i].row === r && smoothed[i].col === c) return smoothed[i];
      }
      return null;
    }

    for (var r = 0; r < GRID_ROWS; r++) {
      for (var c = 0; c < GRID_COLS; c++) {
        var cell = getCell(r, c);
        if (!cell || visited[key(r, c)] || cell.deficit < threshold) continue;

        var cluster = [];
        var stack = [{ r: r, c: c }];
        while (stack.length > 0) {
          var cur = stack.pop();
          var k = key(cur.r, cur.c);
          if (visited[k]) continue;
          var cc = getCell(cur.r, cur.c);
          if (!cc || cc.deficit < threshold * 0.6) continue;
          visited[k] = true;
          cluster.push(cc);

          var neighbors = [
            { r: cur.r - 1, c: cur.c },
            { r: cur.r + 1, c: cur.c },
            { r: cur.r, c: cur.c - 1 },
            { r: cur.r, c: cur.c + 1 }
          ];
          for (var ni = 0; ni < neighbors.length; ni++) {
            var nb = neighbors[ni];
            if (nb.r >= 0 && nb.r < GRID_ROWS && nb.c >= 0 && nb.c < GRID_COLS) {
              if (!visited[key(nb.r, nb.c)]) {
                var ncell = getCell(nb.r, nb.c);
                if (ncell && ncell.deficit >= threshold * 0.4) {
                  stack.push(nb);
                }
              }
            }
          }
        }

        if (cluster.length > 0) {
          var totalDeficit = 0;
          var totalOrderDensity = 0;
          var totalCourierDensity = 0;
          var weightSum = 0;
          var wcx = 0, wcy = 0;

          for (var ci = 0; ci < cluster.length; ci++) {
            var cl = cluster[ci];
            var w = Math.max(0.01, cl.deficit);
            totalDeficit += cl.deficit;
            totalOrderDensity += cl.orderDensity;
            totalCourierDensity += cl.courierDensity;
            wcx += cl.cx * w;
            wcy += cl.cy * w;
            weightSum += w;
          }

          var cx = weightSum > 0 ? wcx / weightSum : cluster[0].cx;
          var cy = weightSum > 0 ? wcy / weightSum : cluster[0].cy;

          var spread = 0;
          for (var cj = 0; cj < cluster.length; cj++) {
            var d = distance({ x: cx, y: cy }, { x: cluster[cj].cx, y: cluster[cj].cy });
            spread = Math.max(spread, d);
          }
          spread = Math.max(spread, cluster[0].w * 0.7);

          var level = 0;
          if (totalDeficit > 5) level = 3;
          else if (totalDeficit > 3) level = 2;
          else if (totalDeficit > 1.5) level = 1;

          if (level > 0) {
            zones.push({
              id: 'HZ-' + zones.length,
              cx: cx, cy: cy,
              radius: spread + 30,
              level: level,
              deficit: totalDeficit,
              orderDensity: totalOrderDensity,
              courierDensity: totalCourierDensity,
              cellCount: cluster.length
            });
          }
        }
      }
    }

    zones.sort(function (a, b) { return b.deficit - a.deficit; });
    return zones;
  }

  function computeSurge(zones) {
    var result = [];
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      var surge = 0;
      if (z.level === 1) surge = 1.2;
      else if (z.level === 2) surge = 1.5;
      else if (z.level >= 3) surge = 2.0;

      result.push({
        id: z.id,
        name: '热区#' + (i + 1),
        cx: z.cx,
        cy: z.cy,
        radius: z.radius,
        level: z.level,
        deficit: Math.round(z.deficit * 10) / 10,
        orders: Math.round(z.orderDensity * 10) / 10,
        couriers: Math.round(z.courierDensity * 10) / 10,
        surge: surge
      });
    }
    return result;
  }

  function detectHotZones(orders, couriers, mapSize) {
    var rawField = computeDensityField(orders, couriers, mapSize);
    var smoothed = smoothField(rawField);
    var zones = clusterHotZones(smoothed);
    return { zones: zones, field: smoothed };
  }

  function reset() {
    smoothedField = null;
    smoothedZones = {};
  }

  return { detectHotZones: detectHotZones, computeSurge: computeSurge, reset: reset };
})();
