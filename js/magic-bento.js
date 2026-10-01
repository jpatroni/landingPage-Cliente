// =========================================================
// Magic Bento — efectos de las tarjetas de servicios
// Versión sin React del componente MagicBento de React Bits,
// combinado con las flip cards (clic = girar).
// =========================================================
(() => {
  const OPTIONS = {
    enableStars: true,         // partículas doradas al pasar el mouse
    enableSpotlight: true,     // reflector que sigue al mouse sobre la grilla
    enableBorderGlow: true,    // borde que brilla cerca del cursor
    clickEffect: true,         // onda al hacer clic
    spotlightRadius: 400,
    particleCount: 12,
  };

  const grid = document.getElementById('magic-bento');
  if (!grid) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cards = [...grid.querySelectorAll('.flip')];

  // ---- Girar tarjeta (clic / Enter / Espacio) ----
  cards.forEach(card => {
    const flip = () => card.setAttribute('aria-pressed', card.classList.toggle('is-flipped'));
    card.addEventListener('click', e => { if (!e.target.closest('a')) flip(); });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
    });

    // capa para estrellas y onda
    const fx = document.createElement('div');
    fx.className = 'flip__fx';
    card.appendChild(fx);
  });

  if (reduced) return;

  // ---- Onda al hacer clic ----
  if (OPTIONS.clickEffect) {
    cards.forEach(card => {
      card.addEventListener('pointerdown', e => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        const size = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y)) * 2;
        const ripple = document.createElement('span');
        ripple.className = 'bento-ripple';
        Object.assign(ripple.style, { left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px` });
        card.querySelector('.flip__fx').appendChild(ripple);
        ripple.animate(
          [{ transform: 'translate(-50%, -50%) scale(0)', opacity: 1 },
           { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 }],
          { duration: 800, easing: 'cubic-bezier(.22, .61, .36, 1)' }
        ).onfinish = () => ripple.remove();
      });
    });
  }

  if (!hasMouse) return; // en pantallas táctiles no hay hover: solo giro + onda

  // ---- Estrellas al pasar el mouse ----
  if (OPTIONS.enableStars) {
    cards.forEach(card => {
      const fx = card.querySelector('.flip__fx');
      let timers = [];

      card.addEventListener('mouseenter', () => {
        const { width, height } = card.getBoundingClientRect();
        for (let i = 0; i < OPTIONS.particleCount; i++) {
          timers.push(setTimeout(() => {
            const star = document.createElement('span');
            star.className = 'bento-star';
            star.style.left = `${Math.random() * width}px`;
            star.style.top = `${Math.random() * height}px`;
            fx.appendChild(star);

            star.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
              { duration: 300, easing: 'ease-out', fill: 'forwards' });
            const dx = (Math.random() - .5) * 100, dy = (Math.random() - .5) * 100;
            star.animate([{ translate: '0 0' }, { translate: `${dx}px ${dy}px` }],
              { duration: 2000 + Math.random() * 2000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
            star.animate([{ opacity: 1 }, { opacity: .3 }],
              { duration: 1500, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
          }, i * 100));
        }
      });

      card.addEventListener('mouseleave', () => {
        timers.forEach(clearTimeout);
        timers = [];
        fx.querySelectorAll('.bento-star').forEach(star => {
          star.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0)', opacity: 0 }],
            { duration: 300, easing: 'ease-in', fill: 'forwards' }).onfinish = () => star.remove();
        });
      });
    });
  }

  // ---- Reflector global + borde brillante según cercanía ----
  if (!OPTIONS.enableSpotlight && !OPTIONS.enableBorderGlow) return;

  const spotlight = document.createElement('div');
  spotlight.className = 'bento-spotlight';
  if (OPTIONS.enableSpotlight) document.body.appendChild(spotlight);

  const proximity = OPTIONS.spotlightRadius * 0.5;
  const fadeDistance = OPTIONS.spotlightRadius * 0.75;
  let frame = 0, lastEvent = null;

  function update() {
    frame = 0;
    const e = lastEvent;
    const section = grid.getBoundingClientRect();
    const inside = e.clientX >= section.left && e.clientX <= section.right &&
                   e.clientY >= section.top && e.clientY <= section.bottom;

    let minDistance = Infinity;
    cards.forEach(card => {
      const r = card.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const distance = Math.max(0, Math.hypot(e.clientX - cx, e.clientY - cy) - Math.max(r.width, r.height) / 2);
      minDistance = Math.min(minDistance, distance);

      let intensity = 0;
      if (inside && OPTIONS.enableBorderGlow) {
        if (distance <= proximity) intensity = 1;
        else if (distance <= fadeDistance) intensity = (fadeDistance - distance) / (fadeDistance - proximity);
      }
      // si la tarjeta está girada, invertir X para que el brillo coincida en el dorso
      const relX = ((e.clientX - r.left) / r.width) * 100;
      card.style.setProperty('--glow-x', `${card.classList.contains('is-flipped') ? 100 - relX : relX}%`);
      card.style.setProperty('--glow-y', `${((e.clientY - r.top) / r.height) * 100}%`);
      card.style.setProperty('--glow-intensity', intensity.toFixed(3));
      card.style.setProperty('--glow-radius', `${OPTIONS.spotlightRadius * 0.55}px`);
    });

    if (OPTIONS.enableSpotlight) {
      spotlight.style.left = `${e.clientX}px`;
      spotlight.style.top = `${e.clientY}px`;
      const opacity = !inside ? 0
        : minDistance <= proximity ? 0.9
        : minDistance <= fadeDistance ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.9
        : 0;
      spotlight.style.opacity = opacity;
    }
  }

  document.addEventListener('mousemove', e => {
    lastEvent = e;
    if (!frame) frame = requestAnimationFrame(update);
  });
  document.addEventListener('mouseleave', () => {
    spotlight.style.opacity = 0;
    cards.forEach(c => c.style.setProperty('--glow-intensity', 0));
  });
})();
