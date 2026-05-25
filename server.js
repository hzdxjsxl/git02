const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let questionBank = [];
try {
  const raw = fs.readFileSync(path.join(__dirname, 'data', 'questions.json'), 'utf-8');
  questionBank = JSON.parse(raw);
  console.log(`Loaded ${questionBank.length} questions from bank.`);
} catch (e) {
  console.error('Failed to load question bank:', e.message);
}

app.get('/api/questions', (req, res) => {
  res.json({ total: questionBank.length, questions: questionBank });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser.`);
});
