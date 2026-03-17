// ============================================================
//  SPELL SURVIVORS - Procedural Sprite Generation
//  Fantasy dark-arcane aesthetic — all canvas 2D, no images
// ============================================================

const Sprites = {
  _cache: {},

  _make(w, h, drawFn) {
    const key = drawFn.name + w + h;
    if (this._cache[key]) return this._cache[key];
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    drawFn(ctx, w, h);
    this._cache[key] = c;
    return c;
  },

  // ======================================================
  //  PLAYER — The Gaunt Wanderer
  //  Lean elder wizard: layered robes, visible boots & beard,
  //  enormous bent hat, gnarled staff with bound crystal.
  // ======================================================
  player(ctx, x, y, facing, animFrame, flashTime) {
    ctx.save();
    ctx.translate(x, y);
    if (facing < 0) ctx.scale(-1, 1);

    // P = 1 canvas pixel at PIXEL_SCALE=4  (each art pixel = P×P game units = 4×4 display px)
    const P  = 4;
    // Pixel-art walk bob: alternates 0 / -1 pixel every 8 frames
    const bob = (Math.floor(animFrame / 8) & 1) ? 0 : -P;
    const fl  = flashTime > 0;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(-3*P, P + bob, 6*P, P);

    // Colour palette
    const H = '#2e2820';  // hat body  (warm dark — distinct from floor)
    const h = '#1e1a14';  // hat brim  (slightly lighter than stone)
    const S = '#c09050';  // skin
    const E = '#a050f0';  // arcane eye (bright purple)
    const G = '#706050';  // beard / grey
    const R = '#3a3830';  // robe main
    const D = '#282624';  // robe shadow panels
    const T = '#4a2c0c';  // staff wood
    const C = '#e060ff';  // crystal tip (bright)
    const B = '#302618';  // boots      (warm dark brown)
    const _ = null;

    // 8-wide × 13-row pixel art sprite.
    // xOff = -4  → col 0 starts at x = -16, col 7 ends at x = +16
    // yOff = -13 → row 0 (hat tip) at y = -52, row 12 bottom at y = 0 (feet)
    const sprite = [
    //  0    1    2    3    4    5    6    7
      [ _,   _,   _,   H,   H,   _,   _,   _ ],  //  0  hat tip
      [ _,   _,   H,   H,   H,   H,   _,   _ ],  //  1  hat
      [ _,   H,   H,   H,   H,   H,   H,   _ ],  //  2  hat
      [ h,   h,   h,   h,   h,   h,   h,   h ],  //  3  hat brim
      [ _,   _,   S,   S,   S,   S,   _,   C ],  //  4  face + crystal
      [ _,   _,   G,   S,   E,   S,   _,   T ],  //  5  eye + staff
      [ _,   _,   G,   G,   S,   _,   _,   T ],  //  6  beard + staff
      [ _,   D,   R,   R,   R,   R,   D,   T ],  //  7  shoulders
      [ _,   D,   R,   R,   R,   R,   _,   T ],  //  8  torso
      [ _,   D,   R,   R,   R,   D,   _,   T ],  //  9  lower torso
      [ _,   _,   D,   R,   R,   D,   _,   _ ],  // 10  robe hem
      [ _,   B,   _,   _,   _,   B,   _,   _ ],  // 11  boot tops
      [ B,   B,   _,   _,   B,   B,   _,   _ ],  // 12  boots
    ];

    const ROWS = sprite.length, COLS = 8;
    const xOff = -4, yOff = -13;

    if (fl) {
      // Flash white: just fill the bounding box
      for (let row = 0; row < ROWS; row++)
        for (let col = 0; col < COLS; col++)
          if (sprite[row][col]) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect((col+xOff)*P, (row+yOff)*P+bob, P, P);
          }
    } else {
      // Pass 1: 8-connected black outline — draws outline pixels around the sprite
      ctx.fillStyle = '#080808';
      for (let row = -1; row <= ROWS; row++) {
        for (let col = -1; col <= COLS; col++) {
          // Skip if this position is itself a sprite pixel
          if (row >= 0 && row < ROWS && col >= 0 && col < COLS && sprite[row][col]) continue;
          // Check whether any 8-connected neighbour is a sprite pixel
          let hit = false;
          for (let dr = -1; dr <= 1 && !hit; dr++)
            for (let dc = -1; dc <= 1 && !hit; dc++) {
              const nr = row+dr, nc = col+dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && sprite[nr][nc]) hit = true;
            }
          if (hit) ctx.fillRect((col+xOff)*P, (row+yOff)*P+bob, P, P);
        }
      }
      // Pass 2: sprite pixels
      for (let row = 0; row < ROWS; row++)
        for (let col = 0; col < COLS; col++) {
          const c = sprite[row][col];
          if (c) { ctx.fillStyle = c; ctx.fillRect((col+xOff)*P, (row+yOff)*P+bob, P, P); }
        }
    }

    ctx.restore();
  },

  // ======================================================
  //  ENEMY: Risen — undead skeleton warrior
  // ======================================================
  enemyZombie(ctx, x, y, animFrame) {
    ctx.save();
    ctx.translate(x, y);
    const bob = Math.sin(animFrame * 0.08) * 2;
    const tilt = Math.sin(animFrame * 0.08) * 0.12;
    ctx.rotate(tilt);

    // Ground shadow
    ctx.beginPath();
    ctx.ellipse(0, 12, 9, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // Tattered burial shroud (ragged lower hem)
    ctx.fillStyle = '#2a1e30';
    ctx.beginPath();
    ctx.moveTo(-8, 0 + bob);
    ctx.lineTo(-10, 13 + bob);
    ctx.lineTo(-6, 11 + bob);
    ctx.lineTo(-3, 14 + bob);
    ctx.lineTo(0, 11 + bob);
    ctx.lineTo(3, 14 + bob);
    ctx.lineTo(6, 11 + bob);
    ctx.lineTo(10, 13 + bob);
    ctx.lineTo(8, 0 + bob);
    ctx.closePath();
    ctx.fill();

    // Ribcage bones
    ctx.strokeStyle = '#c8c0b0';
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';
    // Spine
    ctx.beginPath();
    ctx.moveTo(0, -2 + bob); ctx.lineTo(0, 6 + bob);
    ctx.stroke();
    // Three pairs of ribs
    for (let r = 0; r < 3; r++) {
      const ry = -1 + r * 2.8 + bob;
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.bezierCurveTo(5, ry - 1, 8, ry + 1.5, 6.5, ry + 3.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.bezierCurveTo(-5, ry - 1, -8, ry + 1.5, -6.5, ry + 3.5);
      ctx.stroke();
    }

    // Arms — bone-jointed
    ctx.strokeStyle = '#c8c0b0';
    ctx.lineWidth = 2.5;
    // Left arm (reaching outward)
    ctx.beginPath();
    ctx.moveTo(-6, 1 + bob);
    ctx.lineTo(-13, -4 + bob);
    ctx.lineTo(-17, 3 + bob);
    ctx.stroke();
    // Right arm
    ctx.beginPath();
    ctx.moveTo(6, 1 + bob);
    ctx.lineTo(13, -4 + bob);
    ctx.lineTo(17, 3 + bob);
    ctx.stroke();
    // Finger claws
    ctx.lineWidth = 1;
    for (let f = -2; f <= 2; f += 2) {
      ctx.beginPath();
      ctx.moveTo(-17 + f * 0.5, 3 + bob);
      ctx.lineTo(-20 + f, 6 + bob);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(17 + f * 0.5, 3 + bob);
      ctx.lineTo(20 + f, 6 + bob);
      ctx.stroke();
    }

    // Skull
    ctx.fillStyle = '#d0c8b8';
    ctx.beginPath();
    ctx.ellipse(0, -11 + bob, 7.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a09888';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Cheekbones (slight protrusion)
    ctx.fillStyle = '#b8b0a0';
    ctx.beginPath();
    ctx.ellipse(-5, -8 + bob, 2.5, 1.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5, -8 + bob, 2.5, 1.5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Jaw
    ctx.fillStyle = '#c0b8a8';
    ctx.beginPath();
    ctx.moveTo(-5, -5 + bob);
    ctx.lineTo(-5, -2 + bob);
    ctx.quadraticCurveTo(0, -0.5 + bob, 5, -2 + bob);
    ctx.lineTo(5, -5 + bob);
    ctx.closePath();
    ctx.fill();

    // Teeth
    ctx.fillStyle = '#e0d8c8';
    for (let t = -3.5; t <= 3.5; t += 1.8) {
      ctx.beginPath();
      ctx.rect(t - 0.7, -4.5 + bob, 1.4, 2.5);
      ctx.fill();
    }

    // Eye sockets (deep black)
    ctx.fillStyle = '#0a0608';
    ctx.beginPath(); ctx.ellipse(-2.5, -12 + bob, 3, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2.5, -12 + bob, 3, 3.2, 0, 0, Math.PI * 2); ctx.fill();

    // Void-red eyes in sockets
    ctx.fillStyle = '#dd1010';
    
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(-2.5, -12 + bob, 1.6, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2.5, -12 + bob, 1.6, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  },

  // ======================================================
  //  ENEMY: Shadow Bat
  // ======================================================
  enemyBat(ctx, x, y, animFrame) {
    ctx.save();
    ctx.translate(x, y);
    const wingFlap = Math.sin(animFrame * 0.28) * 0.7;
    const bob = Math.sin(animFrame * 0.15) * 3;

    // Left wing
    ctx.save();
    ctx.rotate(-wingFlap);
    ctx.fillStyle = '#20003a';
    ctx.beginPath();
    ctx.moveTo(-1, 0 + bob);
    ctx.bezierCurveTo(-3, -7 + bob, -14, -13 + bob, -23, -5 + bob);
    ctx.bezierCurveTo(-21, 2 + bob, -12, 3 + bob, -7, 2 + bob);
    ctx.bezierCurveTo(-4, 1 + bob, -2, 2 + bob, -1, 2 + bob);
    ctx.closePath();
    ctx.fill();
    // Void tears in wing membrane
    ctx.strokeStyle = 'rgba(100,0,180,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-8, -6 + bob); ctx.lineTo(-15, -4 + bob);
    ctx.moveTo(-5, -3 + bob); ctx.lineTo(-10, 0 + bob);
    ctx.stroke();
    ctx.restore();

    // Right wing
    ctx.save();
    ctx.rotate(wingFlap);
    ctx.fillStyle = '#20003a';
    ctx.beginPath();
    ctx.moveTo(1, 0 + bob);
    ctx.bezierCurveTo(3, -7 + bob, 14, -13 + bob, 23, -5 + bob);
    ctx.bezierCurveTo(21, 2 + bob, 12, 3 + bob, 7, 2 + bob);
    ctx.bezierCurveTo(4, 1 + bob, 2, 2 + bob, 1, 2 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,0,180,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(8, -6 + bob); ctx.lineTo(15, -4 + bob);
    ctx.moveTo(5, -3 + bob); ctx.lineTo(10, 0 + bob);
    ctx.stroke();
    ctx.restore();

    // Body
    ctx.fillStyle = '#500890';
    ctx.beginPath();
    ctx.ellipse(0, 0 + bob, 7.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pointed ears
    ctx.fillStyle = '#300058';
    ctx.beginPath();
    ctx.moveTo(-4, -5 + bob); ctx.lineTo(-7, -13 + bob); ctx.lineTo(-1, -5.5 + bob);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, -5 + bob); ctx.lineTo(7, -13 + bob); ctx.lineTo(1, -5.5 + bob);
    ctx.closePath(); ctx.fill();
    // Inner ear
    ctx.fillStyle = '#60009a';
    ctx.beginPath();
    ctx.moveTo(-3.5, -5 + bob); ctx.lineTo(-6, -11 + bob); ctx.lineTo(-1.5, -5.8 + bob);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3.5, -5 + bob); ctx.lineTo(6, -11 + bob); ctx.lineTo(1.5, -5.8 + bob);
    ctx.closePath(); ctx.fill();

    // Pale eyes
    ctx.fillStyle = '#d8f8ff';
    
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(-2.5, -1.5 + bob, 2.4, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2.5, -1.5 + bob, 2.4, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Slit pupils
    ctx.fillStyle = '#060310';
    ctx.beginPath(); ctx.ellipse(-2.5, -1.5 + bob, 0.8, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2.5, -1.5 + bob, 0.8, 1.6, 0, 0, Math.PI * 2); ctx.fill();

    // Fangs
    ctx.fillStyle = '#f0eeff';
    ctx.beginPath();
    ctx.moveTo(-2.5, 3 + bob); ctx.lineTo(-1.5, 7 + bob); ctx.lineTo(-0.2, 3 + bob);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2.5, 3 + bob); ctx.lineTo(1.5, 7 + bob); ctx.lineTo(0.2, 3 + bob);
    ctx.closePath(); ctx.fill();

    ctx.restore();
  },

  // ======================================================
  //  ENEMY: Arcane Stone Golem
  // ======================================================
  enemyGolem(ctx, x, y, animFrame) {
    ctx.save();
    ctx.translate(x, y);
    const bob = Math.sin(animFrame * 0.05) * 1;
    const runeGlow = 0.6 + Math.sin(animFrame * 0.08) * 0.3;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(0, 17, 15, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();

    // Legs
    ctx.fillStyle = '#484060';
    ctx.strokeStyle = '#28203a';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(-11, 9 + bob, 9, 9); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(2, 9 + bob, 9, 9); ctx.fill(); ctx.stroke();
    // Boot detail
    ctx.fillStyle = '#383050';
    ctx.beginPath(); ctx.rect(-12, 15 + bob, 10, 4); ctx.fill();
    ctx.beginPath(); ctx.rect(1, 15 + bob, 10, 4); ctx.fill();

    // Body — stone block with chiseled edges
    ctx.fillStyle = '#585070';
    ctx.beginPath();
    ctx.moveTo(-12, -8 + bob);
    ctx.lineTo(12, -8 + bob);
    ctx.lineTo(13, 9 + bob);
    ctx.lineTo(-13, 9 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#302840';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Body stone segment lines
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-13, -1 + bob); ctx.lineTo(13, -1 + bob);
    ctx.moveTo(-13, 5 + bob); ctx.lineTo(13, 5 + bob);
    ctx.stroke();

    // Chest arcane circle rune
    ctx.strokeStyle = `rgba(255,150,50,${runeGlow})`;
    
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -1 + bob, 5.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -6.5 + bob); ctx.lineTo(0, 4.5 + bob);
    ctx.moveTo(-5.5, -1 + bob); ctx.lineTo(5.5, -1 + bob);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Arms — massive stone slabs
    ctx.fillStyle = '#504868';
    ctx.strokeStyle = '#302840';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(-23, -7 + bob, 11, 14); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(12, -7 + bob, 11, 14); ctx.fill(); ctx.stroke();
    // Fist
    ctx.fillStyle = '#403860';
    ctx.beginPath(); ctx.rect(-25, -3 + bob, 5, 6); ctx.fill();
    ctx.beginPath(); ctx.rect(20, -3 + bob, 5, 6); ctx.fill();
    // Knuckle lines
    ctx.strokeStyle = '#28203a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-25, -1 + bob); ctx.lineTo(-20, -1 + bob);
    ctx.moveTo(-25, 1 + bob); ctx.lineTo(-20, 1 + bob);
    ctx.moveTo(20, -1 + bob); ctx.lineTo(25, -1 + bob);
    ctx.moveTo(20, 1 + bob); ctx.lineTo(25, 1 + bob);
    ctx.stroke();

    // Shoulder rune marks
    ctx.fillStyle = `rgba(255,150,50,${runeGlow * 0.5})`;
    ctx.font = '7px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ᚱ', -9, -5 + bob);
    ctx.fillText('ᚦ', 9, -5 + bob);

    // Head — square stone block
    ctx.fillStyle = '#605878';
    ctx.beginPath();
    ctx.moveTo(-10, -23 + bob);
    ctx.lineTo(10, -23 + bob);
    ctx.lineTo(11, -9 + bob);
    ctx.lineTo(-11, -9 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#302840';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Forehead rune
    ctx.strokeStyle = `rgba(255,150,50,${runeGlow * 0.7})`;
    
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-3, -21 + bob); ctx.lineTo(3, -21 + bob);
    ctx.moveTo(0, -23 + bob); ctx.lineTo(0, -18 + bob);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Eyes — lava glow
    ctx.fillStyle = '#ff9030';
    
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(-3.5, -17 + bob, 3.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.5, -17 + bob, 3.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff8e0';
    ctx.beginPath(); ctx.ellipse(-3.5, -17.5 + bob, 1.4, 1.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.5, -17.5 + bob, 1.4, 1.2, 0, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  },

  // ======================================================
  //  ENEMY: Banshee Wraith
  // ======================================================
  enemyWraith(ctx, x, y, animFrame) {
    ctx.save();
    ctx.translate(x, y);
    const float = Math.sin(animFrame * 0.1) * 4;
    const alpha = 0.72 + Math.sin(animFrame * 0.07) * 0.18;
    const scream = Math.sin(animFrame * 0.2);
    ctx.globalAlpha = alpha;

    // Ghostly tendrils at base
    ctx.fillStyle = 'rgba(70,0,130,0.35)';
    for (let t = -1; t <= 1; t++) {
      const tx = t * 6;
      const wave = Math.sin(animFrame * 0.13 + t * 1.9) * 3;
      ctx.beginPath();
      ctx.moveTo(tx - 3, 10 + float);
      ctx.bezierCurveTo(tx - 4 + wave, 14 + float, tx - 2 + wave, 18 + float, tx + wave, 22 + float);
      ctx.bezierCurveTo(tx + 2 + wave, 24 + float, tx + 4 + wave, 24 + float, tx + 3 + wave, 21 + float);
      ctx.bezierCurveTo(tx + 2 + wave, 19 + float, tx + 3 - wave, 15 + float, tx + 3, 10 + float);
      ctx.closePath();
      ctx.fill();
    }

    // Soft outer aura
    ctx.beginPath();
    ctx.ellipse(0, 0 + float, 14, 18, 0, 0, Math.PI * 2);
    const aAlpha = 0.25 + Math.sin(animFrame * 0.09) * 0.1;
    ctx.fillStyle = `rgba(100,0,200,${aAlpha})`;
    ctx.fill();

    // Main spectral body
    ctx.beginPath();
    ctx.moveTo(-10, 0 + float);
    ctx.bezierCurveTo(-13, -7 + float, -11, -15 + float, 0, -16 + float);
    ctx.bezierCurveTo(11, -15 + float, 13, -7 + float, 10, 0 + float);
    ctx.bezierCurveTo(13, 6 + float, 11, 12 + float, 0, 12 + float);
    ctx.bezierCurveTo(-11, 12 + float, -13, 6 + float, -10, 0 + float);
    ctx.fillStyle = '#6a0ab0';
    ctx.fill();

    // Hood veil
    ctx.beginPath();
    ctx.ellipse(0, -8 + float, 9, 9.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#480088';
    ctx.fill();

    // Hood trim (subtle arcane edge)
    ctx.strokeStyle = 'rgba(180,80,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -8 + float, 9.5, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // Open scream mouth
    ctx.fillStyle = '#0a0016';
    const mOpen = 1.2 + scream * 0.6;
    ctx.beginPath();
    ctx.ellipse(0, -5 + float, 3.5, 2.5 * mOpen, 0, 0, Math.PI * 2);
    ctx.fill();
    // Teeth in mouth
    ctx.fillStyle = 'rgba(200,180,255,0.5)';
    ctx.fillRect(-2.5, -5 + float - 1.5 * mOpen, 1.5, 1.5 * mOpen);
    ctx.fillRect(0.5, -5 + float - 1.5 * mOpen, 1.5, 1.5 * mOpen);

    // Void eyes — twin teal orbs
    ctx.fillStyle = '#00f0e8';
    
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(-3.5, -9.5 + float, 3, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.5, -9.5 + float, 3, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#001818';
    ctx.beginPath(); ctx.ellipse(-3.5, -9.8 + float, 1.3, 1.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.5, -9.8 + float, 1.3, 1.7, 0, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();
  },

  // ======================================================
  //  ENEMY: Lich Lord (Boss)
  // ======================================================
  enemyBoss(ctx, x, y, animFrame) {
    ctx.save();
    ctx.translate(x, y);
    const bob = Math.sin(animFrame * 0.08) * 3;
    const glow = 0.5 + Math.sin(animFrame * 0.12) * 0.3;

    // Necrotic aura
    ctx.beginPath();
    ctx.arc(0, bob, 42 + Math.sin(animFrame * 0.05) * 6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(80,0,50,${glow * 0.12})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(180,0,70,${glow * 0.22})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Shadow
    ctx.beginPath();
    ctx.ellipse(0, 27, 22, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();

    // Robes (long, flowing)
    ctx.beginPath();
    ctx.moveTo(-20, -10 + bob);
    ctx.bezierCurveTo(-28, 8 + bob, -22, 22 + bob, -10, 27 + bob);
    ctx.lineTo(10, 27 + bob);
    ctx.bezierCurveTo(22, 22 + bob, 28, 8 + bob, 20, -10 + bob);
    ctx.fillStyle = '#160008';
    ctx.fill();
    ctx.strokeStyle = '#660020';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Robe arcane trim (dashed red edge)
    ctx.strokeStyle = `rgba(200,30,70,${0.4 + glow * 0.3})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(-20, -10 + bob);
    ctx.bezierCurveTo(-28, 8 + bob, -22, 22 + bob, -10, 27 + bob);
    ctx.moveTo(20, -10 + bob);
    ctx.bezierCurveTo(28, 8 + bob, 22, 22 + bob, 10, 27 + bob);
    ctx.stroke();
    ctx.setLineDash([]);

    // Torso
    ctx.fillStyle = '#230010';
    ctx.beginPath();
    ctx.rect(-14, -15 + bob, 28, 26);
    ctx.fill();
    ctx.strokeStyle = '#800028';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Chest necrotic glyph
    ctx.strokeStyle = `rgba(255,40,80,${glow})`;
    
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -11 + bob); ctx.lineTo(-8, 5 + bob);
    ctx.moveTo(0, -11 + bob); ctx.lineTo(8, 5 + bob);
    ctx.moveTo(-9, -2 + bob); ctx.lineTo(9, -2 + bob);
    ctx.moveTo(-4, 6 + bob); ctx.lineTo(0, -2 + bob); ctx.lineTo(4, 6 + bob);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Skull head
    ctx.fillStyle = '#c8c0b0';
    ctx.beginPath();
    ctx.ellipse(0, -28 + bob, 13, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#888070';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Zygomatic arches (cheekbone prominence)
    ctx.fillStyle = '#b0a898';
    ctx.beginPath();
    ctx.ellipse(-9, -24 + bob, 3, 2, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(9, -24 + bob, 3, 2, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Jaw
    ctx.fillStyle = '#b8b0a0';
    ctx.beginPath();
    ctx.moveTo(-8, -18 + bob);
    ctx.lineTo(-8, -13 + bob);
    ctx.quadraticCurveTo(0, -11 + bob, 8, -13 + bob);
    ctx.lineTo(8, -18 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#888070';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Teeth
    ctx.fillStyle = '#ddd8c8';
    for (let t = -5; t <= 5; t += 2.2) {
      ctx.beginPath();
      ctx.rect(t - 0.9, -17 + bob, 1.7, 3.2);
      ctx.fill();
    }

    // Bone crown with gems
    ctx.fillStyle = '#c8c0b0';
    ctx.strokeStyle = '#a09888';
    ctx.lineWidth = 1;
    // Crown base band
    ctx.beginPath();
    ctx.rect(-13, -41 + bob, 26, 4);
    ctx.fill(); ctx.stroke();
    // Crown spikes of varying heights
    const spikes = [-9, -5, 0, 5, 9];
    const spikeH = [-5, -9, -14, -9, -5];
    for (let i = 0; i < spikes.length; i++) {
      ctx.beginPath();
      ctx.moveTo(spikes[i] - 2.5, -41 + bob);
      ctx.lineTo(spikes[i], -41 + bob + spikeH[i]);
      ctx.lineTo(spikes[i] + 2.5, -41 + bob);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    // Crown center gem — glowing blood-red
    ctx.fillStyle = '#ff1030';
    
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(0, -52 + bob, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Gem facets
    ctx.strokeStyle = 'rgba(255,120,140,0.5)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -55.5 + bob); ctx.lineTo(-3, -52 + bob); ctx.lineTo(0, -48.5 + bob); ctx.lineTo(3, -52 + bob);
    ctx.closePath(); ctx.stroke();

    // Eye sockets
    ctx.fillStyle = '#060408';
    ctx.beginPath(); ctx.ellipse(-4.5, -30 + bob, 4.8, 5.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4.5, -30 + bob, 4.8, 5.2, 0, 0, Math.PI * 2); ctx.fill();

    // Glowing red void eyes
    ctx.fillStyle = '#ff0000';
    
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(-4.5, -30 + bob, 3.2, 3.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4.5, -30 + bob, 3.2, 3.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Left arm — skeletal necromancer arm
    ctx.strokeStyle = '#c0b8a8';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-14, -12 + bob);
    ctx.lineTo(-22, -6 + bob);
    ctx.lineTo(-24, 4 + bob);
    ctx.stroke();
    // Hand bones
    ctx.lineWidth = 1.5;
    for (let f = -2; f <= 2; f += 2) {
      ctx.beginPath();
      ctx.moveTo(-24 + f * 0.5, 4 + bob);
      ctx.lineTo(-26 + f, 8 + bob);
      ctx.stroke();
    }

    // Staff — necromancer bone staff
    ctx.strokeStyle = '#4a2800';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-22, -6 + bob);
    ctx.lineTo(-27, -28 + bob);
    ctx.stroke();
    // Staff skull topper
    ctx.fillStyle = '#c8c0b0';
    ctx.beginPath();
    ctx.ellipse(-27, -33 + bob, 5.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a09888';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#060408';
    ctx.beginPath(); ctx.ellipse(-28.5, -34 + bob, 1.8, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-25.5, -34 + bob, 1.8, 2, 0, 0, Math.PI * 2); ctx.fill();
    // Staff orb below skull
    
    ctx.shadowBlur = 0;
    const grad = ctx.createRadialGradient(-27, -42 + bob, 0, -27, -42 + bob, 5);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#b060ff');
    grad.addColorStop(1, 'rgba(80,0,200,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(-27, -42 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  },

  // ======================================================
  //  PROJECTILE SPRITES  (unchanged from original)
  // ======================================================
  drawMagicBolt(ctx, x, y, angle, color, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(size * 1.5, 0);
    ctx.bezierCurveTo(size * 0.5, -size * 0.4, -size * 0.5, -size * 0.4, -size * 1.5, 0);
    ctx.bezierCurveTo(-size * 0.5, size * 0.4, size * 0.5, size * 0.4, size * 1.5, 0);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  drawFireball(ctx, x, y, size, frame) {
    ctx.save();
    ctx.translate(x, y);
    const flicker = Math.sin(frame * 0.3) * 0.15 + 1;
    
    ctx.shadowBlur = 0;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * flicker);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#ffff00');
    grad.addColorStop(0.6, '#ff6000');
    grad.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.beginPath();
    ctx.arc(0, 0, size * flicker, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  drawIceShard(ctx, x, y, angle, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#a0e8ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -size * 2);
    ctx.lineTo(size * 0.6, 0);
    ctx.lineTo(0, size * 2);
    ctx.lineTo(-size * 0.6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  drawLightning(ctx, x1, y1, x2, y2, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#c0e0ff';
    
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const segments = 6;
    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;
    for (let i = 1; i < segments; i++) {
      const px = x1 + dx * i + rng(-15, 15);
      const py = y1 + dy * i + rng(-15, 15);
      ctx.lineTo(px, py);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  drawVoidOrb(ctx, x, y, size, frame) {
    ctx.save();
    ctx.translate(x, y);
    const pulse = Math.sin(frame * 0.2) * 0.15 + 1;
    
    ctx.shadowBlur = 0;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * pulse);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#c050ff');
    grad.addColorStop(1, 'rgba(80,0,200,0)');
    ctx.beginPath();
    ctx.arc(0, 0, size * pulse, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  drawScythe(ctx, x, y, rotation, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#80ffb0';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(48,255,128,0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, size, 0.2, Math.PI * 1.8);
    ctx.stroke();
    ctx.fillStyle = '#30ff80';
    ctx.beginPath();
    ctx.arc(size, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  drawGarlicAura(ctx, x, y, radius, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    const grad = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius);
    grad.addColorStop(0, 'rgba(255, 240, 100, 0.3)');
    grad.addColorStop(0.7, 'rgba(255, 200, 50, 0.15)');
    grad.addColorStop(1, 'rgba(255, 200, 50, 0)');
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 240, 100, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  // ======================================================
  //  XP ORB — arcane mana shard
  // ======================================================
  drawXPOrb(ctx, x, y, size, frame) {
    ctx.save();
    ctx.translate(x, y);
    const pulse = Math.sin(frame * 0.2) * 0.18 + 1;

    // Outer ring
    ctx.strokeStyle = 'rgba(80,230,150,0.4)';
    ctx.lineWidth = 1;
    
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, size * pulse * 1.6, 0, Math.PI * 2);
    ctx.stroke();

    // Core glow
    const grad = ctx.createRadialGradient(-size * 0.2, -size * 0.2, 0, 0, 0, size * pulse);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#a0ffc8');
    grad.addColorStop(0.7, '#20c870');
    grad.addColorStop(1, 'rgba(0,160,60,0)');
    ctx.beginPath();
    ctx.arc(0, 0, size * pulse, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  // ======================================================
  //  MAGIC ORB PICKUP  (was: XP Magnet)
  // ======================================================
  drawMagicOrb(ctx, x, y, age) {
    ctx.save();
    const pulse = 0.6 + 0.4 * Math.sin(age * 5);
    const rotation = age * 1.6;
    const bob = Math.sin(age * 3.5) * 3;

    // Outer aura halo
    
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(48,216,200,${0.35 + 0.4 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y + bob, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Orbiting arcane ring (tilted ellipse)
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(rotation);
    ctx.strokeStyle = `rgba(100,230,210,${0.7 + 0.25 * pulse})`;
    ctx.lineWidth = 1.5;
    
    ctx.shadowBlur = 0;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 7, 0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Four small orb nodes on the ring
    const cosA = Math.cos(0.25), sinA = Math.sin(0.25);
    const ringPts = [[15, 0], [0, 7], [-15, 0], [0, -7]];
    for (const [rx, ry] of ringPts) {
      const bx = rx * cosA - ry * sinA;
      const by = rx * sinA + ry * cosA;
      ctx.fillStyle = '#b0fff4';
      ctx.beginPath();
      ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // Core orb (radial gradient sphere)
    const grad = ctx.createRadialGradient(x - 3, y + bob - 4, 0, x, y + bob, 10);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, '#c0fff8');
    grad.addColorStop(0.6, '#20c8b8');
    grad.addColorStop(1, 'rgba(0,150,140,0)');
    
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x, y + bob, 10, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    // Specular highlight
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(x - 3.5, y + bob - 4, 3, 2.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label
    ctx.globalAlpha = 0.85 + 0.12 * pulse;
    ctx.font = 'bold 7px "Courier New"';
    ctx.fillStyle = '#70f8e8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MAGIC ORB', x, y + bob + 20);
    ctx.globalAlpha = 1;

    ctx.restore();
  },

  // ======================================================
  //  HEART PICKUP — crystal heart
  // ======================================================
  drawHeart(ctx, x, y, size, frame) {
    ctx.save();
    ctx.translate(x, y);
    const pulse = 1 + Math.sin(frame * 0.2) * 0.1;
    ctx.scale(pulse, pulse);

    // Outer glow
    
    ctx.shadowBlur = 0;
    // Heart shape
    ctx.fillStyle = '#c01038';
    ctx.beginPath();
    ctx.moveTo(0, size * 0.3);
    ctx.bezierCurveTo(-size * 0.6, -size * 0.4, -size * 1.2, size * 0.1, 0, size);
    ctx.bezierCurveTo(size * 1.2, size * 0.1, size * 0.6, -size * 0.4, 0, size * 0.3);
    ctx.fill();

    // Crystal facet highlight
    ctx.fillStyle = 'rgba(255,160,190,0.45)';
    ctx.beginPath();
    ctx.moveTo(-size * 0.1, size * 0.1);
    ctx.bezierCurveTo(-size * 0.5, -size * 0.25, -size * 0.75, size * 0.05, -size * 0.2, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  // ======================================================
  //  WAND ICON — for inventory wand graphic panel
  // ======================================================
  drawWandIcon(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    const s = size / 32; // scale factor relative to 32px design size

    // Shaft shadow
    
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#6030a0';
    ctx.lineWidth = 5 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10 * s, 12 * s);
    ctx.lineTo(8 * s, -8 * s);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Shaft main
    ctx.strokeStyle = '#9050d0';
    ctx.lineWidth = 3.5 * s;
    ctx.beginPath();
    ctx.moveTo(-10 * s, 12 * s);
    ctx.lineTo(8 * s, -8 * s);
    ctx.stroke();

    // Shaft gold band
    ctx.strokeStyle = '#c89840';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(-4 * s, 6 * s);
    ctx.lineTo(-1 * s, 3 * s);
    ctx.stroke();

    // Shaft highlight
    ctx.strokeStyle = 'rgba(180,130,255,0.5)';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(-9 * s, 10 * s);
    ctx.lineTo(7 * s, -6 * s);
    ctx.stroke();

    // Crystal orb glow
    
    ctx.shadowBlur = 0;
    const orbGrad = ctx.createRadialGradient(7 * s, -9 * s, 0, 9 * s, -10 * s, 9 * s);
    orbGrad.addColorStop(0, '#ffffff');
    orbGrad.addColorStop(0.3, '#d8a0ff');
    orbGrad.addColorStop(0.7, '#7020c0');
    orbGrad.addColorStop(1, 'rgba(80,0,160,0)');
    ctx.beginPath();
    ctx.arc(9 * s, -10 * s, 9 * s, 0, Math.PI * 2);
    ctx.fillStyle = orbGrad;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Orb rim
    ctx.strokeStyle = 'rgba(200,130,255,0.7)';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.arc(9 * s, -10 * s, 8.5 * s, 0, Math.PI * 2);
    ctx.stroke();

    // Gold star rune in orb
    ctx.fillStyle = 'rgba(240,192,80,0.8)';
    ctx.font = `bold ${10 * s}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', 9 * s, -10 * s);

    // Orb specular
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(6 * s, -13 * s, 2.5 * s, 1.8 * s, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  // ======================================================
  //  WORLD / BACKGROUND — Stone Dungeon Floor
  // ======================================================
  drawBackground(ctx, camX, camY, width, height) {
    // Pixel-art dungeon floor — square stone tiles viewed from above.
    // At PIXEL_SCALE=4: T=64 → 16 canvas px, MORT=4 → 1 canvas px (crisp grid).
    const T    = CONFIG.TILE_SIZE;  // 64 world units — tile size (square)
    const MORT = 4;                  //  4 world units — mortar gap (= 1 canvas px)

    // Mortar / grout colour fills the gaps between tiles
    ctx.fillStyle = '#080706';
    ctx.fillRect(0, 0, width, height);

    // Floor stone palette — slightly warmer/lighter than the wall to read as floor
    const SHADES = ['#1c1a17', '#1e1c19', '#211f1c', '#231f1b'];
    const LIGHT  = '#302c28';   // top-left inner bevel
    const SHADOW = '#100e0c';   // bottom-right inner bevel

    const startRow = Math.floor(camY / T) - 1;
    const startCol = Math.floor(camX / T) - 1;

    for (let row = startRow; row * T < camY + height + T; row++) {
      const ty = row * T - camY;

      for (let col = startCol; col * T < camX + width + T; col++) {
        const tx   = col * T - camX;
        const hash = Math.abs((col * 73856093) ^ (row * 19349663));

        // Stone face (square, uniform grid — no row offset)
        ctx.fillStyle = SHADES[hash & 3];
        ctx.fillRect(tx, ty, T - MORT, T - MORT);

        // Top-left inner bevel (lit)
        ctx.fillStyle = LIGHT;
        ctx.fillRect(tx,        ty,        T - MORT, MORT);
        ctx.fillRect(tx,        ty + MORT, MORT,      T - MORT * 2);

        // Bottom-right inner bevel (shadow)
        ctx.fillStyle = SHADOW;
        ctx.fillRect(tx,              ty + T - MORT * 2, T - MORT, MORT);
        ctx.fillRect(tx + T - MORT*2, ty,                MORT,      T - MORT);

        // Rare arcane rune (~1 in 32 tiles)
        if ((hash % 32) === 0) {
          const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', '✦', '◈'];
          ctx.fillStyle = 'rgba(110,35,190,0.20)';
          ctx.font = `${T * 0.45}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(runes[hash % runes.length], tx + T / 2, ty + T / 2);
        }
      }
    }
  },

  // ======================================================
  //  PARTICLE DRAW  (unchanged)
  // ======================================================
  drawParticle(ctx, p, cx = 0, cy = 0) {
    const sx = p.x - cx, sy = p.y - cy;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    if (p.type === 'spark') {
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'blood') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'text') {
      ctx.font = `bold ${p.size}px "Courier New"`;
      ctx.textAlign = 'center';
      ctx.fillStyle = p.color;
      
      ctx.shadowBlur = 0;
      ctx.fillText(p.text, sx, sy);
    } else if (p.type === 'star') {
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(p.rotation || 0);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, -p.size * 2);
        ctx.lineTo(p.size * 0.4, -p.size * 0.4);
        ctx.lineTo(p.size * 2, 0);
        ctx.lineTo(p.size * 0.4, p.size * 0.4);
        ctx.lineTo(0, p.size * 2);
        ctx.lineTo(-p.size * 0.4, p.size * 0.4);
        ctx.lineTo(-p.size * 2, 0);
        ctx.lineTo(-p.size * 0.4, -p.size * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.rotate(Math.PI / 4);
      }
      ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  // ======================================================
  //  HEALTH BAR  (unchanged)
  // ======================================================
  drawHealthBar(ctx, x, y, width, hp, maxHp, color) {
    const h = 4;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - width / 2, y, width, h);
    const ratio = clamp(hp / maxHp, 0, 1);
    ctx.fillStyle = color;
    ctx.fillRect(x - width / 2, y, width * ratio, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - width / 2, y, width, h);
  },
};
