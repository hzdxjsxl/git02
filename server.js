const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = 3000;
const RACK_ROWS = 8;
const RACK_COLS = 12;
const SENSORS_PER_RACK = 25;
const TOTAL_SENSORS = RACK_ROWS * RACK_COLS * SENSORS_PER_RACK;

const baseTemps = new Float32Array(TOTAL_SENSORS);
for (let i = 0; i < TOTAL_SENSORS; i++) {
  baseTemps[i] = 20 + Math.random() * 40;
}

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css'
  }[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

function genTemps() {
  const temps = new Float32Array(TOTAL_SENSORS);
  for (let i = 0; i < TOTAL_SENSORS; i++) {
    const base = baseTemps[i];
    const wave = Math.sin(Date.now() * 0.0005 + i * 0.1) * 3;
    const noise = (Math.random() - 0.5) * 2;
    temps[i] = base + wave + noise;
    baseTemps[i] = Math.max(15, Math.min(85, baseTemps[i] + (Math.random() - 0.5) * 0.3));
  }
  return temps;
}

function sendConfig(ws) {
  ws.send(JSON.stringify({
    type: 'config',
    rackRows: RACK_ROWS,
    rackCols: RACK_COLS,
    sensorsPerRack: SENSORS_PER_RACK,
    totalSensors: TOTAL_SENSORS
  }));
}

wss.on('connection', (ws) => {
  sendConfig(ws);

  const interval = setInterval(() => {
    const temps = genTemps();
    if (ws.readyState === 1) {
      ws.send(temps.buffer);
    }
  }, 1000);

  ws.on('close', () => clearInterval(interval));
  ws.on('error', () => clearInterval(interval));
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});