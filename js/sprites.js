// ============================================================
//  SPELL SURVIVORS - Procedural Sprite Generation
//  All graphics drawn with Canvas 2D API (no image files needed)
// ============================================================

const Sprites = {
  _cache: {},

  // Create an offscreen canvas of given size
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

  // -------- Player Sprites --------
  player(ctx, x, y, facing, animFrame, flashTime) {
    ctx.save();
    ctx.translate(x, y);
    if (facing < 0) ctx.scale(-1, 1);

    const bob = Math.sin(animFrame * 0.15) * 1.5;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(0, 11 + bob, 10, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // Cape / robe
    ctx.beginPath();
    ctx.moveTo(-10, -2 + bob);
    ctx.quadraticCurveTo(-12, 8 + bob, -8, 13 + bob);
    ctx.lineTo(8, 13 + bob);
    ctx.quadraticCurveTo(12, 8 + bob, 10, -2 + bob);
    ctx.closePath();
    ctx.fillStyle = flashTime > 0 ? '#ffffff' : '#3a00a0';
    ctx.fill();
    ctx.strokeStyle = flashTime > 0 ? '#ffffff' : '#6a30f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 1 + bob, 8, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = flashTime > 0 ? '#ffffff' : '#4a00c0';
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.ellipse(0, -8 + bob, 7, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = flashTime > 0 ? '#ffffff' : '#f5c8a0';
    ctx.fill();
    ctx.strokeStyle = flashTime > 0 ? '#ffffff' : '#c8905a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Eyes
    if (flashTime <= 0) {
      ctx.fillStyle = '#200060';
      ctx.beginPath();
      ctx.ellipse(2.5, -8.5 + bob, 1.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eye glow
      ctx.fillStyle = '#c050ff';
      ctx.beginPath();
      ctx.ellipse(2.5, -9 + bob, 0.7, 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hat
    ctx.beginPath();
    ctx.moveTo(-8, -12 + bob);
    ctx.lineTo(8, -12 + bob);
    ctx.lineTo(3, -24 + bob);
    ctx.lineTo(-3, -24 + bob);
    ctx.closePath();
    ctx.fillStyle = flashTime > 0 ? '#ffffff' : '#1a0060';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -12 + bob, 9, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = flashTime > 0 ? '#ffffff' : '#2a0090';
    ctx.fill();

    // Hat star
    if (flashTime <= 0) {
      ctx.fillStyle = '#ffd700';
      ctx.font = '8px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', 0, -18 + bob);
    }

    // Staff
    const staffBob = bob * 0.5;
    ctx.strokeStyle = flashTime > 0 ? '#ffffff' : '#8B4513';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(9, -5 + staffBob);
    ctx.lineTo(13, 13 + staffBob);
    ctx.stroke();
    // Staff orb
    ctx.beginPath();
    ctx.arc(9, -7 + staffBob, 4, 0, Math.PI * 2);
    ctx.fillStyle = flashTime > 0 ? '#ffffff' : '#c050ff';
    ctx.fill();
    ctx.shadowColor = '#c050ff';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  },

  // -------- Enemy Sprites --------
  enemyZombie(ctx, x, y, hp, maxHp, animFrame) {
    ctx.save();
    ctx.translate(x, y);
    const bob = Math.sin(animFrame * 0.08) * 2;
    const tilt = Math.sin(animFrame * 0.08) * 0.15;
    ctx.rotate(tilt);

    // Shadow
    ctx.beginPath();
    ctx.ellipse(0, 11, 9, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.rect(-7, -2 + bob, 14, 13);
    ctx.fillStyle = '#2d4a1e';
    ctx.fill();
    ctx.strokeStyle = '#1a2d10';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.rect(-6, -14 + bob, 12, 12);
    ctx.fillStyle = '#9ab060';
    ctx.fill();
    ctx.strokeStyle = '#7a9040';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#ff3030';
    ctx.beginPath(); ctx.ellipse(-2, -9 + bob, 2, 2.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2, -9 + bob, 2, 2.5, 0, 0, Math.PI*2); ctx.fill();

    // Mouth
    ctx.strokeStyle = '#ff5050';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-3, -5 + bob);
    ctx.lineTo(3, -5 + bob);
    ctx.stroke();

    // Arms
    ctx.strokeStyle = '#9ab060';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, 2 + bob);
    ctx.lineTo(-14, -2 + bob);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7, 2 + bob);
    ctx.lineTo(14, -2 + bob);
    ctx.stroke();

    ctx.restore();
  },

  enemyBat(ctx, x, y, animFrame) {
    ctx.save();
    ctx.translate(x, y);
    const wingFlap = Math.sin(animFrame * 0.25) * 0.6;
    const bob = Math.sin(animFrame * 0.15) * 3;

    // Wings
    ctx.fillStyle = '#4a0080';
    ctx.beginPath();
    ctx.save();
    ctx.rotate(-wingFlap);
    ctx.moveTo(0, 0 + bob);
    ctx.bezierCurveTo(-5, -8 + bob, -18, -10 + bob, -20, -2 + bob);
    ctx.bezierCurveTo(-18, 4 + bob, -10, 2 + bob, 0, 2 + bob);
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.save();
    ctx.rotate(wingFlap);
    ctx.moveTo(0, 0 + bob);
    ctx.bezierCurveTo(5, -8 + bob, 18, -10 + bob, 20, -2 + bob);
    ctx.bezierCurveTo(18, 4 + bob, 10, 2 + bob, 0, 2 + bob);
    ctx.fill();
    ctx.restore();

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0 + bob, 7, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#6a20a0';
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ff6060';
    ctx.beginPath(); ctx.arc(-2.5, -1 + bob, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.5, -1 + bob, 2, 0, Math.PI*2); ctx.fill();

    ctx.restore();
  },

  enemyGolem(ctx, x, y, animFrame) {
    ctx.save();
    ctx.translate(x, y);
    const bob = Math.sin(animFrame * 0.05) * 1;

    // Shadow
    ctx.beginPath();
    ctx.ellipse(0, 16, 14, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();

    // Legs
    ctx.fillStyle = '#5a5a5a';
    ctx.beginPath(); ctx.rect(-10, 8 + bob, 8, 8); ctx.fill();
    ctx.beginPath(); ctx.rect(2, 8 + bob, 8, 8); ctx.fill();

    // Body
    ctx.beginPath();
    ctx.rect(-12, -8 + bob, 24, 18);
    ctx.fillStyle = '#707070';
    ctx.fill();
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Chest rune
    ctx.strokeStyle = '#ff6030';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-3, -4 + bob); ctx.lineTo(3, -4 + bob);
    ctx.moveTo(0, -6 + bob); ctx.lineTo(0, 2 + bob);
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.rect(-9, -22 + bob, 18, 15);
    ctx.fillStyle = '#6a6a6a';
    ctx.fill();
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#ff8030';
    ctx.shadowColor = '#ff8030';
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(-3.5, -16 + bob, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(3.5, -16 + bob, 3, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Arms
    ctx.fillStyle = '#606060';
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(-20, -6 + bob, 9, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(11, -6 + bob, 9, 12); ctx.fill(); ctx.stroke();

    ctx.restore();
  },

  enemyWraith(ctx, x, y, animFrame) {
    ctx.save();
    ctx.translate(x, y);
    const float = Math.sin(animFrame * 0.1) * 4;
    const alpha = 0.7 + Math.sin(animFrame * 0.07) * 0.15;
    ctx.globalAlpha = alpha;

    // Ghostly trail
    ctx.beginPath();
    ctx.moveTo(-8, -2 + float);
    ctx.quadraticCurveTo(-12, 12 + float, -6, 14 + float);
    ctx.quadraticCurveTo(0, 16 + float, 6, 14 + float);
    ctx.quadraticCurveTo(12, 12 + float, 8, -2 + float);
    ctx.fillStyle = 'rgba(80, 0, 120, 0.6)';
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 2 + float, 10, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7020a0';
    ctx.fill();

    // Hood
    ctx.beginPath();
    ctx.ellipse(0, -6 + float, 9, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#4a0080';
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(-3, -6 + float, 2.5, 3, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3, -6 + float, 2.5, 3, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 1;
    ctx.restore();
  },

  enemyBoss(ctx, x, y, animFrame) {
    ctx.save();
    ctx.translate(x, y);
    const bob = Math.sin(animFrame * 0.08) * 3;
    const glow = 0.5 + Math.sin(animFrame * 0.12) * 0.3;

    // Aura
    ctx.beginPath();
    ctx.arc(0, bob, 35 + Math.sin(animFrame * 0.05) * 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180, 0, 0, ${glow * 0.15})`;
    ctx.fill();

    // Shadow
    ctx.beginPath();
    ctx.ellipse(0, 24, 20, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();

    // Cape
    ctx.beginPath();
    ctx.moveTo(-18, -5 + bob);
    ctx.quadraticCurveTo(-24, 12 + bob, -14, 24 + bob);
    ctx.lineTo(14, 24 + bob);
    ctx.quadraticCurveTo(24, 12 + bob, 18, -5 + bob);
    ctx.fillStyle = '#8b0000';
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.rect(-14, -12 + bob, 28, 28);
    ctx.fillStyle = '#2a0000';
    ctx.fill();
    ctx.strokeStyle = '#880000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Chest symbol
    ctx.strokeStyle = `rgba(255, 80, 0, ${glow})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff5000';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -8 + bob); ctx.lineTo(-8, 8 + bob);
    ctx.moveTo(0, -8 + bob); ctx.lineTo(8, 8 + bob);
    ctx.moveTo(-6, 2 + bob); ctx.lineTo(6, 2 + bob);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Head
    ctx.beginPath();
    ctx.rect(-12, -30 + bob, 24, 20);
    ctx.fillStyle = '#3a0000';
    ctx.fill();
    ctx.strokeStyle = '#880000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Horns
    ctx.fillStyle = '#600000';
    ctx.beginPath();
    ctx.moveTo(-10, -28 + bob); ctx.lineTo(-14, -44 + bob); ctx.lineTo(-6, -30 + bob); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, -28 + bob); ctx.lineTo(14, -44 + bob); ctx.lineTo(6, -30 + bob); ctx.closePath(); ctx.fill();

    // Eyes
    ctx.fillStyle = '#ff0000';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.ellipse(-4, -22 + bob, 4, 4.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, -22 + bob, 4, 4.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  },

  // -------- Projectile Sprites --------
  drawMagicBolt(ctx, x, y, angle, color, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
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
    ctx.shadowColor = '#ff6000';
    ctx.shadowBlur = 20;
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
    ctx.shadowColor = '#80d0ff';
    ctx.shadowBlur = 10;
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
    ctx.shadowColor = '#80b0ff';
    ctx.shadowBlur = 15;
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
    ctx.shadowColor = '#8000ff';
    ctx.shadowBlur = 18;
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
    ctx.shadowColor = '#30ff80';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#80ffb0';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(48,255,128,0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, size, 0.2, Math.PI * 1.8);
    ctx.stroke();
    // Blade tip
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

  // -------- XP Orb --------
  drawXPOrb(ctx, x, y, size, frame) {
    ctx.save();
    ctx.translate(x, y);
    const pulse = Math.sin(frame * 0.2) * 0.15 + 1;
    ctx.shadowColor = '#40ff80';
    ctx.shadowBlur = 10;
    const grad = ctx.createRadialGradient(-size*0.2, -size*0.2, 0, 0, 0, size * pulse);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#80ffaa');
    grad.addColorStop(1, 'rgba(0,200,80,0)');
    ctx.beginPath();
    ctx.arc(0, 0, size * pulse, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  // -------- World / Background --------
  drawBackground(ctx, camX, camY, width, height) {
    // Deep dark background
    ctx.fillStyle = '#06000e';
    ctx.fillRect(0, 0, width, height);

    const tileSize = CONFIG.TILE_SIZE;
    const startX = Math.floor(camX / tileSize) * tileSize - camX;
    const startY = Math.floor(camY / tileSize) * tileSize - camY;

    for (let x = startX; x < width + tileSize; x += tileSize) {
      for (let y = startY; y < height + tileSize; y += tileSize) {
        const wx = Math.floor((x + camX) / tileSize);
        const wy = Math.floor((y + camY) / tileSize);
        // Deterministic tile variation
        const hash = (wx * 73856093) ^ (wy * 19349663);
        const v = Math.abs(hash % 100) / 100;

        if (v < 0.08) {
          ctx.fillStyle = '#0e011a';
          ctx.fillRect(x, y, tileSize, tileSize);
        } else if (v < 0.12) {
          ctx.fillStyle = '#08000f';
          ctx.fillRect(x, y, tileSize, tileSize);
        }

        // Grid lines (subtle)
        ctx.strokeStyle = 'rgba(80,0,120,0.08)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, tileSize, tileSize);

        // Occasional rune marks
        if (v > 0.97) {
          ctx.fillStyle = 'rgba(100, 0, 180, 0.15)';
          ctx.font = `${tileSize * 0.6}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const runes = ['✦', '✧', '⬡', '◈', '⬢'];
          ctx.fillText(runes[Math.abs(hash) % runes.length], x + tileSize/2, y + tileSize/2);
        }
      }
    }
  },

  // -------- Particle Draw --------
  drawParticle(ctx, p) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    if (p.type === 'spark') {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'blood') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'text') {
      ctx.font = `bold ${p.size}px "Courier New"`;
      ctx.textAlign = 'center';
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fillText(p.text, p.x, p.y);
    } else if (p.type === 'star') {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
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

  // -------- Health Bar --------
  drawHealthBar(ctx, x, y, width, hp, maxHp, color) {
    const h = 4;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - width/2, y, width, h);
    const ratio = clamp(hp / maxHp, 0, 1);
    ctx.fillStyle = color;
    ctx.fillRect(x - width/2, y, width * ratio, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - width/2, y, width, h);
  },

  // -------- Heart Pickup --------
  drawHeart(ctx, x, y, size, frame) {
    ctx.save();
    ctx.translate(x, y);
    const pulse = 1 + Math.sin(frame * 0.2) * 0.08;
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
};
