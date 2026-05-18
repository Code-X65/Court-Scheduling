/**
 * Generates minimal valid PNG favicon files without any external dependencies.
 * Uses raw PNG byte construction (IHDR + IDAT + IEND chunks).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xFFFFFFFF;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let val = n;
    for (let k = 0; k < 8; k++) val = (val & 1) ? 0xEDB88320 ^ (val >>> 1) : val >>> 1;
    table[n] = val;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeB = Buffer.from(type, 'ascii');
  const lenB = Buffer.alloc(4); lenB.writeUInt32BE(data.length);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([lenB, typeB, data, crcB]);
}

function makePng(size, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw image data (filter byte 0 before each row)
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // filter type None
    for (let x = 0; x < size; x++) {
      // Draw a simple scales of justice icon using geometric shapes
      const cx = size / 2, cy = size / 2;
      const px = x - cx, py = y - cy;
      
      // Navy background circle
      const dist = Math.sqrt(px * px + py * py);
      const inCircle = dist <= size * 0.48;
      
      // Gold pillar
      const inPillar = Math.abs(px) <= size * 0.06 && py >= -size * 0.3 && py <= size * 0.35;
      
      // Gold base
      const inBase = Math.abs(px) <= size * 0.35 && py >= size * 0.3 && py <= size * 0.38;
      
      // Gold top bar
      const inBar = Math.abs(px) <= size * 0.4 && py >= -size * 0.32 && py <= -size * 0.24;
      
      // Left pan arc
      const lx = px + size * 0.3, lArc = Math.abs(Math.sqrt(lx*lx + (py - size*0.05)*(py-size*0.05)) - size*0.15);
      const inLeftPan = lArc < size * 0.04 && py > -size * 0.15 && py < size * 0.1;
      
      // Right pan arc
      const rx = px - size * 0.3, rArc = Math.abs(Math.sqrt(rx*rx + (py - size*0.05)*(py-size*0.05)) - size*0.15);
      const inRightPan = rArc < size * 0.04 && py > -size * 0.15 && py < size * 0.1;
      
      let pr, pg, pb;
      if (!inCircle) {
        pr = 0; pg = 0; pb = 0; // transparent → black (PNG has no alpha in RGB)
      } else if (inPillar || inBase || inBar || inLeftPan || inRightPan) {
        // Gold: #C8922A
        pr = 200; pg = 146; pb = 42;
      } else {
        // Navy: #0B1F3A
        pr = 11; pg = 31; pb = 58;
      }
      
      row[1 + x * 3] = pr;
      row[2 + x * 3] = pg;
      row[3 + x * 3] = pb;
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw);
  
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const publicDir = path.join(__dirname, 'public');

// favicon-16x16.png
fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), makePng(16, 11, 31, 58));
console.log('Created favicon-16x16.png');

// favicon-32x32.png
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), makePng(32, 11, 31, 58));
console.log('Created favicon-32x32.png');

// apple-touch-icon.png (180x180)
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), makePng(180, 11, 31, 58));
console.log('Created apple-touch-icon.png');

console.log('All favicon PNGs generated successfully.');
