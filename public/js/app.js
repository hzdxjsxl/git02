(function () {
  var state = {
    orders: [],
    couriers: [],
    matches: [],
    hotZones: [],
    mapSize: { width: 1000, height: 700 },
    ws: null,
    connected: false
  };

  var els = {
    canvas: document.getElementById('mapCanvas'),
    connStatus: document.getElementById('connStatus'),
    connText: document.getElementById('connText'),
    orderCount: document.getElementById('orderCount'),
    courierCount: document.getElementById('courierCount'),
    matchTime: document.getElementById('matchTime'),
    matchList: document.getElementById('matchList'),
    hotList: document.getElementById('hotList')
  };

  function setConnected(on) {
    state.connected = on;
    els.connStatus.className = 'dot ' + (on ? 'online' : 'offline');
    els.connText.textContent = on ? '已连接' : '连接中...';
  }

  function connect() {
    var proto = location.protocol === 'https:' ? 'wss' : 'ws';
    var url = proto + '://' + location.host + '/ws';
    state.ws = new WebSocket(url);

    state.ws.onopen = function () { setConnected(true); };
    state.ws.onclose = function () {
      setConnected(false);
      setTimeout(connect, 2000);
    };
    state.ws.onerror = function () { state.ws.close(); };
    state.ws.onmessage = function (ev) {
      try {
        var data = JSON.parse(ev.data);
        handleMessage(data);
      } catch (e) {
        console.error('解析消息失败', e);
      }
    };
  }

  function handleMessage(data) {
    if (data.type === 'init') {
      state.mapSize = data.map;
      state.couriers = data.couriers;
      state.orders = data.orders;
      Renderer.init(els.canvas, state.mapSize);
    } else if (data.type === 'update') {
      state.couriers = data.couriers;
      if (data.removed && data.removed.length) {
        state.orders = state.orders.filter(function (o) {
          return data.removed.indexOf(o.id) === -1;
        });
      }
      var existingIds = {};
      for (var i = 0; i < state.orders.length; i++) {
        existingIds[state.orders[i].id] = true;
      }
      for (var j = 0; j < data.orders.length; j++) {
        if (!existingIds[data.orders[j].id]) {
          state.orders.push(data.orders[j]);
        }
      }
    }

    runPipeline();
  }

  function runPipeline() {
    var matchResult = Matcher.match(state.orders, state.couriers);
    state.matches = matchResult.pairs;

    var hotResult = Heatmap.detectHotZones(state.orders, state.couriers, state.mapSize);
    var surgeZones = Heatmap.computeSurge(hotResult.hotZones);
    state.hotZones = surgeZones;

    els.orderCount.textContent = state.orders.length;
    els.courierCount.textContent = state.couriers.length;
    els.matchTime.textContent = matchResult.timeMs;

    Renderer.setData({
      orders: state.orders,
      couriers: state.couriers,
      matches: state.matches,
      hotZones: state.hotZones
    });
    Renderer.render();

    renderSidebar();
  }

  function renderSidebar() {
    els.matchList.innerHTML = '';
    var sorted = state.matches.slice().sort(function (a, b) {
      return a.score - b.score;
    });
    for (var i = 0; i < sorted.length; i++) {
      var p = sorted[i];
      var div = document.createElement('div');
      div.className = 'match-item';
      div.innerHTML =
        '<div class="pair">' +
        '<span class="cid">' + p.courierId + '</span>' +
        '<span class="arrow">→</span>' +
        '<span class="oid">' + p.orderId + '</span>' +
        '</div>' +
        '<span class="score">距' + p.distance + ' · ¥' + p.amount + '</span>';
      els.matchList.appendChild(div);
    }

    els.hotList.innerHTML = '';
    if (state.hotZones.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'hot-item';
      empty.innerHTML = '<span class="zone">暂无热区</span><span class="level">供需平衡</span>';
      els.hotList.appendChild(empty);
    } else {
      for (var j = 0; j < state.hotZones.length; j++) {
        var z = state.hotZones[j];
        var levelText = 'L' + z.level;
        var div2 = document.createElement('div');
        div2.className = 'hot-item';
        div2.innerHTML =
          '<div>' +
          '<span class="zone">' + z.name + '</span>' +
          ' <span class="level">' + levelText + '</span>' +
          '</div>' +
          '<span class="extra">+' + Math.round((z.surge - 1) * 100) + '%</span>';
        els.hotList.appendChild(div2);
      }
    }
  }

  function start() {
    Renderer.init(els.canvas, state.mapSize);
    connect();
  }

  window.addEventListener('load', start);
})();
