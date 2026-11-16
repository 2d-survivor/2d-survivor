// Generates a 64x64 pixel-art sprite of an indigenous beast tamer with a blowgun,
// upscaled 8x (512x512) with nearest-neighbour into a PNG.
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

const W = 96;
const H = 96;
const SCALE = 6;

const pixels = new Uint8Array(W * H * 3);
const mask = new Uint8Array(W * H);
let characterPhase = false;

const rgb = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

function put(x, y, h, alpha = 1) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const [r, g, b] = Array.isArray(h) ? h : rgb(h);
  const i = (y * W + x) * 3;
  if (alpha >= 1) {
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
  } else {
    pixels[i] = Math.round(pixels[i] * (1 - alpha) + r * alpha);
    pixels[i + 1] = Math.round(pixels[i + 1] * (1 - alpha) + g * alpha);
    pixels[i + 2] = Math.round(pixels[i + 2] * (1 - alpha) + b * alpha);
  }
  if (characterPhase) mask[y * W + x] = 1;
}

function rect(x, y, w, h, color, alpha = 1) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) put(xx, yy, color, alpha);
  }
}

function ellipse(cx, cy, rx, ry, color, alpha = 1) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) put(x, y, color, alpha);
    }
  }
}

function line(x0, y0, x1, y1, width, color, alpha = 1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 3 + 1;
  const r = width / 2;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        if (dx * dx + dy * dy <= r * r) put(x + dx, y + dy, color, alpha);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Background: deep jungle with a soft glow behind the figure.         */
/* ------------------------------------------------------------------ */
const bgTop = rgb('#0a1a11');
const bgBottom = rgb('#16402a');
const glow = rgb('#3d7448');

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const t = y / (H - 1);
    let c = [
      bgTop[0] + (bgBottom[0] - bgTop[0]) * t,
      bgTop[1] + (bgBottom[1] - bgTop[1]) * t,
      bgTop[2] + (bgBottom[2] - bgTop[2]) * t,
    ];
    const d = Math.hypot(x - 47, y - 40);
    const g = Math.max(0, 1 - d / 40);
    const ga = g * g * 0.55;
    c = [c[0] + (glow[0] - c[0]) * ga, c[1] + (glow[1] - c[1]) * ga, c[2] + (glow[2] - c[2]) * ga];
    const vd = Math.hypot((x - 47.5) / 50, (y - 47.5) / 50);
    const dark = Math.min(0.6, Math.max(0, vd - 0.5) * 1.4);
    c = [c[0] * (1 - dark), c[1] * (1 - dark), c[2] * (1 - dark)];
    put(x, y, c);
  }
}

// Foliage silhouettes framing the corners.
ellipse(3, 6, 15, 12, '#07150c');
ellipse(10, 2, 12, 8, '#0b1f12');
ellipse(92, 8, 15, 13, '#07150c');
ellipse(83, 2, 11, 8, '#0b1f12');
ellipse(93, 90, 14, 12, '#051007');
ellipse(2, 91, 12, 10, '#051007');
ellipse(6, 12, 9, 5, '#0d2616');
ellipse(89, 16, 9, 5, '#0d2616');

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */
const SKIN = '#b06b3f';
const SKIN_L = '#d0915c';
const SKIN_S = '#8a4e2c';
const SKIN_D = '#63331b';
const HAIR = '#1b120e';
const PAINT_R = '#b23a2b';
const PAINT_K = '#221812';
const GOLD = '#e8bb44';
const WOOD = '#7d4b22';
const WOOD_L = '#bd8439';
const WOOD_D = '#3f240d';
const STRAW = '#cbb26a';
const STRAW_D = '#8f7a3f';
const BONE = '#ece4cf';

const FEATHER = ['#c2412f', '#d9762f', '#e6c04a', '#4f9a4a', '#2f7f9e', '#c2412f', '#e6c04a'];

characterPhase = true;

/* ------------------------------------------------------------------ */
/* Ground shadow                                                       */
/* ------------------------------------------------------------------ */
ellipse(47, 90, 29, 4.5, '#03100a', 0.8);
ellipse(46, 90, 20, 2.8, '#010805', 0.65);

