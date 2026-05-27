const express = require('express');
const path = require('path');
const zlib = require('zlib');

const app = express();
const PORT = 3001;

app.use(express.static(path.join(__dirname, 'public')));

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(width, height, pixelWriter) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelWriter(x, y);
      const off = y * (width * 3 + 1) + 1 + x * 3;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b;
    }
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100']
};

function drawText(width, height, text, startX, startY, scale, color) {
  const pixels = [];
  for (let i = 0; i < width * height; i++) pixels.push([255, 255, 255]);
  let cx = startX;
  for (const ch of text) {
    const glyph = FONT[ch.toUpperCase()] || FONT.A;
    for (let gy = 0; gy < glyph.length; gy++) {
      for (let gx = 0; gx < glyph[gy].length; gx++) {
        if (glyph[gy][gx] === '1') {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const px = cx + gx * scale + sx;
              const py = startY + gy * scale + sy;
              if (px >= 0 && px < width && py >= 0 && py < height) {
                pixels[py * width + px] = color;
              }
            }
          }
        }
      }
    }
    cx += (glyph[0].length + 1) * scale;
  }
  return pixels;
}

app.get('/api/sample', (req, res) => {
  const width = 800;
  const height = 500;

  const text1 = 'HELLO';
  const text2 = 'OCR WORLD';
  const text3 = 'ABCD FGH';

  const scale = 6;
  let pixels = [];
  for (let i = 0; i < width * height; i++) pixels.push([255, 255, 255]);

  function draw(text, x, y) {
    let cx = x;
    for (const ch of text) {
      const glyph = FONT[ch.toUpperCase()] || FONT.A;
      for (let gy = 0; gy < glyph.length; gy++) {
        for (let gx = 0; gx < glyph[gy].length; gx++) {
          if (glyph[gy][gx] === '1') {
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                const px = cx + gx * scale + sx;
                const py = y + gy * scale + sy;
                if (px >= 0 && px < width && py >= 0 && py < height) {
                  pixels[py * width + px] = [20, 20, 20];
                }
              }
            }
          }
        }
      }
      cx += (glyph[0].length + 1) * scale;
    }
  }

  draw(text1, 80, 60);
  draw(text2, 80, 180);
  draw(text3, 80, 320);

  const png = makePng(width, height, (x, y) => pixels[y * width + x]);

  const boxes = [
    { id: 'b1', text: 'HELLO', x: 72, y: 52, w: 200, h: 55 },
    { id: 'b2', text: 'OCR WORLD', x: 74, y: 172, w: 360, h: 55 },
    { id: 'b3', text: 'ABCD FGH', x: 70, y: 310, w: 280, h: 58 }
  ];

  res.json({
    image: 'data:image/png;base64,' + png.toString('base64'),
    width,
    height,
    boxes
  });
});

app.listen(PORT, () => {
  console.log(`OCR 纠错服务已启动: http://localhost:${PORT}`);
  console.log('直接打开浏览器访问即可体验拖拽+吸附功能');
});
