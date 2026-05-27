import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import cors from 'cors';
import { CallRequest, TrafficPattern } from '../src/types';
import { HOT_FLOORS, HOT_FLOOR_MULTIPLIER, BUILDING_CONFIG, generateId } from '../src/constants/config';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = 3001;
const CALLS_PER_SECOND = 50;

let trafficPattern: TrafficPattern = 'morning';
let isRunning = true;
let clients: WebSocket[] = [];

const generateRandomFloor = (): number => {
  const useHotFloor = Math.random() < 0.4;
  if (useHotFloor) {
    return HOT_FLOORS[Math.floor(Math.random() * HOT_FLOORS.length)];
  }
  return Math.floor(Math.random() * BUILDING_CONFIG.totalFloors) + 1;
};

const generateCallWithPattern = (pattern: TrafficPattern): CallRequest => {
  let floor: number;
  let direction: 'up' | 'down';
  let destinationFloor: number;

  switch (pattern) {
    case 'morning':
      if (Math.random() < 0.7) {
        floor = 1;
        direction = 'up';
        destinationFloor = Math.floor(Math.random() * (BUILDING_CONFIG.totalFloors - 1)) + 2;
      } else {
        floor = generateRandomFloor();
        direction = Math.random() < 0.5 ? 'up' : 'down';
        if (floor === 1) direction = 'up';
        if (floor === BUILDING_CONFIG.totalFloors) direction = 'down';
        destinationFloor =
          direction === 'up'
            ? Math.floor(Math.random() * (BUILDING_CONFIG.totalFloors - floor)) + floor + 1
            : Math.floor(Math.random() * (floor - 1)) + 1;
      }
      break;

    case 'evening':
      if (Math.random() < 0.7) {
        floor = Math.floor(Math.random() * (BUILDING_CONFIG.totalFloors - 1)) + 2;
        direction = 'down';
        destinationFloor = 1;
      } else {
        floor = generateRandomFloor();
        direction = Math.random() < 0.5 ? 'up' : 'down';
        if (floor === 1) direction = 'up';
        if (floor === BUILDING_CONFIG.totalFloors) direction = 'down';
        destinationFloor =
          direction === 'up'
            ? Math.floor(Math.random() * (BUILDING_CONFIG.totalFloors - floor)) + floor + 1
            : Math.floor(Math.random() * (floor - 1)) + 1;
      }
      break;

    case 'normal':
      floor = generateRandomFloor();
      direction = Math.random() < 0.5 ? 'up' : 'down';
      if (floor === 1) direction = 'up';
      if (floor === BUILDING_CONFIG.totalFloors) direction = 'down';
      destinationFloor =
        direction === 'up'
          ? Math.floor(Math.random() * (BUILDING_CONFIG.totalFloors - floor)) + floor + 1
          : Math.floor(Math.random() * (floor - 1)) + 1;
      break;

    default:
      floor = Math.floor(Math.random() * BUILDING_CONFIG.totalFloors) + 1;
      direction = Math.random() < 0.5 ? 'up' : 'down';
      if (floor === 1) direction = 'up';
      if (floor === BUILDING_CONFIG.totalFloors) direction = 'down';
      destinationFloor =
        direction === 'up'
          ? Math.floor(Math.random() * (BUILDING_CONFIG.totalFloors - floor)) + floor + 1
          : Math.floor(Math.random() * (floor - 1)) + 1;
  }

  return {
    id: generateId(),
    floor,
    direction,
    timestamp: Date.now(),
    waitTime: 0,
    assignedElevator: null,
    picked: false,
    destinationFloor,
  };
};

const generateBatchCalls = (count: number, pattern: TrafficPattern): CallRequest[] => {
  const calls: CallRequest[] = [];
  for (let i = 0; i < count; i++) {
    calls.push(generateCallWithPattern(pattern));
  }
  return calls;
};

let lastSendTime = Date.now();

const broadcastCalls = () => {
  if (!isRunning || clients.length === 0) return;

  const now = Date.now();
  const delta = now - lastSendTime;
  const callsToGenerate = Math.floor((CALLS_PER_SECOND * delta) / 1000);

  if (callsToGenerate > 0) {
    const calls = generateBatchCalls(callsToGenerate, trafficPattern);
    const message = JSON.stringify({
      type: 'NEW_CALLS',
      payload: calls,
    });

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    lastSendTime = now;
  }
};

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.push(ws);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'SET_PATTERN') {
        trafficPattern = message.payload as TrafficPattern;
        console.log('Traffic pattern set to:', trafficPattern);
      } else if (message.type === 'TOGGLE_SIMULATION') {
        isRunning = message.payload;
        console.log('Simulation running:', isRunning);
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clients = clients.filter((c) => c !== ws);
  });

  ws.send(
    JSON.stringify({
      type: 'CONFIG',
      payload: {
        buildingConfig: BUILDING_CONFIG,
        trafficPattern,
        isRunning,
      },
    })
  );
});

setInterval(broadcastCalls, 100);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', connectedClients: clients.length, trafficPattern, isRunning });
});

app.post('/api/pattern', (req, res) => {
  trafficPattern = req.body.pattern as TrafficPattern;
  res.json({ pattern: trafficPattern });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server on ws://localhost:${PORT}/ws`);
});