/* ------------------------------------------------------------------ */
/* Jaguar cub companion (bottom left)                                  */
/* ------------------------------------------------------------------ */
line(12, 82, 17, 75, 2.2, '#c69a48');
line(18, 74, 22, 78, 2.2, '#c69a48');
put(12, 83, '#8f6a2a');
put(16, 76, '#e6c47a');
ellipse(24, 82, 9.5, 6.6, '#d0a64f');
ellipse(23, 84, 8.5, 4.2, '#b98d3c');
ellipse(23, 78, 7.5, 3.6, '#dcb35b');
// legs
rect(19, 84, 3, 7, '#c69a48');
rect(27, 84, 3, 7, '#c69a48');
rect(19, 90, 4, 2, '#8f6a2a');
rect(27, 90, 4, 2, '#8f6a2a');
// head
ellipse(32, 75, 6.2, 5.8, '#e2ba60');
// ears
rect(27, 69, 3, 3, '#e2ba60');
rect(35, 69, 3, 3, '#e2ba60');
put(27, 69, '#7d5a22');
put(38, 69, '#7d5a22');
put(28, 70, '#c99b62');
put(37, 70, '#c99b62');
// muzzle + eyes
ellipse(32, 78, 3.4, 2.2, '#f6e6c8');
put(32, 77, '#5a3a20');
put(29, 74, '#241a10');
put(36, 74, '#241a10');
put(29, 73, '#241a10');
put(36, 73, '#241a10');
put(32, 76, '#241a10');
put(33, 76, '#241a10');
put(28, 79, '#c08a5a');
put(36, 79, '#c08a5a');
// rosettes
for (const [rx, ry] of [
  [20, 78],
  [25, 80],
  [22, 85],
  [26, 76],
  [30, 84],
  [18, 81],
]) {
  put(rx, ry, '#6b4a1e');
  put(rx + 1, ry, '#6b4a1e');
  put(rx, ry + 1, '#6b4a1e');
}

/* ------------------------------------------------------------------ */
/* Legs and feet                                                       */
/* ------------------------------------------------------------------ */
// left leg
rect(37, 72, 8, 14, SKIN);
rect(43, 72, 2, 14, SKIN_S);
rect(37, 72, 1, 14, SKIN_L);
// right leg
rect(49, 72, 8, 14, SKIN);
rect(55, 72, 2, 14, SKIN_S);
rect(49, 72, 1, 14, SKIN_L);
// inner-leg shadow to separate the legs
rect(44, 74, 1, 13, SKIN_D, 0.55);
rect(48, 74, 1, 13, SKIN_D, 0.55);
// knee bands
rect(37, 78, 8, 3, PAINT_R);
rect(49, 78, 8, 3, PAINT_R);
put(40, 79, GOLD);
put(43, 79, '#8f2f22');
put(52, 79, GOLD);
put(55, 79, '#8f2f22');
// feet
rect(36, 85, 9, 4, SKIN);
rect(36, 88, 9, 1, SKIN_D);
rect(43, 85, 3, 4, SKIN_S);
rect(49, 85, 9, 4, SKIN);
rect(49, 88, 9, 1, SKIN_D);
rect(49, 85, 3, 4, SKIN_S);
// toes
for (let x = 37; x <= 44; x += 2) put(x, 87, SKIN_D);
for (let x = 50; x <= 57; x += 2) put(x, 87, SKIN_D);

/* ------------------------------------------------------------------ */
/* Loincloth                                                           */
/* ------------------------------------------------------------------ */
for (let y = 58; y <= 73; y++) {
  const spread = Math.round((y - 58) * 0.5);
  const x0 = 38 - spread;
  const x1 = 55 + spread;
  for (let x = x0; x <= x1; x++) {
    const strand = (x * 7 + y * 3) % 5;
    put(x, y, strand === 0 ? STRAW_D : strand === 2 ? '#dcc27a' : STRAW);
  }
}
// red waist band
for (let y = 58; y <= 61; y++) {
  const spread = Math.round((y - 58) * 0.5);
  for (let x = 38 - spread; x <= 55 + spread; x++) {
    put(x, y, y === 59 ? '#8f2f22' : PAINT_R);
  }
}
for (let x = 41; x <= 52; x += 3) put(x, 59, GOLD);
// fiber hem
for (let x = 30; x <= 63; x++) {
  if ((x + 1) % 3 === 0) put(x, 74, STRAW_D);
  if ((x + 24) % 5 === 0) put(x, 75, STRAW_D);
}
// loincloth front flap
for (let y = 62; y <= 70; y++) {
  const w = 3 - Math.floor((y - 62) / 3);
  for (let x = 46 - w; x <= 48 + w; x++) put(x, y, y % 2 === 0 ? STRAW : STRAW_D);
}

