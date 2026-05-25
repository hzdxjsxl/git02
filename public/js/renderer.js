var Renderer = (function () {

  var canvas, ctx;
  var mapSize = { width: 1000, height: 700 };
  var scaleX = 1, scaleY = 1;
  var currentData = null;

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
    currentData = data;
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

  function drawHotZones(zones) {
    if (!zones) return;
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      var alpha = 0.08 + z.level * 0.12;
      ctx.fillStyle = 'rgba(239, 83, 80, ' + alpha + ')';
      ctx.fillRect(z.x * scaleX, z.y * scaleY, z.w * scaleX, z.h * scaleY);

      ctx.strokeStyle = 'rgba(239, 83, 80, ' + (0.3 + z.level * 0.2) + ')';
      ctx.lineWidth = 1 + z.level;
      ctx.strokeRect(z.x * scaleX, z.y * scaleY, z.w * scaleX, z.h * scaleY);

      if (z.level >= 2) {
        ctx.fillStyle = 'rgba(239, 83, 80, 0.8)';
        ctx.font = 'bold 16px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('🔥 +' + Math.round((z.surge - 1) * 100) + '%', z.cx * scaleX, (z.y + 24) * scaleY);
      }

      ctx.fillStyle = 'rgba(255, 183, 77, 0.7)';
      ctx.font = '11px Segoe UI';
      ctx.textAlign = 'left';
      ctx.fillText('订:' + z.orders + ' 骑:' + z.couriers, (z.x + 6) * scaleX, (z.y + z.h - 8) * scaleY);
    }
  }

  function drawMatches(pairs, orders, couriers) {
    if (!pairs) return;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(102, 187, 106, 0.7)';
    ctx.setLineDash([]);

    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      var order = findById(orders, p.orderId);
      var courier = findById(couriers, p.courierId);
      if (!order || !courier) continue;

      var gradient = ctx.createLinearGradient(
        courier.pos.x * scaleX, courier.pos.y * scaleY,
        order.pos.x * scaleX, order.pos.y * scaleY
      );
      gradient.addColorStop(0, 'rgba(79, 195, 247, 0.8)');
      gradient.addColorStop(1, 'rgba(102, 187, 106, 0.8)');
      ctx.strokeStyle = gradient;

      ctx.beginPath();
      ctx.moveTo(courier.pos.x * scaleX, courier.pos.y * scaleY);
      ctx.lineTo(order.pos.x * scaleX, order.pos.y * scaleY);
      ctx.stroke();

      var midX = (courier.pos.x + order.pos.x) / 2 * scaleX;
      var midY = (courier.pos.y + order.pos.y) / 2 * scaleY;
      ctx.fillStyle = 'rgba(102, 187, 106, 0.9)';
      ctx.beginPath();
      ctx.arc(midX, midY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function findById(arr, id) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].id === id) return arr[i];
    }
    return null;
  }

  function drawCouriers(couriers) {
    if (!couriers) return;
    for (var i = 0; i < couriers.length; i++) {
      var c = couriers[i];
      var x = c.pos.x * scaleX;
      var y = c.pos.y * scaleY;

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
      ctx.fillText(c.id, x, y + 3);
    }
  }

  function drawOrders(orders) {
    if (!orders) return;
    for (var i = 0; i < orders.length; i++) {
      var o = orders[i];
      var x = o.pos.x * scaleX;
      var y = o.pos.y * scaleY;

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

  function drawLabels(orders, couriers) {
    ctx.font = '10px Segoe UI';
    ctx.textAlign = 'center';
  }

  function render() {
    if (!currentData) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawHotZones(currentData.hotZones);
    drawMatches(currentData.matches, currentData.orders, currentData.couriers);
    drawOrders(currentData.orders);
    drawCouriers(currentData.couriers);
  }

  return {
    init: init,
    setData: setData,
    render: render
  };
})();
