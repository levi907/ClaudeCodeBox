// ============================================================
//  SPELL SURVIVORS - Bootstrap / Entry Point
// ============================================================

(function () {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const game = window._game = new Game(canvas);

  // Fullscreen helpers
  function requestFS() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (req) req.call(el).catch(() => {});
  }
  function exitFS() {
    const ex = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (ex) ex.call(document).catch(() => {});
  }
  function isFS() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  }
  function updateFSBtn() {
    const btn = document.getElementById('fullscreen-btn');
    if (btn) btn.textContent = isFS() ? '✕' : '⛶';
  }
  document.addEventListener('fullscreenchange', updateFSBtn);
  document.addEventListener('webkitfullscreenchange', updateFSBtn);

  const fsBtn = document.getElementById('fullscreen-btn');
  fsBtn.addEventListener('click', () => { isFS() ? exitFS() : requestFS(); });
  fsBtn.addEventListener('touchend', (e) => { e.preventDefault(); isFS() ? exitFS() : requestFS(); });

  // Start button
  document.getElementById('start-btn').addEventListener('click', () => {
    requestFS();
    game.start();
  });
  document.getElementById('start-btn').addEventListener('touchend', (e) => {
    e.preventDefault();
    requestFS();
    game.start();
  });

  // Handle screen resize
  window.addEventListener('resize', () => {
    if (game.running) {
      game.width = canvas.offsetWidth;
      game.height = canvas.offsetHeight;
      canvas.width = game.width;
      canvas.height = game.height;
    }
  });

  // Win screen restart button (touch + click)
  function bindRestart(id) {
    const btn = document.getElementById(id);
    if (!btn) return;
    const handler = () => {
      document.getElementById('win-screen')?.classList.add('hidden');
      game.restart();
    };
    btn.addEventListener('click', handler);
    btn.addEventListener('touchend', e => { e.preventDefault(); handler(); });
  }
  bindRestart('win-restart-btn');

  // Music mute toggle — syncs both game music and menu music
  const musicBtn = document.getElementById('music-btn');
  if (musicBtn) {
    const handleMuteToggle = () => {
      const muted = window.Music?.toggleMute();
      window.MenuMusic?.toggleMute();
      musicBtn.textContent = muted !== undefined ? (muted ? '♪̶' : '♪') : musicBtn.textContent;
      musicBtn.style.opacity = muted ? '0.45' : '1';
    };
    musicBtn.addEventListener('click', handleMuteToggle);
    musicBtn.addEventListener('touchend', (e) => { e.preventDefault(); handleMuteToggle(); });
  }

  // Start menu music on first user interaction (AudioContext requires gesture)
  const _startMenuMusic = () => {
    window.MenuMusic?.start();
    document.removeEventListener('pointerdown', _startMenuMusic);
    document.removeEventListener('keydown', _startMenuMusic);
  };
  document.addEventListener('pointerdown', _startMenuMusic);
  document.addEventListener('keydown', _startMenuMusic);

  // Prevent context menu on long press (mobile)
  document.addEventListener('contextmenu', e => e.preventDefault());

  // Lock orientation hint
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }

  // Debug info (remove in prod)
  // console.log('Spell Survivors loaded. canvas:', canvas.width, 'x', canvas.height);
})();
