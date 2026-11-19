// Generates the two studio environment maps used by the 3D scenes (equirectangular Radiance .hdr, RLE).
// Fully procedural → no third-party assets, no licensing questions, works offline.
//   night lab: blue-black room, cool overhead softbox, amber accent strip, faint rim light
//   notebook day: warm paper-white room, big window softbox, soft graphite floor
import { writeFileSync, mkdirSync } from 'node:fs';

const W = 1024;
const H = 512;

const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** soft rectangle in (azimuth, polar) degrees */
function box(az, pol, cAz, cPol, wAz, hPol, soft) {
  let d = az - cAz;
  d = ((d + 540) % 360) - 180;
  const x = 1 - smooth(wAz / 2 - soft, wAz / 2 + soft, Math.abs(d));
  const y = 1 - smooth(hPol / 2 - soft, hPol / 2 + soft, Math.abs(pol - cPol));
  return x * y;
}

const presets = {
  'lab-night': (az, pol) => {
    const up = Math.cos((pol * Math.PI) / 180); // 1 zenith … −1 nadir
    let c = mix([0.006, 0.009, 0.02], [0.03, 0.045, 0.085], smooth(-0.2, 0.9, up));
    c = mix(c, [0.004, 0.005, 0.009], smooth(0, -0.6, up)); // dark floor
    const add = (col, k) => (c = c.map((v, i) => v + col[i] * k));
    add([2.6, 3.0, 4.2], box(az, pol, 0, 18, 90, 22, 6)); // overhead cool softbox
    add([5.5, 3.2, 1.1], box(az, pol, 110, 78, 10, 46, 3)); // amber accent strip
    add([1.2, 1.6, 2.6], box(az, pol, -140, 70, 34, 50, 10)); // rim
    add([0.5, 0.65, 1.0], box(az, pol, 200, 40, 60, 18, 12)); // fill
    return c;
  },
  'notebook-day': (az, pol) => {
    const up = Math.cos((pol * Math.PI) / 180);
    let c = mix([0.62, 0.56, 0.48], [1.05, 1.0, 0.92], smooth(-0.1, 0.9, up));
    c = mix(c, [0.28, 0.26, 0.24], smooth(0, -0.7, up));
    const add = (col, k) => (c = c.map((v, i) => v + col[i] * k));
    add([4.2, 4.0, 3.6], box(az, pol, -30, 55, 70, 50, 8)); // big window
    add([2.0, 1.9, 1.7], box(az, pol, 0, 12, 100, 18, 10)); // ceiling bounce
    add([0.9, 0.7, 0.45], box(az, pol, 140, 85, 40, 30, 14)); // warm wall bounce
    return c;
  },
};

function rgbe([r, g, b]) {
  const v = Math.max(r, g, b);
  if (v < 1e-32) return [0, 0, 0, 0];
  const e = Math.ceil(Math.log2(v + 1e-30));
  let s = 256 / 2 ** e;
  if (v * s >= 256) s /= 2;
  const ee = Math.round(Math.log2(256 / s));
  return [Math.floor(r * s), Math.floor(g * s), Math.floor(b * s), ee + 128];
}

function rleChannel(bytes) {
  const out = [];
  let i = 0;
  while (i < bytes.length) {
    let run = 1;
    while (i + run < bytes.length && bytes[i + run] === bytes[i] && run < 127) run++;
    if (run > 2) {
      out.push(128 + run, bytes[i]);
      i += run;
    } else {
      const start = i;
      let n = 0;
      while (i < bytes.length && n < 128) {
        let r = 1;
        while (i + r < bytes.length && bytes[i + r] === bytes[i] && r < 3) r++;
        if (r > 2) break;
        i++;
        n++;
      }
      out.push(n, ...bytes.slice(start, start + n));
    }
  }
  return out;
}

mkdirSync('public/hdr', { recursive: true });
for (const [name, fn] of Object.entries(presets)) {
  const header = `#?RADIANCE\n# Spooky procedural studio: ${name}\nFORMAT=32-bit_rle_rgbe\n\n-Y ${H} +X ${W}\n`;
  const chunks = [Buffer.from(header, 'ascii')];
  for (let y = 0; y < H; y++) {
    const pol = ((y + 0.5) / H) * 180;
    const ch = [[], [], [], []];
    for (let x = 0; x < W; x++) {
      const az = ((x + 0.5) / W) * 360 - 180;
      const p = rgbe(fn(az, pol));
      for (let k = 0; k < 4; k++) ch[k].push(p[k]);
    }
    const line = [2, 2, (W >> 8) & 0xff, W & 0xff];
    for (let k = 0; k < 4; k++) line.push(...rleChannel(ch[k]));
    chunks.push(Buffer.from(line));
  }
  const buf = Buffer.concat(chunks);
  writeFileSync(`public/hdr/${name}.hdr`, buf);
  console.log(`${name}.hdr ${(buf.length / 1024).toFixed(0)} KiB`);
}
