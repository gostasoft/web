import './animations.js';

// Demo-only control; the reusable component does not depend on this file.
const control = document.getElementById('pause-all');
const modules = Array.from(document.querySelectorAll('met3-motion'));
control.addEventListener('click', () => {
  const paused = !modules.every(module => module.hasAttribute('paused'));
  modules.forEach(module => module.toggleAttribute('paused', paused));
  control.setAttribute('aria-pressed', String(paused));
  control.innerHTML = paused ? 'Tümünü oynat <span aria-hidden="true">▷</span>' : 'Tümünü durdur <span aria-hidden="true">Ⅱ</span>';
});