// Gourd of spare darts hanging from the waistband
line(56, 58, 61, 59, 1.2, '#c9b183');
ellipse(64, 63, 4.4, 5.0, '#a8792f');
ellipse(63, 61.6, 2.6, 2.6, '#c39340');
ellipse(65.5, 65, 2.4, 2.6, '#8a6124');
rect(62, 57, 4, 2, '#6d4f26');
put(63, 57, '#d9c79a');
put(65, 58, '#d9c79a');
put(63, 64, '#e8bb44', 0.7);
put(65, 62, '#e8bb44', 0.5);

/* ------------------------------------------------------------------ */
/* Torso                                                               */
/* ------------------------------------------------------------------ */
const torsoRows = [
  [36, 8.0],
  [37, 10.0],
  [38, 11.0],
  [39, 11.6],
  [40, 11.8],
  [41, 11.8],
  [42, 11.7],
  [43, 11.4],
  [44, 11.0],
  [45, 10.6],
  [46, 10.1],
  [47, 9.6],
  [48, 9.1],
  [49, 8.6],
  [50, 8.1],
  [51, 7.7],
  [52, 7.3],
  [53, 7.0],
  [54, 6.7],
  [55, 6.5],
  [56, 6.3],
  [57, 6.2],
];
for (const [y, hw] of torsoRows) {
  for (let x = Math.round(46.5 - hw); x <= Math.round(46.5 + hw); x++) {
    const rel = (x - 46.5) / hw;
    let color = SKIN;
    if (rel > 0.55) color = SKIN_S;
    else if (rel < -0.55) color = SKIN_L;
    if (y >= 52) color = rel > 0.5 ? SKIN_D : color;
    put(x, y, color);
  }
}
// pectorals and abs
for (let x = 40; x <= 52; x++) put(x, 45, SKIN_S, 0.4);
rect(46, 42, 1, 13, SKIN_S, 0.6);
for (let y = 47; y <= 53; y += 3) {
  put(43, y, SKIN_S);
  put(50, y, SKIN_S);
}
ellipse(41, 43, 4, 2.4, SKIN_L, 0.55);
ellipse(52, 43, 4, 2.4, SKIN_S, 0.5);

// Chest body paint: diagonal black band + red accents
for (let i = 0; i < 20; i++) {
  const x = 37 + i;
  const y = 40 + Math.round(i * 0.55);
  put(x, y, PAINT_K, 0.8);
  put(x, y + 1, '#3a2a20', 0.45);
}
line(40, 50, 52, 50, 1, PAINT_R, 0.75);
line(40, 51, 42, 51, 1, PAINT_R, 0.55);

// Neck
rect(43, 32, 7, 5, SKIN);
rect(49, 32, 1, 5, SKIN_S);
rect(43, 32, 1, 5, SKIN_L);

// Necklace: cord + teeth
line(37, 38, 56, 38, 1, '#6d4a24');
for (const [nx, ny] of [
  [39, 39],
  [43, 41],
  [50, 41],
  [54, 39],
  [46, 42],
]) {
  put(nx, ny, BONE);
  put(nx, ny + 1, '#c8bfa6');
}
put(47, 43, '#e8d9a8');

/* ------------------------------------------------------------------ */
/* Arms                                                                */
/* ------------------------------------------------------------------ */
// Left arm (viewer left): shoulder down to lower grip
line(37, 41, 31, 60, 7, SKIN);
line(36, 41, 30, 60, 2.4, SKIN_L);
line(39, 48, 35, 60, 1.2, SKIN_S);
// armband
rect(31, 48, 8, 3, PAINT_R);
put(34, 49, GOLD);
put(36, 49, '#8f2f22');

// Right arm (viewer right): shoulder to upper grip
line(56, 41, 64, 52, 7, SKIN);
line(57, 41, 65, 51, 2.4, SKIN_L);
line(53, 48, 60, 54, 1.2, SKIN_S);
rect(59, 46, 8, 3, PAINT_R);
put(62, 47, GOLD);
put(64, 47, '#8f2f22');

// Feather armband on the upper arm
rect(57, 50, 6, 3, '#4f9a4a');
put(58, 51, '#8fce6a');
put(62, 51, '#2f7f5e');
put(59, 52, '#2f7f5e');
put(61, 52, '#8fce6a');

/* ------------------------------------------------------------------ */
/* Blowgun (zarabatana)                                                */
/* ------------------------------------------------------------------ */
const gx0 = 16;
const gy0 = 69;
const gx1 = 76;
const gy1 = 48;

