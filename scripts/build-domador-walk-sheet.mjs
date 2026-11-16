// Builds the Domador de Feras walk spritesheet from a 5x2 pixel-art sheet.
//
//   node scripts/build-domador-walk-sheet.mjs <source.png>
//
// Output:
//   public/domador-walk-spritesheet.png   (row 0 = right, row 1 = mirrored left)
//   art/domador-walk-preview.png          (debug preview, 3x, checkerboard)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/* ------------------------------------------------------------------ */
/* PNG decode / encode                                                 */
/* ------------------------------------------------------------------ */
function decodePng(buffer) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (pos < buffer.length) {
    const length = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    const data = buffer.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error('interlaced PNG is not supported');
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + length;
  }

  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
  if (!channels) throw new Error(`unsupported color type ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const data = new Uint8ClampedArray(width * height * 4);
  let prev = new Uint8Array(stride);
  let ptr = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[ptr++];
    const cur = new Uint8Array(raw.subarray(ptr, ptr + stride));
    ptr += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = cur[x];
      if (filter === 1) v = (v + a) & 0xff;
      else if (filter === 2) v = (v + b) & 0xff;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
      cur[x] = v;
    }
    for (let x = 0; x < width; x++) {
      const si = x * channels;
      const di = (y * width + x) * 4;
      if (channels === 4) {
        data[di] = cur[si];
        data[di + 1] = cur[si + 1];
        data[di + 2] = cur[si + 2];
        data[di + 3] = cur[si + 3];
      } else if (channels === 3) {
        data[di] = cur[si];
        data[di + 1] = cur[si + 1];
        data[di + 2] = cur[si + 2];
        data[di + 3] = 255;
      } else {
        data[di] = data[di + 1] = data[di + 2] = cur[si];
        data[di + 3] = 255;
      }
    }
    prev = cur;
  }

  return { width, height, data };
}

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), row + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ */
/* Image helpers                                                       */
/* ------------------------------------------------------------------ */
const idx = (img, x, y) => (y * img.width + x) * 4;

function isBackgroundish(img, x, y) {
  const i = idx(img, x, y);
  const a = img.data[i + 3];
  if (a < 24) return true;
  const r = img.data[i];
  const g = img.data[i + 1];
  const b = img.data[i + 2];
  return r > 232 && g > 232 && b > 232;
}

/** Removes background pixels connected to the region border (keeps white paint inside). */
function clearBackground(img, x0, y0, w, h) {
  const visited = new Uint8Array(w * h);
  const queue = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const k = y * w + x;
    if (visited[k]) return;
    if (!isBackgroundish(img, x0 + x, y0 + y)) return;
    visited[k] = 1;
    queue.push(k);
  };

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  while (queue.length) {
    const k = queue.pop();
    const x = k % w;
    const y = (k / w) | 0;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!visited[y * w + x]) continue;
      const i = idx(img, x0 + x, y0 + y);
      img.data[i] = 0;
      img.data[i + 1] = 0;
      img.data[i + 2] = 0;
      img.data[i + 3] = 0;
    }
  }
}

/** Connected components over opaque pixels (8-connected) with a label map. */
function labelComponents(img) {
  const { width, height, data } = img;
  const labels = new Int32Array(width * height);
  const found = [];
  const stack = [];
  let nextId = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (labels[start] || data[start * 4 + 3] < 64) continue;
      const id = nextId++;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let area = 0;
      labels[start] = id;
      stack.push(start);
      while (stack.length) {
        const k = stack.pop();
        const cx = k % width;
        const cy = (k / width) | 0;
        area++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const nx = cx + ox;
            const ny = cy + oy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const nk = ny * width + nx;
            if (labels[nk] || data[nk * 4 + 3] < 64) continue;
            labels[nk] = id;
            stack.push(nk);
          }
        }
      }
      found.push({ id, x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area });
    }
  }
  return { labels, found: found.sort((a, b) => b.area - a.area) };
}

/** Area-average resample of a source rect into an RGBA buffer (premultiplied alpha). */
function resampleRegion(img, rect, outW, outH, labels, labelId) {
  const out = new Uint8ClampedArray(outW * outH * 4);
  const sx = rect.w / outW;
  const sy = rect.h / outH;

  for (let dy = 0; dy < outH; dy++) {
    const fy0 = dy * sy;
    const fy1 = fy0 + sy;
    const iy0 = Math.floor(fy0);
    const iy1 = Math.min(rect.h, Math.ceil(fy1));
    for (let dx = 0; dx < outW; dx++) {
      const fx0 = dx * sx;
      const fx1 = fx0 + sx;
      const ix0 = Math.floor(fx0);
      const ix1 = Math.min(rect.w, Math.ceil(fx1));

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let cover = 0;
      for (let y = iy0; y < iy1; y++) {
        const wy = Math.min(fy1, y + 1) - Math.max(fy0, y);
        if (wy <= 0) continue;
        for (let x = ix0; x < ix1; x++) {
          const wx = Math.min(fx1, x + 1) - Math.max(fx0, x);
          if (wx <= 0) continue;
          const weight = wx * wy;
          cover += weight;
          const px = rect.x + x;
          const py = rect.y + y;
          // Ignore pixels that belong to another sprite on the sheet.
          if (labels && labels[py * img.width + px] !== labelId) continue;
          const si = (py * img.width + px) * 4;
          const alpha = img.data[si + 3] / 255;
          r += img.data[si] * alpha * weight;
          g += img.data[si + 1] * alpha * weight;
          b += img.data[si + 2] * alpha * weight;
          a += alpha * weight;
        }
      }

      const di = (dy * outW + dx) * 4;
      if (cover > 0 && a > 0) {
        out[di] = Math.round(r / a);
        out[di + 1] = Math.round(g / a);
        out[di + 2] = Math.round(b / a);
        out[di + 3] = Math.round((a / cover) * 255);
      }
    }
  }
  return out;
}

/** Feet-centre detection: average x of the lowest 12% of opaque pixels. */
function feetCenterX(img, rect, labels, labelId) {
  const startY = rect.y + Math.floor(rect.h * 0.88);
  let minX = Infinity;
  let maxX = -1;
  for (let y = startY; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      if (labels && labels[y * img.width + x] !== labelId) continue;
      if (img.data[idx(img, x, y) + 3] < 96) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  if (maxX < 0) return rect.x + rect.w / 2;
  return (minX + maxX + 1) / 2;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */
const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error('usage: node scripts/build-domador-walk-sheet.mjs <source.png>');
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, '..');
const img = decodePng(fs.readFileSync(sourcePath));
const COLS = 5;
const ROWS = 2;
const cellW = Math.floor(img.width / COLS);
const cellH = Math.floor(img.height / ROWS);

// One flood fill from the canvas border removes the shared white backdrop.
clearBackground(img, 0, 0, img.width, img.height);

const { labels, found } = labelComponents(img);
if (process.env.DEBUG_SHEET) {
  for (const c of found.slice(0, 24)) {
    console.log(
      `comp area=${String(c.area).padStart(7)} box=${c.x},${c.y} ${c.w}x${c.h} ` +
        `cell=${Math.floor((c.x + c.w / 2) / cellW)},${Math.floor((c.y + c.h / 2) / cellH)}`
    );
  }
}

const sprites = found.filter((c) => c.area >= 2000).slice(0, COLS * ROWS);
if (sprites.length !== COLS * ROWS) {
  throw new Error(`expected ${COLS * ROWS} sprites, found ${sprites.length}`);
}

// Order sprites by the grid position of their centroid.
sprites.sort((a, b) => {
  const ra = Math.floor((a.y + a.h / 2) / cellH);
  const rb = Math.floor((b.y + b.h / 2) / cellH);
  if (ra !== rb) return ra - rb;
  return Math.floor((a.x + a.w / 2) / cellW) - Math.floor((b.x + b.w / 2) / cellW);
});

const cells = sprites.map((comp, index) => {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const rect = { x: comp.x, y: comp.y, w: comp.w, h: comp.h };
  return {
    rect,
    labelId: comp.id,
    feetX: feetCenterX(img, rect, labels, comp.id),
    row,
    col,
  };
});

// The sheet has two drawn rows: the top one is a standing pose, the bottom one
// is a real stride. SHEET_ROW picks which row feeds the walk cycle.
const rowFilter = process.env.SHEET_ROW ?? 'all';
let walkCells =
  rowFilter === 'all' ? cells : cells.filter((c) => c.row === (rowFilter === 'bottom' ? 1 : 0));

// Optional explicit frame order, e.g. SHEET_FRAMES=1,2,3,4 to drop a frame
// where the source sheet forgot the blowgun.
if (process.env.SHEET_FRAMES) {
  walkCells = process.env.SHEET_FRAMES.split(',')
    .map((value) => Number(value.trim()))
    .filter((index) => Number.isInteger(index) && index >= 0 && index < cells.length)
    .map((index) => walkCells[index])
    .filter(Boolean);
}
if (walkCells.length < 2) throw new Error('need at least two walk frames');

if (process.env.DEBUG_SHEET) {
  for (const c of walkCells) {
    console.log(`cell ${c.row}:${c.col} rect=${c.rect.x},${c.rect.y} ${c.rect.w}x${c.rect.h}`);
  }
}

// Per-frame scale so every pose reads at the same on-screen height.
const CHAR_HEIGHT = 100;
const FRAME_H = 104;
const scaled = walkCells.map((cell) => {
  const scale = CHAR_HEIGHT / cell.rect.h;
  return {
    ...cell,
    scale,
    dw: Math.max(1, Math.round(cell.rect.w * scale)),
    dh: CHAR_HEIGHT,
    feetOffset: (cell.feetX - cell.rect.x) * scale,
  };
});

const FRAME_W = Math.max(
  ...scaled.map((c) => Math.ceil(Math.max(c.feetOffset, c.dw - c.feetOffset) * 2) + 6),
  FRAME_H
);

// Compose frames onto a uniform canvas: feet on the bottom edge, body centred.
const frames = scaled.map((cell) => {
  const frame = new Uint8ClampedArray(FRAME_W * FRAME_H * 4);
  const resampled = resampleRegion(img, cell.rect, cell.dw, cell.dh, labels, cell.labelId);
  const originX = Math.round(FRAME_W / 2 - cell.feetOffset);
  const originY = FRAME_H - cell.dh;
  for (let y = 0; y < cell.dh; y++) {
    for (let x = 0; x < cell.dw; x++) {
      const dx = originX + x;
      const dy = originY + y;
      if (dx < 0 || dy < 0 || dx >= FRAME_W || dy >= FRAME_H) continue;
      const si = (y * cell.dw + x) * 4;
      const di = (dy * FRAME_W + dx) * 4;
      frame[di] = resampled[si];
      frame[di + 1] = resampled[si + 1];
      frame[di + 2] = resampled[si + 2];
      frame[di + 3] = resampled[si + 3];
    }
  }
  return frame;
});

function buildSheet(order, mirrored) {
  const sheetW = FRAME_W * order.length;
  const sheetH = FRAME_H * (mirrored ? 2 : 1);
  const sheet = new Uint8ClampedArray(sheetW * sheetH * 4);
  order.forEach((frameIndex, column) => {
    const frame = frames[frameIndex];
    if (!frame) throw new Error(`missing frame ${frameIndex}`);
    for (let y = 0; y < FRAME_H; y++) {
      for (let x = 0; x < FRAME_W; x++) {
        const si = (y * FRAME_W + x) * 4;
        const oi = (y * sheetW + column * FRAME_W + x) * 4;
        sheet[oi] = frame[si];
        sheet[oi + 1] = frame[si + 1];
        sheet[oi + 2] = frame[si + 2];
        sheet[oi + 3] = frame[si + 3];
        if (!mirrored) continue;
        const mi = ((FRAME_H + y) * sheetW + column * FRAME_W + (FRAME_W - 1 - x)) * 4;
        sheet[mi] = frame[si];
        sheet[mi + 1] = frame[si + 1];
        sheet[mi + 2] = frame[si + 2];
        sheet[mi + 3] = frame[si + 3];
      }
    }
  });
  return { sheet, width: sheetW, height: sheetH };
}

const order = frames.map((_, i) => i);
const { sheet, width, height } = buildSheet(order, true);

const sheetPath = path.join(root, 'public', 'domador-walk-spritesheet.png');
fs.writeFileSync(sheetPath, encodePng(width, height, sheet));
console.log(`wrote ${sheetPath} (${width}x${height}, frames ${FRAME_W}x${FRAME_H})`);

// Debug preview: checkerboard + every frame at 3x.
const ZOOM = 3;
const pad = 8;
const previewCols = 5;
const previewRows = 2;
const pW = (FRAME_W * previewCols + pad * (previewCols + 1)) * ZOOM;
const pH = (FRAME_H * previewRows + pad * (previewRows + 1)) * ZOOM;
const preview = new Uint8ClampedArray(pW * pH * 4);

for (let y = 0; y < pH; y++) {
  for (let x = 0; x < pW; x++) {
    const cell = ((x >> 4) + (y >> 4)) % 2 === 0 ? 44 : 58;
    const i = (y * pW + x) * 4;
    preview[i] = cell;
    preview[i + 1] = cell;
    preview[i + 2] = cell;
    preview[i + 3] = 255;
  }
}

frames.forEach((frame, index) => {
  const col = index % previewCols;
  const row = Math.floor(index / previewCols);
  const ox = (pad + col * (FRAME_W + pad)) * ZOOM;
  const oy = (pad + row * (FRAME_H + pad)) * ZOOM;
  for (let y = 0; y < FRAME_H * ZOOM; y++) {
    for (let x = 0; x < FRAME_W * ZOOM; x++) {
      const si = (Math.floor(y / ZOOM) * FRAME_W + Math.floor(x / ZOOM)) * 4;
      const alpha = frame[si + 3] / 255;
      if (alpha <= 0) continue;
      const di = ((oy + y) * pW + ox + x) * 4;
      preview[di] = Math.round(frame[si] * alpha + preview[di] * (1 - alpha));
      preview[di + 1] = Math.round(frame[si + 1] * alpha + preview[di + 1] * (1 - alpha));
      preview[di + 2] = Math.round(frame[si + 2] * alpha + preview[di + 2] * (1 - alpha));
      preview[di + 3] = 255;
    }
  }
});

const previewPath = path.join(root, 'art', 'domador-walk-preview.png');
fs.writeFileSync(previewPath, encodePng(pW, pH, preview));
console.log(`wrote ${previewPath} (${pW}x${pH})`);
