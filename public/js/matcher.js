var Matcher = (function () {

  function distance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function buildCostMatrix(orders, couriers) {
    var n = orders.length;
    var m = couriers.length;
    var size = Math.max(n, m);
    var INF = 1e9;
    var cost = [];

    for (var i = 0; i < size; i++) {
      cost[i] = [];
      for (var j = 0; j < size; j++) {
        if (i < n && j < m) {
          var dist = distance(orders[i].pos, couriers[j].pos);
          var amount = orders[i].amount;
          var score = dist * 0.6 - amount * 2.5;
          cost[i][j] = score;
        } else {
          cost[i][j] = INF;
        }
      }
    }
    return cost;
  }

  function hungarian(cost) {
    var n = cost.length;
    var m = cost[0].length;
    var INF = 1e9;

    var u = new Array(n + 1).fill(0);
    var v = new Array(m + 1).fill(0);
    var p = new Array(m + 1).fill(0);
    var way = new Array(m + 1).fill(0);

    for (var i = 1; i <= n; i++) {
      p[0] = i;
      var j0 = 0;
      var minv = new Array(m + 1).fill(INF);
      var used = new Array(m + 1).fill(false);

      do {
        used[j0] = true;
        var i0 = p[j0];
        var delta = INF;
        var j1 = 0;

        for (var j = 1; j <= m; j++) {
          if (!used[j]) {
            var cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
            if (cur < minv[j]) {
              minv[j] = cur;
              way[j] = j0;
            }
            if (minv[j] < delta) {
              delta = minv[j];
              j1 = j;
            }
          }
        }

        for (var jj = 0; jj <= m; jj++) {
          if (used[jj]) {
            u[p[jj]] += delta;
            v[jj] -= delta;
          } else {
            minv[jj] -= delta;
          }
        }
        j0 = j1;
      } while (p[j0] !== 0);

      do {
        var j1 = way[j0];
        p[j0] = p[j1];
        j0 = j1;
      } while (j0 !== 0);
    }

    var assignment = new Array(n).fill(-1);
    for (var j = 1; j <= m; j++) {
      if (p[j] > 0 && p[j] <= n && j - 1 < m) {
        assignment[p[j] - 1] = j - 1;
      }
    }
    return assignment;
  }

  function match(orders, couriers) {
    var t0 = performance.now();
    if (!orders.length || !couriers.length) {
      return { pairs: [], timeMs: 0 };
    }
    var cost = buildCostMatrix(orders, couriers);
    var assignment = hungarian(cost);

    var pairs = [];
    for (var i = 0; i < assignment.length; i++) {
      if (assignment[i] >= 0 && i < orders.length && assignment[i] < couriers.length) {
        var o = orders[i];
        var c = couriers[assignment[i]];
        var dist = distance(o.pos, c.pos);
        var score = dist * 0.6 - o.amount * 2.5;
        pairs.push({
          orderId: o.id,
          courierId: c.id,
          orderIdx: i,
          courierIdx: assignment[i],
          distance: Math.round(dist),
          amount: o.amount,
          score: score
        });
      }
    }
    var t1 = performance.now();
    return { pairs: pairs, timeMs: Math.round(t1 - t0) };
  }

  return { match: match, distance: distance };
})();
