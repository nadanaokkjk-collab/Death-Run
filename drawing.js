// ============================================
// CAR SKINS & DRAWING UTILITIES
// ============================================
const SKINS = [
  { name: 'Vermelho', body: '#ef4444', detail: '#dc2626', roof: '#b91c1c', price: 0 },
  { name: 'Azul', body: '#3b82f6', detail: '#2563eb', roof: '#1d4ed8', price: 0 },
  { name: 'Verde', body: '#22c55e', detail: '#16a34a', roof: '#15803d', price: 50 },
  { name: 'Amarelo', body: '#eab308', detail: '#ca8a04', roof: '#a16207', price: 50 },
  { name: 'Roxo', body: '#a855f7', detail: '#9333ea', roof: '#7e22ce', price: 50 },
  { name: 'Rosa', body: '#ec4899', detail: '#db2777', roof: '#be185d', price: 50 },
  { name: 'Laranja', body: '#f97316', detail: '#ea580c', roof: '#c2410c', price: 50 },
  { name: 'Ciano', body: '#06b6d4', detail: '#0891b2', roof: '#0e7490', price: 50 },
  { name: 'Dourado', body: '#d4a017', detail: '#b8860b', roof: '#8b6914', price: 50 },
  { name: 'Prateado', body: '#94a3b8', detail: '#64748b', roof: '#475569', price: 50 },
  { name: 'Neon', body: '#39ff14', detail: '#00e676', roof: '#00c853', price: 50 },
  { name: 'Midnight', body: '#1e1b4b', detail: '#312e81', roof: '#3730a3', price: 50 },
];

const OBS_COLORS = [
  { body: '#64748b', detail: '#475569', roof: '#334155' },
  { body: '#f97316', detail: '#ea580c', roof: '#c2410c' },
  { body: '#06b6d4', detail: '#0891b2', roof: '#0e7490' },
  { body: '#84cc16', detail: '#65a30d', roof: '#4d7c0f' },
  { body: '#f43f5e', detail: '#e11d48', roof: '#be123c' },
];

function drawCar(ctx, x, y, w, h, colors, isPlayer) {
  ctx.save();
  ctx.translate(x, y);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, 3, 3, w, h, 6);

  // Body
  ctx.fillStyle = colors.body;
  roundRect(ctx, 0, 0, w, h, 6);

  // Roof / cabin
  ctx.fillStyle = colors.roof;
  roundRect(ctx, w * 0.15, h * 0.28, w * 0.7, h * 0.38, 4);

  // Windshields
  ctx.fillStyle = '#87ceeb';
  ctx.globalAlpha = 0.7;
  roundRect(ctx, w * 0.18, h * 0.22, w * 0.64, h * 0.12, 3);
  roundRect(ctx, w * 0.18, h * 0.6, w * 0.64, h * 0.12, 3);
  ctx.globalAlpha = 1;

  // Side details
  ctx.fillStyle = colors.detail;
  ctx.fillRect(0, h * 0.15, w * 0.08, h * 0.2);
  ctx.fillRect(w - w * 0.08, h * 0.15, w * 0.08, h * 0.2);
  ctx.fillRect(0, h * 0.65, w * 0.08, h * 0.2);
  ctx.fillRect(w - w * 0.08, h * 0.65, w * 0.08, h * 0.2);

  // Headlights / taillights
  if (isPlayer) {
    ctx.fillStyle = '#fef08a';
    roundRect(ctx, w * 0.1, -2, w * 0.2, 5, 2);
    roundRect(ctx, w * 0.7, -2, w * 0.2, 5, 2);
    ctx.fillStyle = '#ef4444';
    roundRect(ctx, w * 0.15, h - 3, w * 0.18, 4, 2);
    roundRect(ctx, w * 0.67, h - 3, w * 0.18, 4, 2);
  } else {
    ctx.fillStyle = '#ef4444';
    roundRect(ctx, w * 0.1, -2, w * 0.2, 4, 2);
    roundRect(ctx, w * 0.7, -2, w * 0.2, 4, 2);
    ctx.fillStyle = '#fef08a';
    roundRect(ctx, w * 0.15, h - 3, w * 0.18, 4, 2);
    roundRect(ctx, w * 0.67, h - 3, w * 0.18, 4, 2);
  }

  ctx.restore();
}

function drawCone(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(s / 2, 0);
  ctx.lineTo(s, s);
  ctx.lineTo(0, s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(s * 0.2, s * 0.5, s * 0.6, s * 0.15);
  ctx.fillStyle = '#374151';
  ctx.fillRect(s * 0.1, s * 0.85, s * 0.8, s * 0.15);
  ctx.restore();
}

function drawBarrier(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  const stripeW = w / 6;
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ef4444' : '#fff';
    ctx.fillRect(i * stripeW, 0, stripeW, h);
  }
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}

function drawCoinSprite(ctx, x, y, r, frame) {
  ctx.save();
  ctx.translate(x, y);
  const scaleX = Math.abs(Math.cos(frame * 0.05));
  ctx.scale(scaleX || 0.1, 1);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fbbf24';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f59e0b';
  ctx.font = `bold ${r}px Outfit`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, 1);
  ctx.restore();
}

function drawNitroPickup(ctx, x, y, r, frame) {
  ctx.save();
  ctx.translate(x, y);

  // Outer glow pulse
  const pulse = 0.8 + Math.sin(frame * 0.08) * 0.2;
  const glowR = r * 1.5 * pulse;
  const glow = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, glowR);
  glow.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
  glow.addColorStop(0.6, 'rgba(99, 102, 241, 0.2)');
  glow.addColorStop(1, 'rgba(99, 102, 241, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Circle background
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  const bg = ctx.createRadialGradient(0, -r * 0.3, 0, 0, 0, r);
  bg.addColorStop(0, '#60a5fa');
  bg.addColorStop(1, '#3b82f6');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = '#93c5fd';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Lightning bolt icon
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  const s = r * 0.5;
  ctx.moveTo(-s * 0.3, -s * 0.9);
  ctx.lineTo(s * 0.15, -s * 0.15);
  ctx.lineTo(-s * 0.05, -s * 0.15);
  ctx.lineTo(s * 0.3, s * 0.9);
  ctx.lineTo(-s * 0.15, s * 0.15);
  ctx.lineTo(s * 0.05, s * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Rotating sparkle ring
  const sparkleCount = 6;
  const rot = frame * 0.04;
  ctx.fillStyle = '#fef08a';
  for (let i = 0; i < sparkleCount; i++) {
    const angle = rot + (Math.PI * 2 / sparkleCount) * i;
    const sx = Math.cos(angle) * r * 0.85;
    const sy = Math.sin(angle) * r * 0.85;
    const sparkSize = 1.5 + Math.sin(frame * 0.1 + i) * 0.5;
    ctx.beginPath();
    ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}
