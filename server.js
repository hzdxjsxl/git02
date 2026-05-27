const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let circuitData = {
  gates: [
    { id: 'input1', type: 'INPUT', x: 50, y: 100, value: 0 },
    { id: 'input2', type: 'INPUT', x: 50, y: 200, value: 1 },
    { id: 'and1', type: 'AND', x: 250, y: 150 },
    { id: 'not1', type: 'NOT', x: 450, y: 150 },
    { id: 'output1', type: 'OUTPUT', x: 650, y: 150 }
  ],
  connections: [
    { from: 'input1', fromPort: 'out', to: 'and1', toPort: 'in1' },
    { from: 'input2', fromPort: 'out', to: 'and1', toPort: 'in2' },
    { from: 'and1', fromPort: 'out', to: 'not1', toPort: 'in1' },
    { from: 'not1', fromPort: 'out', to: 'output1', toPort: 'in1' }
  ]
};

app.get('/api/circuit', (req, res) => {
  const plainText = JSON.stringify(circuitData);
  res.setHeader('Content-Type', 'text/plain');
  res.send(plainText);
});

app.post('/api/circuit', (req, res) => {
  circuitData = req.body;
  res.setHeader('Content-Type', 'text/plain');
  res.send('OK');
});

app.listen(PORT, () => {
  console.log(`Logic Circuit Simulator running at http://localhost:${PORT}`);
});
