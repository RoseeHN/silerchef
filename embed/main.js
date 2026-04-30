'use strict';

(function () {
  const CUISINES = [
    {
      slug: 'american-cuisine',
      title: 'American Cuisine',
      no: '01',
      tagline: 'Heritage comfort reimagined with contemporary finesse.',
    },
    {
      slug: 'french-cuisine',
      title: 'French Cuisine',
      no: '02',
      tagline: 'Classical technique and season-led elegance.',
    },
    {
      slug: 'greek-cuisine',
      title: 'Greek Cuisine',
      no: '03',
      tagline: 'Mediterranean clarity — olive oil, herbs, and the sea.',
    },
    {
      slug: 'italian-cuisine',
      title: 'Italian Cuisine',
      no: '04',
      tagline: 'Regional soul — handmade pasta and trattoria warmth.',
    },
    {
      slug: 'middle-eastern-cuisine',
      title: 'Middle Eastern Cuisine',
      no: '05',
      tagline: 'Spice routes, mezze abundance, and shared tables.',
    },
    {
      slug: 'turkish-cuisine',
      title: 'Turkish Cuisine',
      no: '06',
      tagline: 'Anatolian depth — fire, hospitality, and ritual.',
    },
  ];

  const SERVICES = [
    {
      slug: 'anniversary-celebrations',
      title: 'Anniversary Celebrations',
      no: '01',
      tagline: 'Milestones at the table — courses paced as quiet luxury.',
    },
    {
      slug: 'birthday-events',
      title: 'Birthday Events',
      no: '02',
      tagline: 'Chef-led joy — timing built for laughter and togetherness.',
    },
    {
      slug: 'family-dinners',
      title: 'Family Dinners',
      no: '03',
      tagline: 'Generous plates — home comfort without the restaurant rush.',
    },
    {
      slug: 'special-events',
      title: 'Special Events',
      no: '04',
      tagline: 'Corporate and private — polished flow from reception to last bite.',
    },
    {
      slug: 'special-occasion-dining',
      title: 'Special Occasion Dining',
      no: '05',
      tagline: 'Intimate arcs — proposals, reunions, chef’s-table focus.',
    },
  ];

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function probeImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  async function probeAll(urls) {
    const out = [];
    const chunk = 30;
    for (let i = 0; i < urls.length; i += chunk) {
      const slice = urls.slice(i, i + chunk);
      const results = await Promise.all(slice.map((u) => probeImage(u)));
      results.forEach((u) => {
        if (u) out.push(u);
      });
    }
    return out;
  }

  async function collectGalleryUrls(baseFolder, slug) {
    const base = `${baseFolder}/${slug}`;
    const found = [];
    const hero = await probeImage(`${base}/hero.jpg`);
    if (hero) found.push(hero);

    const gallerySlots = [];
    for (let i = 1; i <= 99; i++) {
      gallerySlots.push(`${base}/gallery/${pad2(i)}.jpg`);
    }
    const fromGallery = await probeAll(gallerySlots);
    fromGallery.forEach((u) => found.push(u));

    if (found.length <= (hero ? 1 : 0)) {
      const legacy = [];
      for (let i = 1; i <= 99; i++) {
        legacy.push(`${base}/${pad2(i)}.jpg`);
      }
      const fromLegacy = await probeAll(legacy);
      fromLegacy.forEach((u) => found.push(u));
    }

    return [...new Set(found)];
  }

  function getCopy(kind, slug) {
    const site = window.SC_SITE || {};
    if (kind === 'cuisine') return site.cuisines ? site.cuisines[slug] : null;
    return site.services ? site.services[slug] : null;
  }

  function renderBlocks(container, copy) {
    container.innerHTML = '';
    if (!copy || !copy.blocks) return;
    copy.blocks.forEach((block) => {
      const article = document.createElement('article');
      article.className = 'meal-card observe' + (block.image ? ' meal-card--with-visual' : '');

      const inner = document.createElement('div');
      inner.className = 'meal-card__inner';

      if (block.image) {
        const fig = document.createElement('figure');
        fig.className = 'meal-card__photo';
        const img = document.createElement('img');
        img.src = block.image;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.sizes = '(max-width: 520px) 72px, 108px';
        img.addEventListener('error', () => {
          fig.remove();
          article.classList.remove('meal-card--with-visual');
        });
        fig.appendChild(img);
        inner.appendChild(fig);
      }

      const body = document.createElement('div');
      body.className = 'meal-card__body';

      const h = document.createElement('h4');
      h.className = 'meal-card-title';
      h.textContent = block.title;
      body.appendChild(h);

      const ul = document.createElement('ul');
      ul.className = 'meal-card-list';
      (block.items || []).forEach((item) => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = item.name;
        li.appendChild(strong);
        if (item.desc) {
          const span = document.createElement('span');
          span.className = 'meal-card-desc';
          span.textContent = item.desc;
          li.appendChild(span);
        }
        ul.appendChild(li);
      });
      body.appendChild(ul);

      inner.appendChild(body);
      article.appendChild(inner);
      container.appendChild(article);
    });
    observeFresh(container);
  }

  function observeFresh(root) {
    if (!('IntersectionObserver' in window)) {
      root.querySelectorAll('.observe').forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('is-visible');
        });
      },
      { rootMargin: '0px 0px 14% 0px', threshold: 0.06 }
    );
    root.querySelectorAll('.observe').forEach((el) => io.observe(el));
  }

  let stripScrollHandler = null;
  let stripAutoplayTimer = null;
  let stripMarqueeRaf = null;
  let dockInteractionCleanup = null;

  function clearAutoplayTimer() {
    if (stripAutoplayTimer) {
      clearInterval(stripAutoplayTimer);
      stripAutoplayTimer = null;
    }
  }

  function cancelStripMarquee() {
    if (stripMarqueeRaf != null) {
      cancelAnimationFrame(stripMarqueeRaf);
      stripMarqueeRaf = null;
    }
  }

  function teardownDockListeners() {
    if (dockInteractionCleanup) {
      dockInteractionCleanup();
      dockInteractionCleanup = null;
    }
  }

  function resetCarouselTimers() {
    clearAutoplayTimer();
    cancelStripMarquee();
    teardownDockListeners();
  }

  /** Centers a thumbnail inside the horizontal strip only — avoids scrollIntoView scrolling the modal vertically. */
  function scrollThumbIntoStrip(stripEl, thumb, behavior) {
    if (!stripEl || !thumb) return;
    const maxScroll = Math.max(0, stripEl.scrollWidth - stripEl.clientWidth);
    const thumbCenter = thumb.offsetLeft + thumb.offsetWidth / 2;
    let left = thumbCenter - stripEl.clientWidth / 2;
    left = Math.max(0, Math.min(maxScroll, left));
    stripEl.scrollTo({ left, behavior: behavior || 'smooth' });
  }

  function setupCarousel(heroEl, stripEl, urls) {
    resetCarouselTimers();

    heroEl.removeAttribute('src');
    stripEl.innerHTML = '';
    const prevBtn = document.querySelector('.detail-strip-prev');
    const nextBtn = document.querySelector('.detail-strip-next');

    if (stripScrollHandler && prevBtn && nextBtn) {
      prevBtn.removeEventListener('click', stripScrollHandler.prev);
      nextBtn.removeEventListener('click', stripScrollHandler.next);
      stripScrollHandler = null;
    }

    const dock = document.querySelector('.detail-gallery-dock');

    if (!urls.length) {
      heroEl.alt = '';
      heroEl.style.display = 'none';
      heroEl.parentElement.classList.add('is-empty');
      if (dock) dock.hidden = true;
      return;
    }

    if (dock) dock.hidden = false;

    heroEl.style.display = '';
    heroEl.parentElement.classList.remove('is-empty');
    heroEl.decoding = 'async';
    if ('fetchPriority' in heroEl) {
      heroEl.fetchPriority = 'high';
    }

    let currentIdx = 0;

    function goToIndex(idx, scrollThumb) {
      const n = urls.length;
      currentIdx = ((idx % n) + n) % n;
      heroEl.src = urls[currentIdx];
      heroEl.alt = 'Gallery image ' + (currentIdx + 1);
      const thumbs = stripEl.querySelectorAll('.detail-thumb');
      thumbs.forEach((t, i) => {
        t.classList.toggle('is-active', i === currentIdx);
      });
      if (scrollThumb && thumbs[currentIdx]) {
        scrollThumbIntoStrip(stripEl, thumbs[currentIdx], 'smooth');
      }
    }

    urls.forEach((url, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'detail-thumb' + (idx === 0 ? ' is-active' : '');
      b.setAttribute('aria-label', 'Show image ' + (idx + 1));
      const im = document.createElement('img');
      im.src = url;
      im.alt = '';
      im.loading = 'lazy';
      im.decoding = 'async';
      im.sizes = '124px';
      b.appendChild(im);
      b.addEventListener('click', () => {
        goToIndex(idx, true);
      });
      stripEl.appendChild(b);
    });

    goToIndex(0, false);

    const scrollAmount = () => Math.min(stripEl.clientWidth * 0.85, 280);

    function scrollStrip(dir) {
      stripEl.scrollBy({ left: dir * scrollAmount(), behavior: 'smooth' });
    }

    stripScrollHandler = {
      prev: () => scrollStrip(-1),
      next: () => scrollStrip(1),
    };
    if (prevBtn && nextBtn) {
      prevBtn.addEventListener('click', stripScrollHandler.prev);
      nextBtn.addEventListener('click', stripScrollHandler.next);
    }

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function scheduleAutoplay() {
      clearAutoplayTimer();
      if (urls.length <= 1 || prefersReduced) return;
      stripAutoplayTimer = window.setInterval(() => {
        goToIndex(currentIdx + 1, false);
      }, 5200);
    }

    function startStripMarquee() {
      cancelStripMarquee();
      if (urls.length <= 1 || prefersReduced) return;
      let last = performance.now();
      const speedPxPerSec = 42;
      function tick(now) {
        const dt = Math.min(48, now - last);
        last = now;
        const maxScroll = stripEl.scrollWidth - stripEl.clientWidth;
        if (maxScroll <= 4) {
          stripMarqueeRaf = requestAnimationFrame(tick);
          return;
        }
        stripEl.scrollLeft += (speedPxPerSec * dt) / 1000;
        if (stripEl.scrollLeft >= maxScroll - 1) {
          stripEl.scrollLeft = 0;
        }
        stripMarqueeRaf = requestAnimationFrame(tick);
      }
      stripMarqueeRaf = requestAnimationFrame(tick);
    }

    if (dock && urls.length > 1 && !prefersReduced) {
      const pause = () => {
        clearAutoplayTimer();
        cancelStripMarquee();
      };
      const resume = () => {
        scheduleAutoplay();
        startStripMarquee();
      };
      dock.addEventListener('mouseenter', pause);
      dock.addEventListener('mouseleave', resume);
      dock.addEventListener('focusin', pause);
      dock.addEventListener('focusout', resume);
      dockInteractionCleanup = () => {
        dock.removeEventListener('mouseenter', pause);
        dock.removeEventListener('mouseleave', resume);
        dock.removeEventListener('focusin', pause);
        dock.removeEventListener('focusout', resume);
      };
      resume();
    }
  }

  const overlay = document.getElementById('detail-overlay');
  const detailTitle = document.getElementById('detail-title');
  const detailIntro = document.getElementById('detail-intro');
  const detailBlocks = document.getElementById('detail-blocks');
  const detailHero = document.getElementById('detail-hero-img');
  const detailStrip = document.getElementById('detail-strip');
  const detailClose = document.querySelector('.detail-close');

  function openDetail(kind, slug, title) {
    if (!overlay || !detailTitle || !detailIntro || !detailBlocks || !detailHero || !detailStrip) return;
    const baseFolder = kind === 'cuisine' ? 'images/cuisines' : 'images/services-and-occasions';
    const copy = getCopy(kind, slug);

    detailTitle.textContent = title;
    detailIntro.textContent = copy && copy.intro ? copy.intro : '';
    detailIntro.hidden = !(copy && copy.intro);

    renderBlocks(detailBlocks, copy);

    setupCarousel(detailHero, detailStrip, []);

    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('detail-open');

    const sheetInner = overlay.querySelector('.detail-sheet-inner');
    if (sheetInner) sheetInner.scrollTop = 0;

    collectGalleryUrls(baseFolder, slug).then((urls) => {
      setupCarousel(detailHero, detailStrip, urls);
    });

    if (detailClose) {
      try {
        detailClose.focus({ preventScroll: true });
      } catch {
        detailClose.focus();
      }
    }
  }

  function closeDetail() {
    if (!overlay) return;
    resetCarouselTimers();
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('detail-open');
  }

  function mountHub(containerId, items, kind, baseFolder, options) {
    const layout = options && options.layout;
    const premium =
      layout === 'cuisine-premium' || layout === 'service-premium';

    const root = document.getElementById(containerId);
    if (!root) return;
    const grid = document.createElement('div');
    grid.className = premium ? 'hub-grid hub-grid--cuisines' : 'hub-grid hub-grid--services';

    items.forEach((item) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = premium ? 'hub-card hub-card--cuisine observe' : 'hub-card observe';
      card.setAttribute('aria-haspopup', 'dialog');
      const aria =
        item.tagline != null ? `${item.title}. ${item.tagline}` : `${item.title}. View details and gallery.`;
      card.setAttribute('aria-label', aria);

      const visual = document.createElement('div');
      visual.className = 'hub-card-visual';
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = `${baseFolder}/${item.slug}/thumb.jpg`;
      if (premium) {
        img.sizes = '(max-width: 640px) 100vw, (max-width: 1400px) 50vw, 700px';
        img.width = 800;
        img.height = 600;
      } else {
        img.sizes = '(max-width: 900px) 100vw, (max-width: 1400px) 33vw, 380px';
        img.width = 480;
        img.height = 360;
      }
      img.addEventListener('error', function onThumbErr() {
        img.removeEventListener('error', onThumbErr);
        img.src = `${baseFolder}/${item.slug}/01.jpg`;
        img.addEventListener('error', function onSecondErr() {
          img.removeEventListener('error', onSecondErr);
          visual.classList.add('is-fallback');
          img.remove();
        });
      });
      visual.appendChild(img);

      if (premium) {
        const overlay = document.createElement('div');
        overlay.className = 'hub-card-overlay';
        const num = document.createElement('span');
        num.className = 'hub-card-index';
        num.textContent = item.no || '';
        const titleEl = document.createElement('h3');
        titleEl.className = 'hub-card-overlay-title';
        titleEl.textContent = item.title;
        const tag = document.createElement('p');
        tag.className = 'hub-card-overlay-tagline';
        tag.textContent = item.tagline || '';
        const cta = document.createElement('span');
        cta.className = 'hub-card-cta';
        cta.textContent = kind === 'service' ? 'Plan & gallery' : 'Menu & gallery';
        overlay.appendChild(num);
        overlay.appendChild(titleEl);
        overlay.appendChild(tag);
        overlay.appendChild(cta);
        visual.appendChild(overlay);
      }

      card.appendChild(visual);

      if (!premium) {
        const body = document.createElement('div');
        body.className = 'hub-card-body';
        const h = document.createElement('h3');
        h.className = 'hub-card-title';
        h.textContent = item.title;
        const p = document.createElement('p');
        p.className = 'hub-card-hint';
        p.textContent = 'View courses & gallery';
        body.appendChild(h);
        body.appendChild(p);
        card.appendChild(body);
      }

      card.addEventListener('click', () => openDetail(kind, item.slug, item.title));

      grid.appendChild(card);
    });

    root.appendChild(grid);
    observeFresh(root);
  }

  mountHub('cuisines-mount', CUISINES, 'cuisine', 'images/cuisines', { layout: 'cuisine-premium' });
  mountHub('services-mount', SERVICES, 'service', 'images/services-and-occasions', { layout: 'service-premium' });

  if (detailClose) detailClose.addEventListener('click', closeDetail);
  const backdropEl = overlay && overlay.querySelector('.detail-backdrop');
  if (backdropEl) backdropEl.addEventListener('click', closeDetail);

  const nav = document.getElementById('site-nav');
  const toggle = document.querySelector('.nav-toggle');

  function setMobileNavOpen(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('nav-drawer-open', open);
  }

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      setMobileNavOpen(!nav.classList.contains('is-open'));
    });
    nav.addEventListener('click', (e) => {
      if (e.target === nav) setMobileNavOpen(false);
    });
    nav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => setMobileNavOpen(false));
    });
  }

  let scrollRaf = 0;
  const onScroll = () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      document.documentElement.classList.toggle('is-scrolled', window.scrollY > 40);
    });
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  document.querySelectorAll('.observe').forEach((el) => {
    if (!('IntersectionObserver' in window)) {
      el.classList.add('is-visible');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('is-visible');
        });
      },
      { rootMargin: '0px 0px 14% 0px', threshold: 0.06 }
    );
    io.observe(el);
  });

  function getBookingApiUrl() {
    let base = '';
    if (typeof window !== 'undefined' && window.__SILERCHEF_API_BASE__) {
      base = String(window.__SILERCHEF_API_BASE__).trim();
    }
    if (!base) {
      const meta = document.querySelector('meta[name="silerchef-api-base"]');
      if (meta) base = (meta.getAttribute('content') || '').trim();
    }
    if (!base) return '/api/booking';
    return base.replace(/\/$/, '') + '/api/booking';
  }

  function getApiBaseUrl() {
    const u = getBookingApiUrl();
    if (u.startsWith('http')) return u.replace(/\/api\/booking\/?$/, '');
    return '';
  }

  function getReservationPostUrl() {
    const b = getApiBaseUrl();
    return b ? b + '/api/reservations' : '/api/reservations';
  }

  const bookingOverlay = document.getElementById('booking-overlay');
  const bookingForm = document.getElementById('booking-form');
  const bookingSuccess = document.getElementById('booking-success');
  const bookingError = document.getElementById('booking-error');
  const bookingBackdrop = bookingOverlay && bookingOverlay.querySelector('.booking-backdrop');
  const bookingCloseBtn = bookingOverlay && bookingOverlay.querySelector('.booking-close');
  const bookingDoneBtn = bookingOverlay && bookingOverlay.querySelector('.booking-done');

  function setBookingOpen(open) {
    if (!bookingOverlay) return;
    bookingOverlay.hidden = !open;
    bookingOverlay.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.classList.toggle('booking-open', open);
    document.documentElement.classList.toggle('booking-open', open);
    if (open) {
      bookingOverlay.scrollTop = 0;
      setMobileNavOpen(false);
      const first = bookingForm && bookingForm.querySelector('input[name="firstName"]');
      if (first) requestAnimationFrame(() => first.focus());
    } else if (bookingForm && bookingSuccess && bookingError) {
      bookingForm.reset();
      bookingForm.hidden = false;
      bookingForm.querySelector('input[name="guestCount"]').value = '2';
      bookingSuccess.hidden = true;
      bookingError.hidden = true;
      bookingError.textContent = '';
    }
  }

  async function applyBookingFromApi() {
    try {
      const r = await fetch(getBookingApiUrl(), { credentials: 'omit', mode: 'cors' });
      if (!r.ok) return;
      const cfg = await r.json();
      if (cfg.url) {
        const fb = document.getElementById('booking-fallback-link');
        if (fb) fb.setAttribute('href', cfg.url);
      }
      if (cfg.headline) {
        const h = document.querySelector('[data-booking-headline]');
        if (h) h.textContent = cfg.headline;
      }
      if (cfg.summary) {
        const p = document.querySelector('[data-booking-summary]');
        if (p) p.textContent = cfg.summary;
      }
    } catch (_) {
      /* offline */
    }
  }

  document.querySelectorAll('[data-booking-trigger]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      setBookingOpen(true);
    });
  });

  if (bookingCloseBtn) bookingCloseBtn.addEventListener('click', () => setBookingOpen(false));
  if (bookingBackdrop) bookingBackdrop.addEventListener('click', () => setBookingOpen(false));
  if (bookingDoneBtn) bookingDoneBtn.addEventListener('click', () => setBookingOpen(false));

  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!bookingError) return;
      bookingError.hidden = true;
      bookingError.textContent = '';
      const fd = new FormData(bookingForm);
      const guestRaw = fd.get('guestCount');
      const payload = {
        firstName: fd.get('firstName'),
        lastName: fd.get('lastName'),
        email: fd.get('email'),
        phone: fd.get('phone') || '',
        preferredDate: fd.get('preferredDate') || '',
        preferredTime: fd.get('preferredTime') || '',
        guestCount: guestRaw === '' || guestRaw === null ? null : Number(guestRaw),
        notes: fd.get('notes') || '',
      };
      try {
        const res = await fetch(getReservationPostUrl(), {
          method: 'POST',
          credentials: 'omit',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            (typeof data.detail === 'string' && data.detail) ||
            (data.error === 'server_misconfigured' && 'Booking is not configured on the server yet.') ||
            (typeof data.error === 'string' && data.error) ||
            'Something went wrong. Try again or use the calendar link below.';
          bookingError.textContent = msg;
          bookingError.hidden = false;
          return;
        }
        bookingForm.hidden = true;
        if (bookingSuccess) bookingSuccess.hidden = false;
      } catch {
        bookingError.textContent = 'Network error. Check your connection and try again.';
        bookingError.hidden = false;
      }
    });
  }

  applyBookingFromApi();

  (function initChefReel() {
    const section = document.getElementById('reel');
    const video = document.getElementById('chef-reel-video');
    const btn = document.getElementById('chef-reel-sound');
    const fbImg = document.getElementById('chef-reel-fallback');
    const capVideo = section && section.querySelector('.cinematic-caption__video');
    const capStill = section && section.querySelector('.cinematic-caption__still');
    if (!section || !video) return;

    const videoUrl = new URL('images/video/chef-reel.mp4', window.location.href).href;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    function applyStillMode() {
      section.classList.remove('cinematic--has-video');
      section.classList.add('cinematic--fallback');
      video.removeAttribute('autoplay');
      video.pause();
      if (fbImg) fbImg.removeAttribute('hidden');
      if (capVideo) capVideo.setAttribute('hidden', '');
      if (capStill) capStill.removeAttribute('hidden');
      if (btn) btn.hidden = true;
    }

    function applyVideoMode() {
      section.classList.add('cinematic--has-video');
      section.classList.remove('cinematic--fallback');
      video.setAttribute('autoplay', '');
      if (fbImg) fbImg.setAttribute('hidden', '');
      if (capVideo) capVideo.removeAttribute('hidden');
      if (capStill) capStill.setAttribute('hidden', '');
      if (btn) btn.hidden = false;
    }

    video.addEventListener('error', () => {
      applyStillMode();
    });

    if (reduce.matches) {
      applyStillMode();
      return;
    }

    fetch(videoUrl, { method: 'HEAD', cache: 'no-store' })
      .then((r) => {
        if (!r.ok) {
          applyStillMode();
          return;
        }
        applyVideoMode();

        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                if (video.preload === 'none') video.preload = 'metadata';
                video.play().catch(() => {});
              } else {
                video.pause();
              }
            });
          },
          { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }
        );
        io.observe(section);

        if (btn) {
          btn.addEventListener('click', () => {
            video.muted = !video.muted;
            const unmuted = !video.muted;
            btn.setAttribute('aria-pressed', unmuted ? 'true' : 'false');
            btn.setAttribute('aria-label', unmuted ? 'Mute' : 'Turn sound on');
            const icon = btn.querySelector('i');
            if (icon) {
              icon.className = unmuted ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
            }
            if (unmuted) video.play().catch(() => {});
          });
        }
      })
      .catch(() => {
        applyStillMode();
      });
  })();

  document.addEventListener('keydown', (e) => {
    const bookingOv = document.getElementById('booking-overlay');
    if (e.key === 'Escape' && bookingOv && !bookingOv.hidden) {
      setBookingOpen(false);
      return;
    }
    if (e.key === 'Escape' && overlay && !overlay.hidden) {
      closeDetail();
      return;
    }
    if (e.key === 'Escape' && nav && nav.classList.contains('is-open')) {
      setMobileNavOpen(false);
    }
  });
})();
