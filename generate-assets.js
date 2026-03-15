#!/usr/bin/env node
// ============================================================
//  SPELL SURVIVORS - Node.js PNG Asset Generator
//  Usage: node generate-assets.js
//  Requires: npm install canvas
// ============================================================

const path = require('path');
const fs = require('fs');

// Check if canvas is available
let createCanvas;
try {
  ({ createCanvas } = require('canvas'));
} catch (e) {
  console.error('canvas package not found. Install with: npm install canvas');
  console.log('\nAlternative: Open generate-assets.html in a browser to download sprites.');
  process.exit(1);
}

const ASSETS_DIR = path.join(__dirname, 'assets');
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR);

// ---- Mini implementations of sprite drawing functions ----
// (Mirrors the browser-side Sprites object for Node.js context)

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rng(min, max) { return Math.random() * (max - min) + min; }

function drawPlayer(ctx, x, y, facing, animFrame, flashTime) {
  const bob = Math.sin(animFrame * 0.15) * 1.5;

  // Shadow
  ctx.beginPath();
  ctx.ellipse(x, y + 11 + bob, 10, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();

  // Robe
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 2 + bob);
  ctx.quadraticCurveTo(x - 12, y + 8 + bob, x - 8, y + 13 + bob);
  ctx.lineTo(x + 8, y + 13 + bob);
  ctx.quadraticCurveTo(x + 12, y + 8 + bob, x + 10, y - 2 + bob);
  ctx.closePath();
  ctx.fillStyle = '#3a00a0';
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.ellipse(x, y + 1 + bob, 8, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#4a00c0';
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(x, y - 8 + bob, 7, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c8a0';
  ctx.fill();

  // Eye
  ctx.fillStyle = '#c050ff';
  ctx.beginPath();
  ctx.ellipse(x + 2.5, y - 9 + bob, 0.7, 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hat
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 12 + bob);
  ctx.lineTo(x + 8, y - 12 + bob);
  ctx.lineTo(x + 3, y - 24 + bob);
  ctx.lineTo(x - 3, y - 24 + bob);
  ctx.closePath();
  ctx.fillStyle = '#1a0060';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y - 12 + bob, 9, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#2a0090';
  ctx.fill();

  // Staff
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x + 9, y - 5 + bob);
  ctx.lineTo(x + 13, y + 13 + bob);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 9, y - 7 + bob, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#c050ff';
  ctx.shadowColor = '#c050ff';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawZombie(ctx, x, y, animFrame) {
  const bob = Math.sin(animFrame * 0.08) * 2;
  ctx.fillStyle = '#2d4a1e';
  ctx.fillRect(x - 7, y - 2 + bob, 14, 13);
  ctx.fillStyle = '#9ab060';
  ctx.fillRect(x - 6, y - 14 + bob, 12, 12);
  ctx.fillStyle = '#ff3030';
  ctx.beginPath(); ctx.ellipse(x - 2, y - 9 + bob, 2, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 2, y - 9 + bob, 2, 2.5, 0, 0, Math.PI*2); ctx.fill();
}

function drawBat(ctx, x, y, animFrame) {
  const wingFlap = Math.sin(animFrame * 0.25) * 0.6;
  const bob = Math.sin(animFrame * 0.15) * 3;
  ctx.fillStyle = '#4a0080';
  ctx.beginPath();
  ctx.moveTo(x, y + bob);
  ctx.bezierCurveTo(x - 5, y - 8 + bob, x - 18, y - 10 + bob, x - 20, y - 2 + bob);
  ctx.bezierCurveTo(x - 18, y + 4 + bob, x - 10, y + 2 + bob, x, y + 2 + bob);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y + bob);
  ctx.bezierCurveTo(x + 5, y - 8 + bob, x + 18, y - 10 + bob, x + 20, y - 2 + bob);
  ctx.bezierCurveTo(x + 18, y + 4 + bob, x + 10, y + 2 + bob, x, y + 2 + bob);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y + bob, 7, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#6a20a0';
  ctx.fill();
  ctx.fillStyle = '#ff6060';
  ctx.beginPath(); ctx.arc(x - 2.5, y - 1 + bob, 2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 2.5, y - 1 + bob, 2, 0, Math.PI*2); ctx.fill();
}

function drawXPOrb(ctx, x, y, size, frame) {
  const pulse = Math.sin(frame * 0.2) * 0.15 + 1;
  ctx.shadowColor = '#40ff80';
  ctx.shadowBlur = 10;
  const grad = ctx.createRadialGradient(x - size*0.2, y - size*0.2, 0, x, y, size * pulse);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.4, '#80ffaa');
  grad.addColorStop(1, 'rgba(0,200,80,0)');
  ctx.beginPath();
  ctx.arc(x, y, size * pulse, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawHeart(ctx, x, y, size, frame) {
  const pulse = 1 + Math.sin(frame * 0.2) * 0.08;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#ff3060';
  ctx.shadowColor = '#ff3060';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.3);
  ctx.bezierCurveTo(-size * 0.6, -size * 0.4, -size * 1.2, size * 0.1, 0, size);
  ctx.bezierCurveTo(size * 1.2, size * 0.1, size * 0.6, -size * 0.4, 0, size * 0.3);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ---- Sprite sheet definitions ----
const ASSETS = [
  {
    name: 'player',
    w: 64, h: 64, frames: 8,
    draw(ctx, frame) {
      ctx.clearRect(0, 0, 64, 64);
      drawPlayer(ctx, 32, 36, 1, frame * 8, 0);
    }
  },
  {
    name: 'zombie',
    w: 48, h: 64, frames: 6,
    draw(ctx, frame) {
      ctx.clearRect(0, 0, 48, 64);
      drawZombie(ctx, 24, 36, frame * 10);
    }
  },
  {
    name: 'bat',
    w: 56, h: 40, frames: 6,
    draw(ctx, frame) {
      ctx.clearRect(0, 0, 56, 40);
      drawBat(ctx, 28, 20, frame * 4);
    }
  },
  {
    name: 'xp_orb',
    w: 16, h: 16, frames: 4,
    draw(ctx, frame) {
      ctx.clearRect(0, 0, 16, 16);
      drawXPOrb(ctx, 8, 8, 5, frame * 15);
    }
  },
  {
    name: 'heart',
    w: 24, h: 24, frames: 4,
    draw(ctx, frame) {
      ctx.clearRect(0, 0, 24, 24);
      drawHeart(ctx, 12, 8, 8, frame * 15);
    }
  },
  // Tileset
  {
    name: 'tile_floor',
    w: 64, h: 64, frames: 1,
    draw(ctx, frame) {
      // Dark stone floor tile
      ctx.fillStyle = '#0d0020';
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = 'rgba(80,0,120,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, 64, 64);
      // Subtle texture
      for (let i = 0; i < 8; i++) {
        const rx = Math.floor(Math.random() * 60) + 2;
        const ry = Math.floor(Math.random() * 60) + 2;
        ctx.fillStyle = `rgba(60,0,90,${Math.random() * 0.15})`;
        ctx.fillRect(rx, ry, 2, 2);
      }
    }
  },
];

// Generate sprite sheets
let generated = 0;
for (const asset of ASSETS) {
  const sheetW = asset.w * asset.frames;
  const sheetH = asset.h;
  const sheet = createCanvas(sheetW, sheetH);
  const sCtx = sheet.getContext('2d');

  for (let f = 0; f < asset.frames; f++) {
    const fc = createCanvas(asset.w, asset.h);
    const fCtx = fc.getContext('2d');
    asset.draw(fCtx, f);
    sCtx.drawImage(fc, f * asset.w, 0);
  }

  const outPath = path.join(ASSETS_DIR, `${asset.name}.png`);
  const buf = sheet.toBuffer('image/png');
  fs.writeFileSync(outPath, buf);
  console.log(`✓ Generated: assets/${asset.name}.png (${sheetW}x${sheetH}, ${asset.frames} frame${asset.frames > 1 ? 's' : ''})`);
  generated++;
}

console.log(`\n✅ Generated ${generated} PNG sprite sheets in ./assets/`);
