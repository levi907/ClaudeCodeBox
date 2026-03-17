// pixel-dungeon.js — renders the start screen dungeon scene as pixel art
// Canvas: 160×90 virtual pixels, CSS-scaled up with image-rendering:pixelated
(function () {
  'use strict';

  const canvas = document.getElementById('ds-canvas');
  if (!canvas) return;

  const W = 160, H = 90;
  canvas.width  = W;
  canvas.height = H;
  Object.assign(canvas.style, {
    position: 'absolute', inset: '0',
    width: '100%', height: '100%',
    imageRendering: 'pixelated',
    zIndex: '1',
  });

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // ── Palette ──────────────────────────────────────────────────────────────
  const P = {
    wallDk: '#0d0b09', wallBase: '#181614', wallMd: '#201e1c', wallLt: '#2c2826',
    flrDk:  '#090806', flrBase: '#161210', flrMd:  '#201c16', flrLt:  '#2c2820',
    archDk: '#1e1c18', archBase:'#2e2c28', archMd: '#3c3a36', archLt: '#4a4844', archHi: '#5c5a54',
    voidDk: '#050302',
    // Door wood — warm visible oak browns
    dDk:    '#2e1a06', dBase:   '#5c3412', dMd:    '#7a4a1a', dLt:    '#9c6428', dHi:    '#c07c38',
    mDk:    '#1a1206', mMd:     '#2c2010', mLt:    '#4a3820',
    // Lantern
    flmDim: '#5a2400', flmLow:  '#904010', flmMd:  '#c86820', flmHi:  '#eca030', flmTop: '#ffd050', flmTip: '#fff8d0',
  };

  // ── Geometry ─────────────────────────────────────────────────────────────
  const FLOOR_Y = 78;
  const CX      = 80;
  const AO_R    = 33;  // outer arch radius  → 33 × 5.625 ≈ 185px display
  const AI_R    = 24;  // inner arch radius  → 24 × 5.625 ≈ 135px display
  const STONE   = AO_R - AI_R;     // = 9 — uniform stone thickness all around
  const AO_H    = 56;              // outer arch height above floor
  const AI_H    = AO_H - STONE;   // = 47 — inner arch height
  const CCY     = FLOOR_Y - AO_H + AO_R;  // = 55 — shared circle centre

  // ── arch clip helper ─────────────────────────────────────────────────────
  function clipArch(r, h) {
    // r = radius, h = height above FLOOR_Y
    const cy = FLOOR_Y - h + r;
    ctx.beginPath();
    ctx.moveTo(CX - r, FLOOR_Y + 1);
    ctx.lineTo(CX - r, cy);
    ctx.arc(CX, cy, r, Math.PI, 0, false);
    ctx.lineTo(CX + r, FLOOR_Y + 1);
    ctx.closePath();
    ctx.clip();
  }

  // ── 1. STONE WALL TILES ──────────────────────────────────────────────────
  const TW = 14, TH = 7;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, FLOOR_Y + 1); ctx.clip();
  for (let row = -1; row * TH < FLOOR_Y + TH; row++) {
    const xOff = (row & 1) ? 7 : 0;
    for (let col = -1; col * TW - xOff < W + TW; col++) {
      const tx = col * TW - xOff, ty = row * TH;
      const tw = TW - 1, th = TH - 1;
      ctx.fillStyle = ((row + col) & 1) ? P.wallMd : P.wallBase;
      ctx.fillRect(tx, ty, tw, th);
      ctx.fillStyle = P.wallLt;
      ctx.fillRect(tx, ty, tw, 1);       // top lit
      ctx.fillRect(tx, ty, 1, th);       // left lit
      ctx.fillStyle = P.wallDk;
      ctx.fillRect(tx + tw - 1, ty, 1, th);  // right shadow
      ctx.fillRect(tx, ty + th - 1, tw, 1);  // bottom shadow
    }
    ctx.fillStyle = P.wallDk;
    ctx.fillRect(0, (row + 1) * TH - 1, W, 1);  // mortar line
  }
  ctx.restore();

  // ── 2. STONE FLOOR ───────────────────────────────────────────────────────
  const FW = 16, FH = 4;
  for (let row = 0; row * FH < H - FLOOR_Y + FH; row++) {
    const xOff = (row & 1) ? 8 : 0;
    for (let col = -1; col * FW - xOff < W + FW; col++) {
      const tx = col * FW - xOff, ty = FLOOR_Y + row * FH;
      if (ty >= H) continue;
      ctx.fillStyle = ((row + col) & 1) ? P.flrMd : P.flrBase;
      ctx.fillRect(tx, ty, FW - 1, Math.min(FH - 1, H - ty));
      ctx.fillStyle = P.flrLt;
      ctx.fillRect(tx, ty, FW - 1, 1);
    }
    ctx.fillStyle = P.flrDk;
    ctx.fillRect(0, FLOOR_Y + (row + 1) * FH - 1, W, 1);
  }

  // ── 3. ARCH STONE (outer − inner ring) ───────────────────────────────────
  ctx.save();
  // Clip to outer arch shape
  clipArch(AO_R, AO_H);
  // Fill with arch stone
  ctx.fillStyle = P.archMd;
  ctx.fillRect(CX - AO_R, CCY - AO_R, AO_R * 2, AO_H);
  // Radial shading: lighter crown, darker sides
  const archRad = ctx.createRadialGradient(CX, CCY - AO_R, 1, CX, CCY, AO_R + 4);
  archRad.addColorStop(0, 'rgba(120,115,105,0.52)');
  archRad.addColorStop(0.5,'rgba(30,28,25,0.08)');
  archRad.addColorStop(1, 'rgba(0,0,0,0.52)');
  ctx.fillStyle = archRad;
  ctx.fillRect(CX - AO_R, CCY - AO_R, AO_R * 2, AO_H);
  ctx.restore();

  // Erase the inner arch opening (cut the hole)
  ctx.save();
  clipArch(AI_R, AI_H);
  ctx.fillStyle = P.voidDk;
  ctx.fillRect(CX - AI_R - 1, CCY - AI_R - 1, AI_R * 2 + 2, AI_H + 2);
  ctx.restore();

  // Arch outline lines
  ctx.save();
  ctx.strokeStyle = P.archDk; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(CX - AO_R, FLOOR_Y + 1); ctx.lineTo(CX - AO_R, CCY);
  ctx.arc(CX, CCY, AO_R, Math.PI, 0, false);
  ctx.lineTo(CX + AO_R, FLOOR_Y + 1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.90)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX - AI_R, FLOOR_Y + 1); ctx.lineTo(CX - AI_R, CCY);
  ctx.arc(CX, CCY, AI_R, Math.PI, 0, false);
  ctx.lineTo(CX + AI_R, FLOOR_Y + 1);
  ctx.stroke();
  ctx.restore();

  // ── 4. WOODEN DOUBLE DOORS ───────────────────────────────────────────────
  ctx.save();
  clipArch(AI_R, AI_H);

  const DOOR_Y0 = FLOOR_Y - AI_H;  // = 31
  const PLANK   = 6;

  // Left door — planks mirror so centre edge is brightest
  for (let px = 0; px < AI_R; px++) {
    const pos = (AI_R - 1 - px) % PLANK;
    ctx.fillStyle = pos === 0 ? P.dDk : pos === 1 ? P.dHi : pos <= 4 ? P.dMd : P.dBase;
    ctx.fillRect(CX - AI_R + px, DOOR_Y0, 1, AI_H);
  }
  // Right door
  for (let px = 0; px < AI_R; px++) {
    const pos = px % PLANK;
    ctx.fillStyle = pos === 0 ? P.dDk : pos === 1 ? P.dHi : pos <= 4 ? P.dMd : P.dBase;
    ctx.fillRect(CX + px, DOOR_Y0, 1, AI_H);
  }

  // Horizontal crossbars
  const b1 = DOOR_Y0 + Math.floor(AI_H * 0.28);
  const b2 = DOOR_Y0 + Math.floor(AI_H * 0.63);
  [b1, b2].forEach(by => {
    ctx.fillStyle = P.dDk; ctx.fillRect(CX - AI_R, by,     AI_R * 2, 1);
    ctx.fillStyle = P.dLt; ctx.fillRect(CX - AI_R, by + 1, AI_R * 2, 2);
    ctx.fillStyle = P.dMd; ctx.fillRect(CX - AI_R, by + 3, AI_R * 2, 2);
    ctx.fillStyle = P.dDk; ctx.fillRect(CX - AI_R, by + 5, AI_R * 2, 1);
  });

  // Top shadow
  const topShd = ctx.createLinearGradient(0, DOOR_Y0, 0, DOOR_Y0 + 8);
  topShd.addColorStop(0, 'rgba(0,0,0,0.85)');
  topShd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topShd;
  ctx.fillRect(CX - AI_R, DOOR_Y0, AI_R * 2, 8);

  // Centre seam
  ctx.fillStyle = P.dDk;
  ctx.fillRect(CX - 1, DOOR_Y0, 2, AI_H);

  ctx.restore();

  // Door knocker (drawn outside clip so always visible)
  const KNOCK_Y = DOOR_Y0 + Math.floor(AI_H * 0.40);
  ctx.fillStyle = P.mDk;
  ctx.beginPath(); ctx.arc(CX, KNOCK_Y, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = P.mLt;
  ctx.beginPath(); ctx.arc(CX - 0.5, KNOCK_Y - 0.8, 1.2, 0, Math.PI * 2); ctx.fill();

  // ── 5. WALL LANTERNS ─────────────────────────────────────────────────────
  const LAN_Y = 50;
  const LAN_L = CX - AO_R - 16;   // x=31
  const LAN_R = CX + AO_R + 16;   // x=129

  function lantern(cx, cy) {
    // Warm glow — strong enough to be visible over the dark stone
    for (let r = 22; r >= 1; r--) {
      const frac = (22 - r) / 21;
      const a    = frac * frac * 0.50;   // quadratic fade
      ctx.fillStyle = `rgba(210,105,15,${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    // Metal bracket arm (extends toward wall)
    ctx.fillStyle = P.mDk;
    ctx.fillRect(cx - 2, cy + 4, 6, 2);
    // Lantern cage body
    ctx.fillStyle = P.flmDim; ctx.fillRect(cx - 2, cy - 2, 4, 7);  // dark body
    ctx.fillStyle = P.flmLow; ctx.fillRect(cx - 1, cy - 2, 2, 7);  // bright centre
    ctx.fillStyle = P.mDk;    ctx.fillRect(cx - 2, cy - 3, 4, 1);  // top cap
    ctx.fillStyle = P.mDk;    ctx.fillRect(cx - 2, cy + 5, 4, 1);  // bottom cap
    // Flame
    ctx.fillStyle = P.flmMd;  ctx.fillRect(cx - 1, cy - 5, 2, 2);
    ctx.fillStyle = P.flmHi;  ctx.fillRect(cx,     cy - 6, 1, 2);
    ctx.fillStyle = P.flmTop; ctx.fillRect(cx,     cy - 7, 1, 1);
    ctx.fillStyle = P.flmTip; ctx.fillRect(cx,     cy - 8, 1, 1);
  }

  lantern(LAN_L, LAN_Y);
  lantern(LAN_R, LAN_Y);

  // ── 6. VIGNETTE ──────────────────────────────────────────────────────────
  const vig = ctx.createRadialGradient(CX, H * 0.52, H * 0.08, CX, H * 0.52, H * 0.80);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

}());
