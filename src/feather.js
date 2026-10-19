// one large peacock feather drawn in code: quill at the TOP, iridescent eye at the BOTTOM (hangs naturally)
let url;
export function featherURL() {
  if (url) return url;
  const W = 360, H = 1080, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const cx = W / 2, sx = y => cx + Math.sin(y / 330) * 16;     // gently curved shaft
  const y0 = 24, y1 = 1020, ey = 790, ex = sx(ey), rx = 92, ry = 124;
  const R = (a, b) => a + Math.random() * (b - a);
  g.lineCap = 'round';

  // long, wispy golden hairs
  for (let i = 0; i < 240; i++) {
    const y = R(70, 900), s = Math.random() < .5 ? -1 : 1, l = R(90, 190), x = sx(y);
    g.strokeStyle = `hsla(${R(42, 62)},80%,${R(52, 66)}%,${R(.25, .5)})`; g.lineWidth = R(.6, 1.1);
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + s * l * .5, y + l * .1, x + s * l, y + l * R(.4, .75)); g.stroke();
  }
  // the vane: thousands of fine barbs, gold near the quill -> emerald -> teal near the eye
  for (let i = 0; i < 1300; i++) {
    const y = y0 + 36 + (y1 - y0 - 36) * (i / 1300), u = (y - y0) / (y1 - y0), x = sx(y);
    const len = 16 + 120 * Math.pow(Math.sin(Math.PI * Math.min(u * 1.02, 1)), .7);
    const hue = 46 + Math.min(u / .75, 1) * 108;
    for (const s of [-1, 1]) {
      const l = len * R(.82, 1.12);
      g.strokeStyle = `hsla(${hue + R(-10, 10)},${R(55, 78)}%,${R(30, 50)}%,${R(.5, .8)})`;
      g.lineWidth = R(.9, 1.7);
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + s * l * .55, y + l * .1, x + s * l, y + l * R(.4, .6)); g.stroke();
    }
  }
  // the quill
  const q = g.createLinearGradient(0, y0, 0, y1);
  q.addColorStop(0, '#e9d08a'); q.addColorStop(.5, '#b98a3a'); q.addColorStop(1, '#7a5a1c');
  g.strokeStyle = q; g.lineWidth = 3.4;
  g.beginPath(); g.moveTo(sx(0), 0); for (let y = 0; y <= y1; y += 8) g.lineTo(sx(y), y); g.stroke();

  // the eye
  g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
  const E = (k, fill, dy = 0, dx = 0) => { g.fillStyle = fill; g.beginPath(); g.ellipse(ex + dx, ey + dy, rx * k, ry * k, 0, 0, Math.PI * 2); g.fill(); };
  const rim = g.createRadialGradient(ex, ey, ry * .5, ex, ey, ry);
  rim.addColorStop(0, '#2f9a4a'); rim.addColorStop(1, '#a6d93c');
  E(1.04, rim);
  g.restore();
  E(.93, '#b5651d');
  const gold = g.createRadialGradient(ex, ey - 14, 6, ex, ey, ry * .86);
  gold.addColorStop(0, '#f1cf6a'); gold.addColorStop(1, '#bd8a2a');
  E(.86, gold);
  g.lineWidth = 1.1;                                            // fine radial strands in the gold ring
  for (let i = 0; i < 120; i++) {
    const a = i / 120 * Math.PI * 2;
    g.strokeStyle = `rgba(${i % 2 ? '255,236,160' : '140,86,24'},.45)`;
    g.beginPath(); g.moveTo(ex + Math.cos(a) * rx * .62, ey + Math.sin(a) * ry * .62);
    g.lineTo(ex + Math.cos(a) * rx * .84, ey + Math.sin(a) * ry * .84); g.stroke();
  }
  const cy = g.createRadialGradient(ex, ey + 8, 4, ex, ey + 8, ry * .6);
  cy.addColorStop(0, '#59d4f2'); cy.addColorStop(1, '#1b9fd4');
  E(.6, cy, 8);
  E(.42, '#1c33b4', 12);
  E(.27, '#0a1566', 5);
  g.fillStyle = 'rgba(160,230,255,.55)'; g.beginPath();
  g.ellipse(ex - rx * .22, ey - ry * .02, rx * .09, ry * .15, -.4, 0, Math.PI * 2); g.fill();

  return (url = c.toDataURL('image/webp', .92));               // smaller than PNG (falls back to PNG on old Safari)
}