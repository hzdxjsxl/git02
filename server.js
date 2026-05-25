const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 700;
const NUM_COURIERS = 12;
const NUM_ORDERS = 18;

let couriers = [];
let orders = [];
let orderIdCounter = 0;
let courierIdCounter = 0;

function randomPos() {
  return {
    x: Math.random() * MAP_WIDTH,
    y: Math.random() * MAP_HEIGHT
  };
}

function randomAmount() {
  return Math.floor(Math.random() * 80) + 20;
}

function initCouriers() {
  couriers = [];
  for (let i = 0; i < NUM_COURIERS; i++) {
    couriers.push({
      id: 'C' + (++courierIdCounter),
      pos: randomPos(),
      name: '骑手' + (i + 1)
    });
  }
}

function initOrders() {
  orders = [];
  for (let i = 0; i < NUM_ORDERS; i++) {
    orders.push({
      id: 'O' + (++orderIdCounter),
      pos: randomPos(),
      amount: randomAmount(),
      createTime: Date.now() - Math.floor(Math.random() * 300000)
    });
  }
}

function moveCouriers() {
  for (const c of couriers) {
    c.pos.x += (Math.random() - 0.5) * 20;
    c.pos.y += (Math.random() - 0.5) * 20;
    c.pos.x = Math.max(0, Math.min(MAP_WIDTH, c.pos.x));
    c.pos.y = Math.max(0, Math.min(MAP_HEIGHT, c.pos.y));
  }
}

function replaceOrders() {
  const toRemove = orders.splice(0, 3);
  for (let i = 0; i < 3; i++) {
    orders.push({
      id: 'O' + (++orderIdCounter),
      pos: randomPos(),
      amount: randomAmount(),
      createTime: Date.now()
    });
  }
  return toRemove;
}

initCouriers();
initOrders();

wss.on('connection', (ws) => {
  const payload = {
    type: 'init',
    map: { width: MAP_WIDTH, height: MAP_HEIGHT },
    couriers: JSON.parse(JSON.stringify(couriers)),
    orders: JSON.parse(JSON.stringify(orders))
  };
  ws.send(JSON.stringify(payload));
});

let tick = 0;
setInterval(() => {
  tick++;
  moveCouriers();
  let removed = [];
  if (tick % 3 === 0) {
    removed = replaceOrders();
  }
  const payload = {
    type: 'update',
    couriers: JSON.parse(JSON.stringify(couriers)),
    orders: JSON.parse(JSON.stringify(orders)),
    removed: removed.map(o => o.id)
  };
  const msg = JSON.stringify(payload);
  wss.clients.forEach(c => {
    if (c.readyState === 1) c.send(msg);
  });
}, 1500);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`派单后台运行在 http://localhost:${PORT}`);
});
