// ============================================================
//  SPELL SURVIVORS - Input Handler (Keyboard + Touch Joystick)
// ============================================================

class InputHandler {
  constructor() {
    this.keys = {};
    this.joystick = { active: false, dx: 0, dy: 0, id: null, startX: 0, startY: 0 };
    this._dashPressed = false;
    this._setupKeyboard();
    this._setupTouch();
    this._setupDashButton();
  }

  consumeDash() {
    if (this._dashPressed) { this._dashPressed = false; return true; }
    return false;
  }

  _setupDashButton() {
    const btn = document.getElementById('dash-btn');
    if (!btn) return;
    const fire = (e) => { e.preventDefault(); this._dashPressed = true; };
    btn.addEventListener('touchstart', fire, { passive: false });
    btn.addEventListener('mousedown', fire);
  }

  _setupKeyboard() {
    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      // Prevent scroll
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Space' && !e.repeat) this._dashPressed = true;
    });
    document.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
  }

  _setupTouch() {
    const zone = document.getElementById('joystick-zone');
    const base = document.getElementById('joystick-base');
    const thumb = document.getElementById('joystick-thumb');
    const MAX_RADIUS = 50;

    const onStart = (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      if (this.joystick.active) return;
      this.joystick.active = true;
      this.joystick.id = touch.identifier;
      this.joystick.startX = touch.clientX;
      this.joystick.startY = touch.clientY;

      base.style.left = touch.clientX + 'px';
      base.style.top = touch.clientY + 'px';
      base.classList.remove('hidden');
      thumb.style.left = '50%';
      thumb.style.top = '50%';
      thumb.style.transform = 'translate(-50%, -50%)';
    };

    const onMove = (e) => {
      e.preventDefault();
      if (!this.joystick.active) return;
      for (let touch of e.changedTouches) {
        if (touch.identifier !== this.joystick.id) continue;
        const dx = touch.clientX - this.joystick.startX;
        const dy = touch.clientY - this.joystick.startY;
        const d = Math.sqrt(dx*dx + dy*dy);
        const clamped = Math.min(d, MAX_RADIUS);
        const angle = Math.atan2(dy, dx);
        const cx = Math.cos(angle) * clamped;
        const cy = Math.sin(angle) * clamped;

        this.joystick.dx = cx / MAX_RADIUS;
        this.joystick.dy = cy / MAX_RADIUS;

        thumb.style.left = `calc(50% + ${cx}px)`;
        thumb.style.top = `calc(50% + ${cy}px)`;
        thumb.style.transform = 'translate(-50%, -50%)';
      }
    };

    const onEnd = (e) => {
      e.preventDefault();
      for (let touch of e.changedTouches) {
        if (touch.identifier === this.joystick.id) {
          this.joystick.active = false;
          this.joystick.dx = 0;
          this.joystick.dy = 0;
          this.joystick.id = null;
          base.classList.add('hidden');
        }
      }
    };

    zone.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd, { passive: false });
    document.addEventListener('touchcancel', onEnd, { passive: false });
  }

  // Returns {x, y} normalized movement vector (-1 to 1)
  getMovement() {
    let x = 0, y = 0;

    if (this.joystick.active) {
      x = this.joystick.dx;
      y = this.joystick.dy;
    }

    // Keyboard overrides touch
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) x = -1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) x = 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) y = -1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) y = 1;

    // Normalize diagonal
    const len = Math.sqrt(x*x + y*y);
    if (len > 1) { x /= len; y /= len; }

    return { x, y };
  }
}
