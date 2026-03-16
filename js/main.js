// ============================================================
//  SPELL SURVIVORS - Bootstrap / Entry Point
// ============================================================

(function () {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const game = window._game = new Game(canvas);

  // Start button
  document.getElementById('start-btn').addEventListener('click', () => {
    game.start();
  });
  document.getElementById('start-btn').addEventListener('touchend', (e) => {
    e.preventDefault();
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

  // Prevent context menu on long press (mobile)
  document.addEventListener('contextmenu', e => e.preventDefault());

  // Lock orientation hint
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }

  // Debug info (remove in prod)
  // console.log('Spell Survivors loaded. canvas:', canvas.width, 'x', canvas.height);
})();