line(gx0, gy0, gx1, gy1, 5, WOOD);
line(gx0, gy0 - 1.6, gx1, gy1 - 1.6, 1.8, WOOD_L);
line(gx0, gy0 + 2, gx1, gy1 + 2, 1.6, WOOD_D);
// binding rings
for (let t = 0.1; t < 0.95; t += 0.12) {
  const x = gx0 + (gx1 - gx0) * t;
  const y = gy0 + (gy1 - gy0) * t;
  put(x, y - 2.6, '#d9c79a');
  put(x, y + 2.9, '#4a2c14');
}
// mouthpiece
ellipse(gx0, gy0, 3.2, 3.2, '#5a3a18');
put(gx0, gy0, '#1c1008');
put(gx0 - 1, gy0 + 1, '#8a6134');
// muzzle
ellipse(gx1, gy1, 3.4, 3.4, WOOD_L);
put(gx1, gy1, '#1c1008');
put(gx1 + 1, gy1 + 1, '#2b1a0c');
put(gx1 - 1, gy1 - 2, '#e0c58a');

// Hands gripping the tube (drawn on top)
ellipse(33, 63, 4.6, 4.0, SKIN);
ellipse(32, 61.6, 3.0, 2.0, SKIN_L);
rect(30, 64, 7, 1.4, SKIN_S);
put(31, 60, SKIN_D);
put(33, 60, SKIN_D);
put(35, 60, SKIN_D);

ellipse(64, 53, 4.6, 4.0, SKIN);
ellipse(65, 51.6, 3.0, 2.0, SKIN_L);
rect(61, 54, 7, 1.4, SKIN_S);
put(62, 50, SKIN_D);
put(64, 50, SKIN_D);
put(66, 50, SKIN_D);

// Dart in flight (clear silhouette, outlined)
line(83, 47, 90, 43.8, 2.6, '#2b1a0c');
line(83, 47, 90, 43.8, 1.6, '#f3e2b0');
put(90, 44, '#e8e0c8');
put(91, 43, '#8a6a3a');
put(92, 43, '#e8e0c8');
put(81, 48, '#2b1a0c');
put(82, 47, '#4f9a4a');
put(82, 46, '#8fce6a');
put(83, 45, '#4f9a4a');
put(81, 49, '#4f9a4a');
put(84, 49, '#8fce6a', 0.6);

/* ------------------------------------------------------------------ */
/* Feather headdress                                                   */
/* ------------------------------------------------------------------ */
const headX = 46.5;
const headY = 24;

const feather = (angleDeg, len, color, core) => {
  const a = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = -Math.sin(a);
  for (let s = 3; s <= len; s += 0.35) {
    const taper = s < len * 0.5 ? 1 : Math.max(0.25, 1 - (s - len * 0.5) / (len * 0.5));
    const w = 1.8 * taper;
    const x = headX + dx * s;
    const y = headY + dy * s;
    for (let o = -2; o <= 2; o++) {
      if (Math.abs(o) <= w + 0.2) put(x - dy * o, y + dx * o, Math.abs(o) < 0.6 ? core : color);
    }
  }
  put(headX + dx * len, headY + dy * len, '#2b1c10');
};

const featherAngles = [155, 142, 129, 116, 103, 90, 77, 64, 51, 38, 25];
featherAngles.forEach((angle, i) => {
  const color = FEATHER[i % FEATHER.length];
  const core = i % 2 === 0 ? '#f7ecc4' : color;
  const len = 18 + (i % 3 === 0 ? 4 : i % 3 === 1 ? 1 : 3);
  feather(angle, len, color, core);
});

/* ------------------------------------------------------------------ */
/* Head                                                                */
/* ------------------------------------------------------------------ */
// hair mass behind the head
ellipse(headX, headY + 3, 9.4, 9.0, HAIR);
ellipse(headX - 3, headY + 1, 5.0, 5.0, '#2a1a13');
// face
ellipse(headX, headY + 3.5, 7.4, 7.8, SKIN);
ellipse(headX - 2.4, headY + 2.4, 4.8, 5.4, SKIN_L);
// ear
ellipse(headX - 7.4, headY + 4.4, 1.6, 2.6, SKIN);
put(headX - 8, headY + 4, SKIN_D);
// jaw shading
for (let x = 41; x <= 52; x++) put(x, headY + 9, SKIN_S);
put(40, headY + 7, SKIN_D);

