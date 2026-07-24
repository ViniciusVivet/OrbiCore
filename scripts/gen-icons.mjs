// Gera os ícones PWA do OrbiCore (orbe cyan sobre navy) sem dependências externas.
// Uso: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(OUT, { recursive: true });

// ---- CRC32 / PNG encoder ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---- Desenho ----
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

const BG_TOP = [9, 15, 27];
const BG_BOT = [15, 28, 47];
const CYAN = [46, 212, 219];
const BLUE = [70, 150, 240];
const LIGHT = [150, 240, 244];

// coverage de uma amostra (u,v em 0..1) — retorna [r,g,b,a] 0..255
function sample(u, v, { scale, rounded }) {
  // fundo
  let col = mix(BG_TOP, BG_BOT, clamp01(v));
  let alpha = 1;

  if (rounded) {
    // canto arredondado com transparência fora
    const rr = 0.185;
    const dx = Math.max(Math.abs(u - 0.5) - (0.5 - rr), 0);
    const dy = Math.max(Math.abs(v - 0.5) - (0.5 - rr), 0);
    const d = Math.sqrt(dx * dx + dy * dy);
    alpha = clamp01((rr - d) / 0.01 + 0.5);
    if (alpha <= 0) return [0, 0, 0, 0];
  }

  // coordenadas centradas + escala do miolo
  const cx = (u - 0.5) / scale;
  const cy = (v - 0.5) / scale;

  // órbita (elipse rotacionada -22°)
  const ang = (-22 * Math.PI) / 180;
  const rx0 = Math.cos(ang) * cx - Math.sin(ang) * cy;
  const ry0 = Math.sin(ang) * cx + Math.cos(ang) * cy;
  const RX = 0.34, RY = 0.148;
  const dEll = Math.sqrt((rx0 / RX) ** 2 + (ry0 / RY) ** 2);
  const ringHalf = 0.085;
  const ringCov = clamp01((ringHalf - Math.abs(dEll - 1)) / 0.05);
  if (ringCov > 0) {
    const ringCol = mix(BLUE, CYAN, clamp01((rx0 / RX + 1) / 2));
    col = mix(col, ringCol, ringCov);
  }

  // planeta central (cobre o segmento da órbita que passa atrás)
  const rp = Math.sqrt(cx * cx + cy * cy);
  const planetR = 0.134;
  const planetCov = clamp01((planetR - rp) / 0.012);
  if (planetCov > 0) {
    // leve highlight radial
    const hx = cx + 0.05, hy = cy + 0.05;
    const hl = clamp01(1 - Math.sqrt(hx * hx + hy * hy) / planetR);
    const planetCol = mix(CYAN, LIGHT, hl * 0.5);
    col = mix(col, planetCol, planetCov);
  }

  // satélite na frente da órbita (canto inferior direito)
  const st = 0.35 * Math.PI; // posição no parâmetro da elipse
  const sxE = RX * Math.cos(st), syE = RY * Math.sin(st);
  const sX = Math.cos(-ang) * sxE - Math.sin(-ang) * syE;
  const sY = Math.sin(-ang) * sxE + Math.cos(-ang) * syE;
  const ds = Math.sqrt((cx - sX) ** 2 + (cy - sY) ** 2);
  const satCov = clamp01((0.052 - ds) / 0.012);
  if (satCov > 0) col = mix(col, LIGHT, satCov);

  return [col[0], col[1], col[2], Math.round(alpha * 255)];
}

function render(size, opts) {
  const rgba = Buffer.alloc(size * size * 4);
  const SS = 3; // supersampling
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          const s = sample(u, v, opts);
          const sa = s[3] / 255;
          r += s[0] * sa; g += s[1] * sa; b += s[2] * sa; a += sa;
        }
      }
      const n = SS * SS;
      const aAvg = a / n;
      const i = (y * size + x) * 4;
      if (aAvg <= 0) { rgba[i] = rgba[i + 1] = rgba[i + 2] = rgba[i + 3] = 0; continue; }
      rgba[i] = Math.round(r / a);
      rgba[i + 1] = Math.round(g / a);
      rgba[i + 2] = Math.round(b / a);
      rgba[i + 3] = Math.round(aAvg * 255);
    }
  }
  return encodePNG(size, size, rgba);
}

const targets = [
  { file: "icon-192.png", size: 192, opts: { scale: 1, rounded: true } },
  { file: "icon-512.png", size: 512, opts: { scale: 1, rounded: true } },
  { file: "icon-maskable-512.png", size: 512, opts: { scale: 0.78, rounded: false } },
  { file: "apple-touch-icon.png", size: 180, opts: { scale: 0.92, rounded: false } },
];

for (const t of targets) {
  writeFileSync(join(OUT, t.file), render(t.size, t.opts));
  console.log("wrote", t.file);
}

// Imagem de compartilhamento (Open Graph / Twitter) 1200x630, órbita centralizada.
{
  const W = 1200, H = 630, SS = 2;
  const rgba = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = ((x + (sx + 0.5) / SS) - (W - H) / 2) / H;
          const v = (y + (sy + 0.5) / SS) / H;
          const s = sample(u, v, { scale: 0.58, rounded: false });
          r += s[0]; g += s[1]; b += s[2];
        }
      }
      const n = SS * SS, i = (y * W + x) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = 255;
    }
  }
  writeFileSync(join(OUT, "og-image.png"), encodePNG(W, H, rgba));
  console.log("wrote og-image.png");
}
console.log("done");
