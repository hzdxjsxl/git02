const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/fabric-data', (req, res) => {
  const { width = 10000, height = 10000, pattern = 'twill' } = req.query;
  const w = parseInt(width);
  const h = parseInt(height);
  
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Transfer-Encoding': 'chunked'
  });
  
  res.write(`${w},${h}\n`);
  
  const batchSize = 1000;
  let rowIndex = 0;
  
  const generateBatch = () => {
    if (rowIndex >= h) {
      res.end();
      return;
    }
    
    let batch = '';
    const endRow = Math.min(rowIndex + batchSize, h);
    
    for (let y = rowIndex; y < endRow; y++) {
      const rowPattern = generateRowPattern(y, w, pattern);
      batch += rowPattern + '\n';
    }
    
    res.write(batch);
    rowIndex = endRow;
    
    setImmediate(generateBatch);
  };
  
  setImmediate(generateBatch);
});

function generateRowPattern(rowIndex, width, patternType) {
  const chars = [];
  
  switch (patternType) {
    case 'plain':
      for (let x = 0; x < width; x++) {
        chars.push((rowIndex + x) % 2 === 0 ? '1' : '0');
      }
      break;
      
    case 'twill':
      for (let x = 0; x < width; x++) {
        chars.push((rowIndex + x) % 4 < 2 ? '1' : '0');
      }
      break;
      
    case 'satin':
      for (let x = 0; x < width; x++) {
        const offset = (rowIndex * 3 + x) % 5;
        chars.push(offset < 2 ? '1' : '0');
      }
      break;
      
    case 'complex':
      for (let x = 0; x < width; x++) {
        const val = (Math.sin(rowIndex * 0.1) * Math.cos(x * 0.1) + 1) / 2;
        chars.push(val > 0.5 ? '1' : '0');
      }
      break;
      
    default:
      for (let x = 0; x < width; x++) {
        chars.push(Math.random() > 0.5 ? '1' : '0');
      }
  }
  
  return chars.join('');
}

app.listen(PORT, () => {
  console.log(`织物组织结构矩阵查看器运行在 http://localhost:${PORT}`);
  console.log(`支持的图案类型: plain, twill, satin, complex`);
});