// headband
for (let x = 37; x <= 56; x++) {
  put(x, headY - 4, PAINT_K);
  put(x, headY - 3, x % 2 === 0 ? PAINT_R : '#8f2f22');
  put(x, headY - 2, PAINT_K);
}
for (let x = 40; x <= 55; x += 4) put(x, headY - 3, GOLD);
// headband ties
line(36, headY - 2, 33, headY + 6, 1.4, PAINT_R);
line(57, headY - 2, 60, headY + 4, 1.4, PAINT_R);
put(33, headY + 7, GOLD);
put(60, headY + 5, GOLD);

// face paint: red cheek stripes
for (let x = 40; x <= 43; x++) put(x, headY + 6, PAINT_R);
for (let x = 50; x <= 53; x++) put(x, headY + 6, PAINT_R);
for (let x = 40; x <= 42; x++) put(x, headY + 7, '#8f2f22');
for (let x = 51; x <= 53; x++) put(x, headY + 7, '#8f2f22');

// eyes
put(43, headY + 4, '#fdf6e6');
put(44, headY + 4, '#20140e');
put(50, headY + 4, '#fdf6e6');
put(51, headY + 4, '#20140e');
put(44, headY + 5, '#5a3a26');
put(51, headY + 5, '#5a3a26');
// brows
put(43, headY + 3, HAIR);
put(44, headY + 3, HAIR);
put(50, headY + 3, HAIR);
put(51, headY + 3, HAIR);
// nose
put(47, headY + 5, SKIN_S);
put(47, headY + 6, SKIN_S);
put(48, headY + 6, SKIN_D);
put(47, headY + 7, SKIN_D);
// mouth
put(46, headY + 8, '#6d3326');
put(47, headY + 8, '#6d3326');
put(48, headY + 8, '#6d3326');
// highlights
put(41, headY + 5, SKIN_L);
put(53, headY + 5, SKIN_L);

/* ------------------------------------------------------------------ */
/* Outline pass                                                        */
/* ------------------------------------------------------------------ */
characterPhase = false;
const outline = rgb('#050d08');
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (mask[y * W + x]) continue;
    const n =
      (x > 0 && mask[y * W + x - 1]) ||
      (x < W - 1 && mask[y * W + x + 1]) ||
      (y > 0 && mask[(y - 1) * W + x]) ||
      (y < H - 1 && mask[(y + 1) * W + x]);
    if (!n) continue;
    const i = (y * W + x) * 3;
    pixels[i] = Math.round(pixels[i] * 0.15 + outline[0] * 0.85);
    pixels[i + 1] = Math.round(pixels[i + 1] * 0.15 + outline[1] * 0.85);
    pixels[i + 2] = Math.round(pixels[i + 2] * 0.15 + outline[2] * 0.85);
  }
}

/* ------------------------------------------------------------------ */
/* Fireflies / atmosphere                                              */
/* ------------------------------------------------------------------ */
for (const [fx, fy] of [
  [12, 40],
  [84, 66],
  [70, 16],
  [22, 26],
  [90, 82],
  [8, 70],
]) {
  put(fx, fy, '#fff8d0');
  for (const [ox, oy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    put(fx + ox, fy + oy, '#f7e08a', 0.5);
  }
  for (const [ox, oy] of [
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
  ]) {
    put(fx + ox, fy + oy, '#f7e08a', 0.18);
  }
}

/* ------------------------------------------------------------------ */
/* PNG encoding                                                        */
/* ------------------------------------------------------------------ */
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
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const outW = W * SCALE;
const outH = H * SCALE;
const raw = Buffer.alloc(outH * (outW * 3 + 1));

for (let y = 0; y < outH; y++) {
  const rowStart = y * (outW * 3 + 1);
  raw[rowStart] = 0;
  const srcY = Math.floor(y / SCALE);
  for (let x = 0; x < outW; x++) {
    const srcX = Math.floor(x / SCALE);
    const si = (srcY * W + srcX) * 3;
    const di = rowStart + 1 + x * 3;
    raw[di] = pixels[si];
    raw[di + 1] = pixels[si + 1];
    raw[di + 2] = pixels[si + 2];
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(outW, 0);
ihdr.writeUInt32BE(outH, 4);
ihdr[8] = 8;
ihdr[9] = 2;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const outFile = path.resolve(process.argv[2] ?? 'domador-zarabatana.png');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, png);
console.log(`wrote ${outFile} (${outW}x${outH}, ${png.length} bytes)`);
