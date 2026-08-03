(() => {
  document.documentElement.classList.add('is-embed');

  const yearEl = document.getElementById('y');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const nav = document.getElementById('site-nav');
  const toggle = document.querySelector('.nav-toggle');

  if (toggle && nav) {
    const closeNav = () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    };
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNav));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeNav();
    });
  }

  const syncScrolled = () => {
    document.documentElement.classList.toggle('is-scrolled', window.scrollY > 14);
  };
  syncScrolled();
  window.addEventListener('scroll', syncScrolled, { passive: true });

  const cards = Array.from(document.querySelectorAll('[data-gallery-card]'));
  const overlay = document.getElementById('gallery-lightbox');
  const backdrop = overlay && overlay.querySelector('.gallery-lightbox__backdrop');
  const closeBtn = overlay && overlay.querySelector('.gallery-lightbox__close');
  const prevBtn = overlay && overlay.querySelector('.gallery-lightbox__nav--prev');
  const nextBtn = overlay && overlay.querySelector('.gallery-lightbox__nav--next');
  const countNode = document.getElementById('gallery-lightbox-count');
  const imageNode = document.getElementById('gallery-lightbox-image');
  const eyebrowNode = document.getElementById('gallery-lightbox-eyebrow');
  const titleNode = document.getElementById('gallery-lightbox-title');
  const textNode = document.getElementById('gallery-lightbox-text');

  let activeIndex = 0;
  let lockedScrollY = 0;

  const items = cards.map((card) => {
    const img = card.querySelector('img');
    return {
      src: card.getAttribute('data-gallery-src') || (img && img.getAttribute('src')) || '',
      alt: card.getAttribute('data-gallery-alt') || (img && img.getAttribute('alt')) || '',
      eyebrow: card.getAttribute('data-gallery-eyebrow') || 'Gallery moment',
      title: card.getAttribute('data-gallery-title') || (img && img.getAttribute('alt')) || 'Siler Chef gallery',
      text:
        card.getAttribute('data-gallery-text') ||
        'A closer look at the food, color, and atmosphere shaping a Siler Chef experience.',
    };
  });

  function lockViewport() {
    lockedScrollY = window.scrollY || 0;
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.classList.add('scroll-locked');
  }

  function unlockViewport() {
    document.body.classList.remove('scroll-locked');
    document.body.style.top = '';
    window.scrollTo(0, lockedScrollY);
  }

  function render(index) {
    if (!items.length || !imageNode || !eyebrowNode || !titleNode || !textNode || !countNode) return;
    activeIndex = ((index % items.length) + items.length) % items.length;
    const item = items[activeIndex];
    imageNode.src = item.src;
    imageNode.alt = item.alt || item.title;
    eyebrowNode.textContent = item.eyebrow;
    titleNode.textContent = item.title;
    textNode.textContent = item.text;
    countNode.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    const panel = overlay && overlay.querySelector('.gallery-lightbox__panel');
    if (panel) panel.scrollTop = 0;
  }

  function open(index) {
    if (!overlay) return;
    render(index);
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    lockViewport();
    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      if (closeBtn) closeBtn.focus();
    });
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => {
      overlay.hidden = true;
      unlockViewport();
    }, 220);
  }

  cards.forEach((card, index) => {
    const openCard = () => open(index);
    card.addEventListener('click', openCard);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openCard();
      }
    });
  });

  if (prevBtn) prevBtn.addEventListener('click', () => render(activeIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => render(activeIndex + 1));
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);

  document.addEventListener('keydown', (event) => {
    if (!overlay || overlay.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      render(activeIndex - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      render(activeIndex + 1);
    }
  });

  /** Build marquee track — required by .gallery-videos--marquee CSS (overflow:hidden). */
  function initGalleryVideoMarquees() {
    document.querySelectorAll('.gallery-videos--marquee').forEach((container) => {
      if (container.dataset.marqueeReady) return;
      const cards = Array.from(container.querySelectorAll(':scope > .video-card'));
      if (!cards.length) return;
      container.dataset.marqueeReady = '1';

      const track = document.createElement('div');
      track.className = 'gallery-videos__track';
      const seq1 = document.createElement('div');
      seq1.className = 'gallery-videos__seq';
      const seq2 = document.createElement('div');
      seq2.className = 'gallery-videos__seq';
      seq2.setAttribute('aria-hidden', 'true');

      cards.forEach((card) => seq1.appendChild(card));
      cards.forEach((card) => {
        const clone = card.cloneNode(true);
        clone.querySelectorAll('video').forEach((video) => {
          video.preload = 'none';
          video.removeAttribute('autoplay');
          try {
            video.pause();
          } catch (_) {}
          video.removeAttribute('src');
          video.querySelectorAll('source').forEach((source) => source.remove());
          video.load();
        });
        seq2.appendChild(clone);
      });

      track.appendChild(seq1);
      track.appendChild(seq2);
      container.appendChild(track);

      const duration = Math.min(95, Math.max(28, cards.length * 9));
      track.style.setProperty('--gallery-marquee-duration', `${duration}s`);
    });
  }

  initGalleryVideoMarquees();
})();
