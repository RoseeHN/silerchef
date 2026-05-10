'use strict';

(function () {
  /** Full lists shipped in JS — merged with API `cuisineCards` / `serviceCards` so older saved JSON cannot drop slugs. */
  const CUISINES_CANONICAL = [
    {
      slug: 'american-cuisine',
      title: 'American Cuisine',
      no: '01',
      tagline: 'Refined comfort, premium cuts, and contemporary private dining.',
    },
    {
      slug: 'french-cuisine',
      title: 'French Cuisine',
      no: '02',
      tagline: 'Classical technique, pastry artistry, and polished Gallic refinement.',
    },
    {
      slug: 'italian-cuisine',
      title: 'Italian Cuisine',
      no: '03',
      tagline: 'Artisanal soul, regional warmth, and elegant Mediterranean pacing.',
    },
    {
      slug: 'greek-cuisine',
      title: 'Greek Cuisine',
      no: '04',
      tagline: 'Aegean clarity, bright herbs, citrus, and coastal refinement.',
    },
    {
      slug: 'turkish-cuisine',
      title: 'Turkish Cuisine',
      no: '05',
      tagline: 'Ottoman references, Anatolian depth, and modern luxury plating.',
    },
    {
      slug: 'middle-eastern-cuisine',
      title: 'Global Fusion',
      no: '06',
      tagline: 'Borderless flavor pairings with precise fine-dining execution.',
    },
  ];

  const SERVICES_CANONICAL = [
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
    {
      slug: 'chef-education',
      title: 'Private Lessons & Education',
      no: '06',
      tagline: 'Chef-led lessons, workshops, and culinary coaching tailored to your group.',
    },
  ];

  const CUISINES = CUISINES_CANONICAL.map((c) => ({ ...c }));
  const SERVICES = SERVICES_CANONICAL.map((c) => ({ ...c }));

  let availabilityState = { note: '', blockedDates: [] };
  const ANALYTICS_SESSION_KEY = 'silerchef_session_id';

  function getAnalyticsSessionId() {
    try {
      const existing = window.localStorage.getItem(ANALYTICS_SESSION_KEY);
      if (existing) return existing;
      const next =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `sc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(ANALYTICS_SESSION_KEY, next);
      return next;
    } catch (_) {
      return `sc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
  }

  function mergeDeep(base, override) {
    if (Array.isArray(base)) return Array.isArray(override) ? override : base;
    if (!base || typeof base !== 'object') return override === undefined ? base : override;
    const out = { ...base };
    if (!override || typeof override !== 'object') return out;
    Object.keys(override).forEach((key) => {
      const value = override[key];
      if (Array.isArray(value)) {
        out[key] = value;
      } else if (value && typeof value === 'object' && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
        out[key] = mergeDeep(out[key], value);
      } else if (value !== undefined) {
        out[key] = value;
      }
    });
    return out;
  }

  let galleryManifestCache = null;
  let galleryManifestPromise = null;

  function normalizeGalleryAssetKey(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim().split('#')[0];
    try {
      const abs =
        /^https?:\/\//i.test(trimmed) || trimmed.startsWith('//')
          ? trimmed.startsWith('//')
            ? `${window.location.protocol}${trimmed}`
            : trimmed
          : new URL(trimmed, window.location.href).href;
      const u = new URL(abs);
      let p = u.pathname || '';
      if (p.startsWith('/')) p = p.slice(1);
      return p;
    } catch {
      let p = trimmed.replace(/^\.\//, '');
      if (p.startsWith('/')) p = p.slice(1);
      const q = p.indexOf('?');
      if (q !== -1) p = p.slice(0, q);
      return p;
    }
  }

  async function loadGalleryManifest() {
    if (galleryManifestCache) return galleryManifestCache;
    if (!galleryManifestPromise) {
      galleryManifestPromise = fetch('images/gallery-manifest.json')
        .then((r) => (r.ok ? r.json() : { version: 1, images: {}, videos: {} }))
        .catch(() => ({ version: 1, images: {}, videos: {} }))
        .then((data) => {
          galleryManifestCache = data && typeof data === 'object' ? data : { version: 1, images: {}, videos: {} };
          if (!galleryManifestCache.images) galleryManifestCache.images = {};
          if (!galleryManifestCache.videos) galleryManifestCache.videos = {};
          return galleryManifestCache;
        });
    }
    return galleryManifestPromise;
  }

  function galleryTitleForUrl(url) {
    const m = galleryManifestCache;
    if (!m || !url) return '';
    const key = normalizeGalleryAssetKey(url);
    const keyBaseMp4 = /\.opt\.mp4$/i.test(key) ? key.replace(/\.opt\.mp4$/i, '.mp4') : key;
    const img = m.images && (m.images[key] || (keyBaseMp4 !== key ? m.images[keyBaseMp4] : null));
    if (img && img.title) return img.title;
    const vid =
      m.videos && (m.videos[key] || (keyBaseMp4 !== key ? m.videos[keyBaseMp4] : null));
    if (vid && vid.title) return vid.title;
    return '';
  }

  function applyManifestToMomentImages() {
    document.querySelectorAll('[data-moment-card] img[src]').forEach((img) => {
      const t = galleryTitleForUrl(img.getAttribute('src'));
      if (t) img.setAttribute('alt', t);
    });
  }

  function applyManifestToVideoElements() {
    document.querySelectorAll('video[src]').forEach((v) => {
      const t = galleryTitleForUrl(v.getAttribute('src'));
      if (!t) return;
      v.setAttribute('title', t);
      if (!v.getAttribute('aria-label')) v.setAttribute('aria-label', t);
    });
  }

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

  /** Prefer HEAD (cheap); fall back to Image decode if HEAD unsupported or inconclusive. */
  async function probeUrlExists(url) {
    try {
      const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer =
        ac &&
        window.setTimeout(() => {
          try {
            ac.abort();
          } catch (_) {}
        }, 3200);
      const r = await fetch(url, {
        method: 'HEAD',
        cache: 'force-cache',
        ...(ac ? { signal: ac.signal } : {}),
      });
      if (timer) window.clearTimeout(timer);
      if (r.ok) return url;
    } catch (_) {}
    return probeImage(url);
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

  /** Resolve 01.jpg … per index: probe extensions in parallel (HEAD-first inside probeUrlExists). */
  async function probeNumberedSlot(basePath, i) {
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    const candidates = extensions.map((ext) => `${basePath}/${pad2(i)}.${ext}`);
    const results = await Promise.all(candidates.map((url) => probeUrlExists(url)));
    for (let k = 0; k < candidates.length; k++) {
      if (results[k]) return candidates[k];
    }
    return null;
  }

  /**
   * Discover numbered files under basePath. Scans in parallel batches (was one slot per await ≈ very slow).
   */
  async function collectNumberedImages(basePath) {
    const found = [];
    let misses = 0;
    const BATCH = 12;
    const MAX = 80;
    for (let start = 1; start <= MAX; start += BATCH) {
      const end = Math.min(MAX, start + BATCH - 1);
      const slots = [];
      for (let i = start; i <= end; i++) slots.push(i);
      const batchHits = await Promise.all(slots.map((idx) => probeNumberedSlot(basePath, idx)));
      for (let j = 0; j < batchHits.length; j++) {
        const hit = batchHits[j];
        if (hit) {
          found.push(hit);
          misses = 0;
        } else {
          misses += 1;
          /**
           * Sparse folders (e.g. first file is 35.jpg) need many leading misses.
           * Empty folder: still exits after a long empty run with zero hits.
           */
          if (
            (found.length === 0 && misses >= 60) ||
            (found.length > 0 && misses >= 6)
          ) {
            return found;
          }
        }
      }
    }
    return found;
  }

  /**
   * First paint for detail modal: hub thumb + numbered gallery JPGs (no probes).
   * When runtime/API merge leaves `copy.blocks` empty, async scans alone can time out and leave a single thumb.
   */
  function buildDetailBootstrapGallery(baseFolder, slug, maxSlot) {
    const cap = typeof maxSlot === 'number' && maxSlot > 0 ? maxSlot : 12;
    const out = [];
    const seen = new Set();
    function add(u) {
      if (!u || seen.has(u)) return;
      seen.add(u);
      out.push(u);
    }
    add(`${baseFolder}/${slug}/thumb.jpg`);
    const gp = `${baseFolder}/${slug}/gallery`;
    for (let i = 1; i <= cap; i++) {
      add(`${gp}/${pad2(i)}.jpg`);
    }
    return out;
  }

  async function collectGalleryUrls(baseFolder, slug) {
    const copy = getCopy('cuisine', slug) || getCopy('service', slug);
    const base = `${baseFolder}/${slug}`;
    const galleryPath = `${base}/gallery`;

    const [fromGallery, hero] = await Promise.all([
      collectNumberedImages(galleryPath),
      (async () => {
        return (
          (await probeUrlExists(`${base}/hero.jpg`)) || (await probeUrlExists(`${base}/hero.jpeg`))
        );
      })(),
    ]);

    const found = [];
    const seen = new Set();

    function pushUnique(url) {
      if (!url || seen.has(url)) return;
      seen.add(url);
      found.push(url);
    }

    fromGallery.forEach(pushUnique);
    pushUnique(hero);

    if (copy && Array.isArray(copy.blocks)) {
      for (const block of copy.blocks) {
        const raw = typeof block.image === 'string' ? block.image.trim() : '';
        if (!raw) continue;
        /** data.js paths are canonical — probing each blocked the carousel on slow scans / timeouts. */
        pushUnique(raw);
      }
    }

    const hasBlockImages =
      copy &&
      Array.isArray(copy.blocks) &&
      copy.blocks.some((b) => b && typeof b.image === 'string' && b.image.trim());
    if (!hasBlockImages) {
      for (let i = 1; i <= 12; i++) {
        pushUnique(`${galleryPath}/${pad2(i)}.jpg`);
      }
    }

    if (!found.length) {
      const fromLegacy = await collectNumberedImages(base);
      fromLegacy.forEach(pushUnique);
    }

    return found;
  }

  function getCopy(kind, slug) {
    const site = window.SC_SITE || {};
    if (kind === 'cuisine') return site.cuisines ? site.cuisines[slug] : null;
    return site.services ? site.services[slug] : null;
  }

  function getCardImageSrc(kind, slug, baseFolder) {
    const copy = getCopy(kind, slug);
    const firstBlock = copy && Array.isArray(copy.blocks) ? copy.blocks[0] : null;
    const dynamicImage = firstBlock && typeof firstBlock.image === 'string' ? firstBlock.image.trim() : '';
    if (dynamicImage) return dynamicImage;
    return `${baseFolder}/${slug}/thumb.jpg`;
  }

  function renderBlocks(container, copy, kind, slug) {
    container.innerHTML = '';
    if (!copy || !copy.blocks) return;
    const fallbackImage =
      kind && slug
        ? getCardImageSrc(
            kind,
            slug,
            kind === 'cuisine' ? 'images/cuisines' : 'images/services-and-occasions'
          )
        : '';
    copy.blocks.forEach((block, idx) => {
      const article = document.createElement('article');
      article.className = 'meal-card observe' + (block.image ? ' meal-card--with-visual' : '');

      const inner = document.createElement('div');
      inner.className = 'meal-card__inner';

      if (block.image) {
        const fig = document.createElement('figure');
        fig.className = 'meal-card__photo';
        const img = document.createElement('img');
        img.src = block.image;
        img.alt = galleryTitleForUrl(block.image) || '';
        img.loading = idx < 8 ? 'eager' : 'lazy';
        img.decoding = 'async';
        if (idx < 4 && 'fetchPriority' in img) {
          img.fetchPriority = 'high';
        }
        img.sizes = '(max-width: 520px) 72px, 108px';
        img.addEventListener('error', function onBlockImageError() {
          img.removeEventListener('error', onBlockImageError);
          if (fallbackImage && fallbackImage !== block.image) {
            img.src = fallbackImage;
            img.addEventListener('error', function onFallbackError() {
              img.removeEventListener('error', onFallbackError);
              fig.remove();
              article.classList.remove('meal-card--with-visual');
            });
            return;
          }
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

  let lockedScrollY = 0;
  let activeModalLock = '';

  function resetCarouselTimers() {
    /* Detail gallery uses CSS marquee + static hero; nothing to clear */
  }

  function setupCarousel(heroEl, stripEl, urls) {
    resetCarouselTimers();

    const heroWrap = heroEl.parentElement;
    stripEl.innerHTML = '';
    stripEl.className = 'detail-marquee__slider';

    const dock = document.querySelector('.detail-gallery-dock');
    const marqueeRoot = document.getElementById('detail-marquee');

    if (!urls.length) {
      heroEl.removeAttribute('src');
      heroEl.alt = '';
      heroEl.style.display = 'none';
      if (heroWrap) {
        heroWrap.classList.add('is-empty');
        heroWrap.style.removeProperty('--detail-hero-bg');
      }
      if (dock) dock.hidden = true;
      if (marqueeRoot) marqueeRoot.classList.add('detail-marquee--static');
      return;
    }

    if (dock) dock.hidden = false;

    heroEl.style.display = '';
    if (heroWrap) {
      heroWrap.classList.remove('is-empty');
    }
    heroEl.src = urls[0];
    heroEl.decoding = 'sync';
    if ('fetchPriority' in heroEl) {
      heroEl.fetchPriority = 'high';
    }

    let currentIdx = 0;
    const sectionName = detailTitle && detailTitle.textContent ? detailTitle.textContent.trim() : '';
    const lightboxItems = urls.map((url, idx) => {
      const dish = galleryTitleForUrl(url);
      const fallback = `Gallery image ${idx + 1}`;
      const primaryTitle = dish || fallback;
      return {
        src: url,
        alt: primaryTitle,
        kicker: detailKicker && detailKicker.textContent ? detailKicker.textContent : 'Gallery moment',
        title: sectionName ? `${sectionName} · ${primaryTitle}` : primaryTitle,
        text: detailIntro && detailIntro.textContent ? detailIntro.textContent : 'A closer look at this menu direction and its visual language.',
      };
    });

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const runMarquee = urls.length > 1 && !prefersReduced;

    function goToIndex(idx) {
      const n = urls.length;
      currentIdx = ((idx % n) + n) % n;
      heroEl.src = urls[currentIdx];
      const dish = galleryTitleForUrl(urls[currentIdx]);
      heroEl.alt = dish || 'Gallery image ' + (currentIdx + 1);
      stripEl.querySelectorAll('.detail-thumb').forEach((t) => {
        const ti = Number(t.dataset.thumbIndex);
        t.classList.toggle('is-active', ti === currentIdx);
      });
    }

    heroEl.style.cursor = 'zoom-in';
    heroEl.onclick = () => openMomentsLightbox(lightboxItems, currentIdx);

    function makeThumb(idx) {
      const url = urls[idx];
      const dish = galleryTitleForUrl(url);
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.thumbIndex = String(idx);
      b.className = 'detail-thumb' + (idx === 0 ? ' is-active' : '');
      b.setAttribute('aria-label', dish ? `Show ${dish}` : 'Show image ' + (idx + 1));
      const im = document.createElement('img');
      im.src = url;
      im.alt = dish || '';
      im.loading = idx < 12 ? 'eager' : 'lazy';
      im.decoding = 'async';
      im.sizes = '140px';
      b.appendChild(im);
      b.addEventListener('click', () => {
        goToIndex(idx);
        openMomentsLightbox(lightboxItems, idx);
      });
      b.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          goToIndex(idx);
          openMomentsLightbox(lightboxItems, idx);
        }
      });
      return b;
    }

    const seq1 = document.createElement('div');
    seq1.className = 'detail-marquee__seq';
    urls.forEach((_, idx) => seq1.appendChild(makeThumb(idx)));

    stripEl.appendChild(seq1);

    if (runMarquee) {
      const seq2 = document.createElement('div');
      seq2.className = 'detail-marquee__seq';
      seq2.setAttribute('aria-hidden', 'true');
      urls.forEach((_, idx) => seq2.appendChild(makeThumb(idx)));
      stripEl.appendChild(seq2);
      const secPerImg = 2.4;
      const dur = Math.min(100, Math.max(26, urls.length * secPerImg));
      stripEl.style.setProperty('--detail-marquee-duration', `${dur}s`);
      if (marqueeRoot) marqueeRoot.classList.remove('detail-marquee--static');
    } else {
      stripEl.style.removeProperty('--detail-marquee-duration');
      if (marqueeRoot) marqueeRoot.classList.add('detail-marquee--static');
    }

    goToIndex(0);
  }

  const overlay = document.getElementById('detail-overlay');
  const detailKicker = document.getElementById('detail-kicker');
  const detailTitle = document.getElementById('detail-title');
  const detailIntro = document.getElementById('detail-intro');
  const detailBlocks = document.getElementById('detail-blocks');
  const detailHero = document.getElementById('detail-hero-img');
  const detailStrip = document.getElementById('detail-strip');
  const detailClose = document.querySelector('.detail-close');

  function lockViewport(owner) {
    if (activeModalLock === owner) return;
    if (!activeModalLock) {
      lockedScrollY =
        typeof window.scrollY === 'number'
          ? window.scrollY
          : window.pageYOffset || document.documentElement.scrollTop || 0;
      document.documentElement.classList.add('scroll-locked');
      document.body.classList.add('scroll-locked');
      document.body.style.top = `-${lockedScrollY}px`;
    }
    activeModalLock = owner;
  }

  function unlockViewport(owner) {
    if (activeModalLock && activeModalLock !== owner) return;
    activeModalLock = '';
    document.documentElement.classList.remove('scroll-locked');
    document.body.classList.remove('scroll-locked');
    document.body.style.top = '';
    window.scrollTo(0, lockedScrollY);
  }

  async function openDetail(kind, slug, title) {
    if (!overlay || !detailTitle || !detailIntro || !detailBlocks || !detailHero || !detailStrip) return;
    /** Do not await — manifest fetch would delay the overlay; titles warm up via boot-time loadGalleryManifest(). */
    void loadGalleryManifest();
    const baseFolder = kind === 'cuisine' ? 'images/cuisines' : 'images/services-and-occasions';
    const copy = getCopy(kind, slug);
    trackEvent(kind === 'cuisine' ? 'cuisine_open' : 'service_open', {
      slug,
      title,
      kind,
    });

    if (detailKicker) {
      detailKicker.textContent = kind === 'service' ? 'Service format' : 'Cuisine portfolio';
    }
    detailTitle.textContent = title;
    detailIntro.textContent = copy && copy.intro ? copy.intro : '';
    detailIntro.hidden = !(copy && copy.intro);

    renderBlocks(detailBlocks, copy, kind, slug);

    /** Thumb + canonical gallery/01… slots — immediate strip; async pass refines order and adds hero/extras. */
    const bootstrapUrls = buildDetailBootstrapGallery(baseFolder, slug);
    setupCarousel(detailHero, detailStrip, bootstrapUrls);

    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('detail-open');
    lockViewport('detail');

    overlay.scrollTop = 0;

    const GALLERY_PROBE_MS = 16000;
    void (async () => {
      try {
        const urls = await Promise.race([
          collectGalleryUrls(baseFolder, slug),
          new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error('gallery-timeout')), GALLERY_PROBE_MS);
          }),
        ]);
        const next = urls && urls.length ? urls : bootstrapUrls;
        setupCarousel(detailHero, detailStrip, next);
      } catch {
        setupCarousel(detailHero, detailStrip, bootstrapUrls);
      }
    })();

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
    unlockViewport('detail');
  }

  const momentsOverlay = document.getElementById('moments-overlay');
  const momentsImage = document.getElementById('moments-image');
  const momentsKicker = document.getElementById('moments-kicker');
  const momentsTitle = document.getElementById('moments-title');
  const momentsText = document.getElementById('moments-text');
  const momentsCount = document.getElementById('moments-count');
  const momentsClose = momentsOverlay && momentsOverlay.querySelector('.moments-close');
  const momentsBackdrop = momentsOverlay && momentsOverlay.querySelector('.moments-backdrop');
  const momentsPrev = momentsOverlay && momentsOverlay.querySelector('.moments-nav--prev');
  const momentsNext = momentsOverlay && momentsOverlay.querySelector('.moments-nav--next');
  let momentsHideTimer = null;
  let momentCards = [];
  let activeMomentIndex = 0;
  let activeMomentItems = [];

  function buildMomentItemFromCard(card) {
    const img = card.querySelector('img');
    return {
      src: card.getAttribute('data-moment-src') || (img && img.getAttribute('src')) || '',
      alt: card.getAttribute('data-moment-alt') || (img && img.getAttribute('alt')) || '',
      kicker: card.getAttribute('data-moment-kicker') || 'Gallery moment',
      title: card.getAttribute('data-moment-title') || (img && img.getAttribute('alt')) || 'Moment',
      text: 'A closer look at the atmosphere, plating rhythm, and visual language behind a Siler Chef evening.',
    };
  }

  function openMomentsLightbox(items, index) {
    if (!Array.isArray(items) || !items.length || !momentsOverlay) return;
    activeMomentItems = items;
    setMomentsOpen(true, index);
  }

  function scrollMomentsPanelTop() {
    const panel = momentsOverlay && momentsOverlay.querySelector('.moments-panel');
    if (panel) panel.scrollTop = 0;
  }

  function renderMoment(index) {
    if (!momentsImage || !momentsTitle || !momentsText || !momentsKicker || !momentsCount) return;
    const items =
      Array.isArray(activeMomentItems) && activeMomentItems.length
        ? activeMomentItems
        : momentCards.map(buildMomentItemFromCard);
    if (!items.length) return;
    activeMomentIndex = ((index % items.length) + items.length) % items.length;
    const item = items[activeMomentIndex];
    const src = item.src || '';
    const alt = item.alt || '';
    const kicker = item.kicker || 'Gallery moment';
    const title = item.title || alt || `Moment ${activeMomentIndex + 1}`;
    const text =
      item.text ||
      'A closer look at the atmosphere, plating rhythm, and visual language behind a Siler Chef evening.';
    momentsImage.src = src;
    momentsImage.alt = alt || title;
    momentsKicker.textContent = kicker;
    momentsTitle.textContent = title;
    momentsText.textContent = text;
    momentsCount.textContent = `${String(activeMomentIndex + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    scrollMomentsPanelTop();
  }

  function setMomentsOpen(open, index) {
    if (!momentsOverlay) return;
    if (momentsHideTimer) {
      clearTimeout(momentsHideTimer);
      momentsHideTimer = null;
    }
    if (open) {
      if (typeof index === 'number') renderMoment(index);
      momentsOverlay.hidden = false;
      momentsOverlay.setAttribute('aria-hidden', 'false');
      lockViewport('moments');
      requestAnimationFrame(() => {
        scrollMomentsPanelTop();
        momentsOverlay.classList.add('is-open');
        if (momentsClose) momentsClose.focus();
      });
      return;
    }
    momentsOverlay.classList.remove('is-open');
    momentsOverlay.setAttribute('aria-hidden', 'true');
    momentsHideTimer = window.setTimeout(() => {
      momentsOverlay.hidden = true;
      activeMomentItems = [];
      unlockViewport('moments');
      momentsHideTimer = null;
    }, 240);
  }

  function bindMomentsGallery() {
    momentCards = Array.from(document.querySelectorAll('[data-moment-card]'));
    momentCards.forEach((card, index) => {
      card.addEventListener('click', () => {
        trackEvent('gallery_open', {
          placement: 'moments_grid',
          index: index + 1,
          title: card.getAttribute('data-moment-title') || '',
        });
        setMomentsOpen(true, index);
      });
    });
    if (momentsClose) momentsClose.addEventListener('click', () => setMomentsOpen(false));
    if (momentsBackdrop) momentsBackdrop.addEventListener('click', () => setMomentsOpen(false));
    if (momentsPrev) momentsPrev.addEventListener('click', () => renderMoment(activeMomentIndex - 1));
    if (momentsNext) momentsNext.addEventListener('click', () => renderMoment(activeMomentIndex + 1));
  }

  function mountHub(containerId, items, kind, baseFolder, options) {
    const layout = options && options.layout;
    const premium =
      layout === 'cuisine-premium' || layout === 'service-premium';

    const root = document.getElementById(containerId);
    if (!root) return;
    const grid = document.createElement('div');
    grid.className = premium ? 'hub-grid hub-grid--cuisines' : 'hub-grid hub-grid--services';

    items.forEach((item, index) => {
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
      img.decoding = 'async';
      /** Hub grids always use thumb.jpg — avoids loading multi‑MB gallery heroes as card art. */
      img.src = `${baseFolder}/${item.slug}/thumb.jpg`;
      const eagerFirst = premium ? 3 : 2;
      if (index < eagerFirst) {
        img.loading = 'eager';
        img.fetchPriority = 'high';
      } else {
        img.loading = 'lazy';
      }
      if (premium) {
        img.sizes = '(max-width: 640px) 100vw, (max-width: 1100px) 50vw, (max-width: 1500px) 33vw, 460px';
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

  /** Homepage + gallery page: horizontal infinite marquee (clone strip for seamless loop). */
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

      cards.forEach((c) => seq1.appendChild(c));
      cards.forEach((c) => seq2.appendChild(c.cloneNode(true)));

      track.appendChild(seq1);
      track.appendChild(seq2);
      container.appendChild(track);

      const secPerCard = 9;
      const dur = Math.min(95, Math.max(28, cards.length * secPerCard));
      track.style.setProperty('--gallery-marquee-duration', `${dur}s`);
    });
  }

  mountHub('cuisines-mount', CUISINES, 'cuisine', 'images/cuisines', { layout: 'cuisine-premium' });
  mountHub('services-mount', SERVICES, 'service', 'images/services-and-occasions', { layout: 'service-premium' });
  syncConversionStats(window.SC_SITE_STATS || {});
  bindMomentsGallery();
  initGalleryVideoMarquees();

  loadGalleryManifest().then(() => {
    applyManifestToMomentImages();
    applyManifestToVideoElements();
  });

  if (detailClose) detailClose.addEventListener('click', closeDetail);
  const backdropEl = overlay && overlay.querySelector('.detail-backdrop');
  if (backdropEl) backdropEl.addEventListener('click', closeDetail);

  const nav = document.getElementById('site-nav');
  const toggle = document.querySelector('.nav-toggle');

  function setMobileNavOpen(open) {
    if (!nav || !toggle) return;
    if (open) {
      setBookingOpen(false);
      closeDetail();
    }
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
      a.addEventListener('click', () => {
        trackEvent('nav_click', {
          label: (a.textContent || '').trim() || 'navigation',
          target: a.getAttribute('href') || '',
        });
        setMobileNavOpen(false);
      });
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

  function getSiteContentUrl() {
    const b = getApiBaseUrl();
    return b ? b + '/api/site-content' : '/api/site-content';
  }

  function getAvailabilityUrl() {
    const b = getApiBaseUrl();
    return b ? b + '/api/availability' : '/api/availability';
  }

  function getAnalyticsEventUrl() {
    const b = getApiBaseUrl();
    return b ? b + '/api/analytics/events' : '/api/analytics/events';
  }

  function trackEvent(eventName, meta) {
    if (!eventName) return;
    const body = JSON.stringify({
      event: eventName,
      sessionId: getAnalyticsSessionId(),
      path:
        typeof window !== 'undefined' && window.location && window.location.pathname
          ? window.location.pathname
          : '/',
      meta: meta && typeof meta === 'object' ? meta : {},
    });
    const url = getAnalyticsEventUrl();

    try {
      if (navigator.sendBeacon && typeof Blob !== 'undefined') {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        return;
      }
    } catch (_) {
      /* ignore */
    }

    fetch(url, {
      method: 'POST',
      credentials: 'omit',
      mode: 'cors',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(() => {
      /* ignore */
    });
  }

  function setNodeText(selector, value) {
    if (value == null) return;
    const el = document.querySelector(selector);
    if (el) el.textContent = String(value);
  }

  function setLink(selector, href, text) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (href) el.setAttribute('href', href);
    if (text != null) el.textContent = String(text);
  }

  /**
   * Overlay CMS/API cards onto the canonical list (by slug). Entries missing from saved JSON are kept.
   * Re-numbers `no` sequentially after merge.
   */
  function mergeCardCollection(canonical, target, overrides) {
    if (!Array.isArray(overrides) || !overrides.length) return;
    const bySlug = new Map();
    canonical.forEach((c) => {
      bySlug.set(c.slug, { ...c });
    });
    overrides.forEach((row) => {
      if (!row || !row.slug) return;
      const prev = bySlug.get(row.slug);
      bySlug.set(row.slug, prev ? { ...prev, ...row } : { ...row });
    });
    const canonSlugs = new Set(canonical.map((c) => c.slug));
    const ordered = canonical.map((c) => bySlug.get(c.slug)).filter(Boolean);
    const appended = new Set();
    overrides.forEach((row) => {
      if (row && row.slug && !canonSlugs.has(row.slug) && bySlug.has(row.slug) && !appended.has(row.slug)) {
        ordered.push({ ...bySlug.get(row.slug) });
        appended.add(row.slug);
      }
    });
    ordered.forEach((c, i) => {
      c.no = String(i + 1).padStart(2, '0');
    });
    target.splice(0, target.length, ...ordered);
  }

  function formatConversionCount(n) {
    const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    if (n >= 0 && n <= 10 && Number.isFinite(n)) return words[n];
    return String(Math.max(0, n));
  }

  /** Keeps headline + stat numbers aligned with mounted cuisine/service cards (avoids stale CMS totals). */
  function syncConversionStats(siteStats) {
    const statNums = document.querySelectorAll('.stats-grid--premium .stat-num');
    const nCuisine = CUISINES.length;
    const nService = SERVICES.length;
    if (statNums[0]) statNums[0].textContent = String(nCuisine);
    if (statNums[1]) statNums[1].textContent = String(nService);
    const s = siteStats && typeof siteStats === 'object' ? siteStats : {};
    if (statNums[2] && s.chefExperience != null) statNums[2].textContent = String(s.chefExperience);

    const titleEl = document.querySelector('.conversion-title');
    if (titleEl) {
      const cw = formatConversionCount(nCuisine);
      const sw = formatConversionCount(nService);
      const caps = cw.length ? cw.charAt(0).toUpperCase() + cw.slice(1) : cw;
      titleEl.textContent = `${caps} cuisines · ${sw} occasions · one chef-led table`;
    }
  }

  function applySiteSettings(content) {
    if (!content || typeof content !== 'object') return;
    const site = content.site || {};
    const hero = site.hero || {};
    const quote = site.quote || {};
    const experience = site.experience || {};
    const pillars = Array.isArray(site.pillars) ? site.pillars : [];
    const coverage = site.coverage || {};
    const cuisinesSection = site.cuisinesSection || {};
    const servicesSection = site.servicesSection || {};
    const craft = site.craft || {};
    const chefStory = site.chefStory || {};
    const stats = site.stats || {};
    const cta = site.cta || {};
    const booking = site.booking || {};
    const faq = site.faq || {};
    const reel = site.reel || {};
    const contact = site.contact || {};

    setNodeText('.hero-headline', hero.headline);
    setNodeText('.hero-tagline', hero.tagline);
    setNodeText('.hero-lede', hero.lede);
    setNodeText('#hero-floating-north-eyebrow', hero.floatingNorthEyebrow);
    setNodeText('#hero-floating-north-title', hero.floatingNorthTitle);
    setNodeText('#hero-floating-south-eyebrow', hero.floatingSouthEyebrow);
    setNodeText('#hero-floating-south-title', hero.floatingSouthTitle);
    const proofChips = Array.isArray(hero.proofChips) ? hero.proofChips : [];
    proofChips.forEach((chip, index) => {
      setNodeText(`#hero-chip-${index}`, chip);
    });
    setNodeText('#hero-mini-primary-eyebrow', hero.miniPrimaryEyebrow);
    setNodeText('#hero-mini-primary-title', hero.miniPrimaryTitle);
    setNodeText('#hero-mini-secondary-eyebrow', hero.miniSecondaryEyebrow);
    setNodeText('#hero-mini-secondary-title', hero.miniSecondaryTitle);
    setNodeText('.pull-quote p', quote.text);
    setNodeText('.pull-quote cite', quote.cite);
    setNodeText('#experience-featured-eyebrow', experience.featuredEyebrow);
    setNodeText('#experience-featured-title', experience.featuredTitle);
    setNodeText('#experience-featured-body', experience.featuredBody);
    setNodeText('#experience-hosting-eyebrow', experience.hostingEyebrow);
    setNodeText('#experience-hosting-title', experience.hostingTitle);
    setNodeText('#experience-hosting-body', experience.hostingBody);
    setNodeText('#experience-guest-eyebrow', experience.guestEyebrow);
    setNodeText('#experience-guest-title', experience.guestTitle);
    setNodeText('#experience-guest-body', experience.guestBody);
    pillars.forEach((pillar, index) => {
      setNodeText(`#pillar-${index}-label`, pillar && pillar.label);
      setNodeText(`#pillar-${index}-title`, pillar && pillar.title);
      setNodeText(`#pillar-${index}-meta`, pillar && pillar.meta);
    });
    setNodeText('#coverage-eyebrow', coverage.eyebrow);
    setNodeText('#coverage-title', coverage.title);
    setNodeText('#coverage-body', coverage.body);
    const coverageChips = Array.isArray(coverage.chips) ? coverage.chips : [];
    coverageChips.forEach((chip, index) => {
      setNodeText(`#coverage-chip-${index}`, chip);
    });
    setNodeText('#chef-story-eyebrow', chefStory.eyebrow);
    setNodeText('#chef-story-title', chefStory.title);
    setNodeText('#chef-story-subtitle', chefStory.subtitle);
    setNodeText('#chef-story-intro', chefStory.intro);
    setNodeText('#chef-story-craft', chefStory.craft);
    setNodeText('#chef-story-local', chefStory.local);
    setNodeText('#chef-story-signature', chefStory.signature);
    setNodeText('#chef-story-closing', chefStory.closing);
    const chefStoryStats = Array.isArray(chefStory.stats) ? chefStory.stats : [];
    chefStoryStats.forEach((item, index) => {
      setNodeText(`#chef-story-stat-${index}-label`, item && item.label);
      setNodeText(`#chef-story-stat-${index}-value`, item && item.value);
    });
    setNodeText('#cuisines .section-lede', cuisinesSection.lede);
    setNodeText('#cuisines .section-sample-notice__kicker', cuisinesSection.noticeKicker);
    setNodeText('#cuisines .section-sample-notice__body', cuisinesSection.noticeBody);
    setNodeText('#services .section-lede', servicesSection.lede);
    setNodeText('#services .section-sample-notice__kicker', servicesSection.noticeKicker);
    setNodeText('#services .section-sample-notice__body', servicesSection.noticeBody);
    setNodeText('.module-eyebrow', craft.eyebrow);
    setNodeText('.module-title', craft.title);
    const craftBodies = document.querySelectorAll('.module-split-copy .module-lede');
    if (craftBodies[0] && craft.body1 != null) craftBodies[0].textContent = String(craft.body1);
    if (craftBodies[1] && craft.body2 != null) craftBodies[1].textContent = String(craft.body2);
    const craftActions = document.querySelectorAll('.module-split-actions a');
    if (craftActions[0]) {
      if (craft.primaryHref) craftActions[0].setAttribute('href', craft.primaryHref);
      if (craft.primaryLabel != null) craftActions[0].textContent = String(craft.primaryLabel);
    }
    if (craftActions[1]) {
      if (craft.secondaryHref) craftActions[1].setAttribute('href', craft.secondaryHref);
      if (craft.secondaryLabel != null) craftActions[1].textContent = String(craft.secondaryLabel);
    }
    setNodeText('[data-booking-headline]', cta.headline);
    setNodeText('[data-booking-summary]', cta.summary);
    setNodeText('#reel-label', reel.kicker);
    setNodeText('#reel-caption-video', reel.videoCaption);
    setNodeText('#reel-caption-still', reel.stillCaption);
    setNodeText('#faq-section-eyebrow', faq.eyebrow);
    setNodeText('#seo-faq-title', faq.title);
    setNodeText('#faq-section-lede', faq.lede);
    const faqItems = Array.isArray(faq.items) ? faq.items : [];
    faqItems.forEach((item, index) => {
      setNodeText(`#faq-${index}-eyebrow`, item && item.eyebrow);
      setNodeText(`#faq-${index}-title`, item && item.title);
      setNodeText(`#faq-${index}-body`, item && item.body);
    });
    setNodeText('#booking-title', booking.title);
    setNodeText('#booking-kicker', booking.kicker);
    setNodeText('.booking-lede', booking.lede);
    setNodeText('#booking-form-sub', booking.formSub);
    const bookingHighlights = Array.isArray(booking.highlights) ? booking.highlights : [];
    bookingHighlights.forEach((line, index) => {
      setNodeText(`#booking-highlight-${index}`, line);
    });
    const bookingSteps = Array.isArray(booking.steps) ? booking.steps : [];
    bookingSteps.forEach((step, index) => {
      setNodeText(`#booking-step-${index}-title`, step && step.title);
      setNodeText(`#booking-step-${index}-body`, step && step.body);
    });
    setNodeText('.booking-success__title', booking.successTitle);
    setNodeText('.booking-success__text', booking.successText);
    setLink('#booking-fallback-link', booking.fallbackUrl);
    const detailNotice = document.querySelector('.detail-sample-notice p');
    if (detailNotice && site.detailNotice) {
      detailNotice.textContent = String(site.detailNotice);
    }
    setNodeText('#contact h2', contact.title);
    setNodeText('#contact .section-head p', contact.subtitle);
    setLink('a[href^="tel:"]', contact.phoneHref, contact.phone);
    setLink('a[href^="mailto:"]', contact.emailHref, contact.email);
    const websiteLink = document.querySelector('#contact a[href^="https://www.silerchef.com/"]');
    if (websiteLink) {
      if (contact.websiteHref) websiteLink.setAttribute('href', contact.websiteHref);
      if (contact.website != null) websiteLink.textContent = String(contact.website);
    }
    const locationNode = document.querySelector('#contact .contact-col:last-child .contact-item:last-child div');
    if (locationNode && contact.location != null) locationNode.textContent = String(contact.location);
    const contactSocialMap = {
      instagram: contact.instagramHref,
      yelp: contact.yelpHref,
      facebook: contact.facebookHref,
    };
    document.querySelectorAll('a[data-contact-social]').forEach((el) => {
      const key = el.getAttribute('data-contact-social');
      const raw =
        key && Object.prototype.hasOwnProperty.call(contactSocialMap, key)
          ? String(contactSocialMap[key] ?? '').trim()
          : '';
      const valid =
        raw && (/^https?:\/\//i.test(raw) || /^tel:/i.test(raw) || /^mailto:/i.test(raw));
      if (valid) {
        el.setAttribute('href', raw);
        el.removeAttribute('hidden');
      } else {
        el.setAttribute('hidden', '');
      }
    });

    const schemaNode = document.getElementById('seo-schema');
    if (schemaNode) {
      const faqMainEntity = faqItems
        .filter((item) => item && item.title && item.body)
        .map((item) => ({
          '@type': 'Question',
          name: item.title,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.body,
          },
        }));

      const schemaPayload = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': 'https://www.silerchef.com/#website',
            url: 'https://www.silerchef.com/',
            name: 'Siler Chef',
            description: 'Personal chef and private in-home dining in Reno, Lake Tahoe, and the Bay Area.',
            inLanguage: 'en-US',
            publisher: { '@id': 'https://www.silerchef.com/#business' },
          },
          {
            '@type': ['LocalBusiness', 'ProfessionalService'],
            '@id': 'https://www.silerchef.com/#business',
            name: 'Siler Chef',
            alternateName: ['SilerChef', 'Chef Siler'],
            url: 'https://www.silerchef.com/',
            image: 'https://www.silerchef.com/images/homepage/hero-01.jpg',
            logo: 'https://www.silerchef.com/images/brand/silerchef-logo.png',
            description: 'Private chef services for Reno, Lake Tahoe, and the Bay Area: custom menus, plated and family-style service, private events, and chef-led lessons.',
            telephone: contact.phone || '+1-775-389-6677',
            email: contact.email || 'silerchef@gmail.com',
            priceRange: '$$$',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Reno',
              addressRegion: 'NV',
              addressCountry: 'US',
            },
            areaServed: [
              { '@type': 'City', name: 'Reno', containedInPlace: { '@type': 'State', name: 'Nevada' } },
              { '@type': 'AdministrativeArea', name: 'Lake Tahoe' },
              { '@type': 'AdministrativeArea', name: 'San Francisco Bay Area' },
            ],
            sameAs: (() => {
              const list = [
                contact.instagramHref || 'https://www.instagram.com/silerchef',
                contact.facebookHref || 'https://www.facebook.com/share/1Eea7fQpfV/?mibextid=wwXIfr',
              ];
              const yelp = contact.yelpHref && String(contact.yelpHref).trim();
              if (yelp && /^https?:\/\//i.test(yelp)) list.push(yelp);
              list.push(contact.websiteHref || 'https://www.silerchef.com/');
              return list;
            })(),
          },
          {
            '@type': 'Service',
            '@id': 'https://www.silerchef.com/#service',
            serviceType: 'Personal chef and private dining service',
            provider: { '@id': 'https://www.silerchef.com/#business' },
            areaServed: [
              { '@type': 'City', name: 'Reno' },
              { '@type': 'AdministrativeArea', name: 'Lake Tahoe' },
              { '@type': 'AdministrativeArea', name: 'San Francisco Bay Area' },
            ],
            availableLanguage: ['en-US'],
            audience: {
              '@type': 'Audience',
              geographicArea: [
                { '@type': 'State', name: 'Nevada' },
                { '@type': 'AdministrativeArea', name: 'Lake Tahoe' },
                { '@type': 'AdministrativeArea', name: 'San Francisco Bay Area' },
              ],
            },
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'Private chef experiences',
              itemListElement: [
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Private in-home dining' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Custom tasting menus' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Chef-led celebrations and events' } },
              ],
            },
          },
        ],
      };

      if (faqMainEntity.length) {
        schemaPayload['@graph'].push({
          '@type': 'FAQPage',
          '@id': 'https://www.silerchef.com/#faq',
          mainEntity: faqMainEntity,
        });
      }

      schemaNode.textContent = JSON.stringify(schemaPayload, null, 2);
    }
  }

  function remountHubs(siteStatsForConversion) {
    const cuisinesMount = document.getElementById('cuisines-mount');
    const servicesMount = document.getElementById('services-mount');
    if (cuisinesMount) cuisinesMount.innerHTML = '';
    if (servicesMount) servicesMount.innerHTML = '';
    mountHub('cuisines-mount', CUISINES, 'cuisine', 'images/cuisines', { layout: 'cuisine-premium' });
    mountHub('services-mount', SERVICES, 'service', 'images/services-and-occasions', { layout: 'service-premium' });
    syncConversionStats(siteStatsForConversion || (window.SC_SITE_STATS || {}));
  }

  async function loadRuntimeContent() {
    try {
      const res = await fetch(getSiteContentUrl(), { credentials: 'omit', mode: 'cors' });
      if (!res.ok) return;
      const content = await res.json();
      if (!content || typeof content !== 'object') return;
      applySiteSettings(content);
      const siteStatsPersist = content.site && content.site.stats ? content.site.stats : {};
      window.SC_SITE_STATS = siteStatsPersist;
      mergeCardCollection(CUISINES_CANONICAL, CUISINES, content.cuisineCards);
      mergeCardCollection(SERVICES_CANONICAL, SERVICES, content.serviceCards);
      if (content.cuisines || content.services) {
        window.SC_SITE = mergeDeep(window.SC_SITE || {}, {
          cuisines: content.cuisines || undefined,
          services: content.services || undefined,
        });
      }
      remountHubs(siteStatsPersist);
    } catch (_) {
      /* ignore */
    }
  }

  async function loadAvailability() {
    try {
      const res = await fetch(getAvailabilityUrl(), { credentials: 'omit', mode: 'cors' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && typeof data === 'object') {
        availabilityState = {
          note: typeof data.note === 'string' ? data.note : '',
          blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],
        };
      }
    } catch (_) {
      /* ignore */
    }
  }

  function getBlockedDateMessage(dateValue) {
    const row = (availabilityState.blockedDates || []).find((entry) => entry && entry.date === dateValue);
    if (!row) return '';
    return row.label ? `This date is unavailable: ${row.label}` : 'This date is unavailable.';
  }

  const bookingOverlay = document.getElementById('booking-overlay');
  const bookingForm = document.getElementById('booking-form');
  const bookingSuccess = document.getElementById('booking-success');
  const bookingError = document.getElementById('booking-error');
  const bookingSuccessText = bookingOverlay && bookingOverlay.querySelector('[data-booking-success-text]');
  const bookingSuccessMeta = bookingOverlay && bookingOverlay.querySelector('[data-booking-success-meta]');
  const bookingSubmitBtn = bookingForm && bookingForm.querySelector('[data-booking-submit]');
  const bookingSubmitLabel = bookingForm && bookingForm.querySelector('[data-booking-submit-label]');
  const bookingBackdrop = bookingOverlay && bookingOverlay.querySelector('.booking-backdrop');
  const bookingPanel = bookingOverlay && bookingOverlay.querySelector('.booking-panel');
  const bookingCloseBtn = bookingOverlay && bookingOverlay.querySelector('.booking-close');
  const bookingDoneBtn = bookingOverlay && bookingOverlay.querySelector('.booking-done');
  let bookingHideTimer = null;

  function getMinBookingDateValue(offsetDays = 3) {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
    const year = next.getFullYear();
    const month = String(next.getMonth() + 1).padStart(2, '0');
    const day = String(next.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function applyBookingDateRules() {
    const dateInput = bookingForm && bookingForm.querySelector('input[name="preferredDate"]');
    if (!dateInput) return;
    dateInput.min = getMinBookingDateValue(3);
  }

  function syncBookingDateState() {
    const dateField = bookingForm && bookingForm.querySelector('.booking-field--date');
    const dateInput = bookingForm && bookingForm.querySelector('input[name="preferredDate"]');
    if (!dateField || !dateInput) return;
    dateField.classList.toggle('is-filled', !!dateInput.value);
  }

  function resetBookingState() {
    if (!bookingForm || !bookingSuccess || !bookingError) return;
    if (bookingOverlay) bookingOverlay.classList.remove('is-success');
    bookingForm.reset();
    bookingForm.hidden = false;
    const hiddenLocation = bookingForm.querySelector('input[name="eventLocation"]');
    if (hiddenLocation) hiddenLocation.value = '';
    const serviceArea = bookingForm.querySelector('select[name="serviceArea"]');
    if (serviceArea) serviceArea.value = '';
    const eventLocationDetail = bookingForm.querySelector('input[name="eventLocationDetail"]');
    if (eventLocationDetail) eventLocationDetail.value = '';
    const zipCode = bookingForm.querySelector('input[name="zipCode"]');
    if (zipCode) zipCode.value = '';
    const allergyNotes = bookingForm.querySelector('textarea[name="allergyNotes"]');
    if (allergyNotes) allergyNotes.value = '';
    const notes = bookingForm.querySelector('textarea[name="notes"]');
    if (notes) notes.value = '';
    bookingForm.querySelectorAll('input[name="allergyFlag"]').forEach((box) => { box.checked = false; });
    bookingForm.querySelector('input[name="guestCount"]').value = '2';
    const preferredContact = bookingForm.querySelector('input[name="preferredContact"]');
    if (preferredContact) preferredContact.value = 'any';
    const preferredTime = bookingForm.querySelector('input[name="preferredTime"]');
    if (preferredTime) preferredTime.value = '';
    bookingSuccess.hidden = true;
    bookingError.hidden = true;
    bookingError.classList.remove('is-visible');
    bookingError.textContent = '';
    if (bookingSuccessMeta) {
      bookingSuccessMeta.hidden = true;
      bookingSuccessMeta.innerHTML = '';
    }
    if (bookingSuccessText) {
      bookingSuccessText.textContent =
        'Chef Siler’s team will review your request and contact you as soon as possible.';
    }
    applyBookingDateRules();
    syncBookingDateState();
    setBookingSubmitting(false);
  }
  applyBookingDateRules();
  syncBookingDateState();

  const bookingDateInput = bookingForm && bookingForm.querySelector('input[name="preferredDate"]');
  if (bookingDateInput) {
    ['input', 'change', 'blur'].forEach((eventName) => {
      bookingDateInput.addEventListener(eventName, syncBookingDateState);
    });
  }

  function setBookingSubmitting(isSubmitting) {
    if (!bookingSubmitBtn) return;
    bookingSubmitBtn.disabled = !!isSubmitting;
    bookingSubmitBtn.setAttribute('aria-busy', isSubmitting ? 'true' : 'false');
    if (bookingSubmitLabel) {
      bookingSubmitLabel.textContent = isSubmitting ? 'Sending request...' : 'Submit request';
    }
  }

  function showBookingError(message) {
    if (!bookingError) return;
    bookingError.textContent = message;
    bookingError.hidden = false;
    bookingError.classList.add('is-visible');
    const bookingBody = bookingOverlay && bookingOverlay.querySelector('.booking-panel__body');
    if (bookingBody) bookingBody.scrollTo({ top: bookingError.offsetTop - 24, behavior: 'smooth' });
  }

  function renderSuccessMeta(data) {
    if (!bookingSuccessMeta) return;
    bookingSuccessMeta.innerHTML = '';
    bookingSuccessMeta.hidden = true;
  }

  function setBookingOpen(open) {
    if (!bookingOverlay) return;
    if (bookingHideTimer) {
      clearTimeout(bookingHideTimer);
      bookingHideTimer = null;
    }
    if (open) {
      bookingOverlay.hidden = false;
      bookingOverlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('booking-open');
      document.documentElement.classList.add('booking-open');
      lockViewport('booking');
      setMobileNavOpen(false);
      requestAnimationFrame(() => {
        bookingOverlay.classList.add('is-open');
      });
      const bookingBody = bookingOverlay.querySelector('.booking-panel__body');
      if (bookingBody) bookingBody.scrollTop = 0;
      const bookingShell = bookingOverlay.querySelector('.booking-panel__shell');
      if (bookingShell) bookingShell.scrollTop = 0;
      const first = bookingForm && bookingForm.querySelector('input[name="preferredDate"]');
      requestAnimationFrame(() => {
        if (bookingPanel) bookingPanel.focus();
        const shouldFocusField =
          typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? !window.matchMedia('(max-width: 780px)').matches
            : true;
        if (shouldFocusField) {
          window.setTimeout(() => {
            if (first) first.focus();
          }, 140);
        }
      });
      return;
    }
    bookingOverlay.classList.remove('is-open');
    bookingOverlay.setAttribute('aria-hidden', 'true');
    bookingHideTimer = window.setTimeout(() => {
      bookingOverlay.hidden = true;
      document.body.classList.remove('booking-open');
      document.documentElement.classList.remove('booking-open');
      unlockViewport('booking');
      resetBookingState();
      bookingHideTimer = null;
    }, 260);
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
      trackEvent('booking_trigger', {
        placement: el.getAttribute('data-booking-placement') || (el.textContent || '').trim() || 'booking_cta',
      });
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
      bookingError.classList.remove('is-visible');
      bookingError.textContent = '';
      setBookingSubmitting(true);
      const fd = new FormData(bookingForm);
      const guestRaw = fd.get('guestCount');
      const serviceArea = String(fd.get('serviceArea') || '').trim();
      const eventLocationDetail = String(fd.get('eventLocationDetail') || '').trim();
      const combinedLocation = [serviceArea, eventLocationDetail].filter(Boolean).join(' — ');
      const hiddenLocation = bookingForm.querySelector('input[name="eventLocation"]');
      if (hiddenLocation) hiddenLocation.value = combinedLocation;
      const payload = {
        firstName: fd.get('firstName'),
        lastName: fd.get('lastName'),
        email: fd.get('email') || '',
        phone: fd.get('phone') || '',
        eventLocation: combinedLocation,
        zipCode: fd.get('zipCode') || '',
        preferredDate: fd.get('preferredDate') || '',
        preferredTime: fd.get('preferredTime') || '',
        preferredContact: fd.get('preferredContact') || 'any',
        guestCount: guestRaw === '' || guestRaw === null ? null : Number(guestRaw),
        cuisinePreference: fd.get('cuisinePreference') || '',
        allergyFlags: fd.getAll('allergyFlag').map((v) => String(v || '').trim()),
        allergyNotes: fd.get('allergyNotes') || '',
        notes: fd.get('notes') || '',
      };
      const blockedMsg = getBlockedDateMessage(payload.preferredDate);
      if (blockedMsg) {
        setBookingSubmitting(false);
        showBookingError(blockedMsg);
        return;
      }
      const minBookingDate = getMinBookingDateValue(3);
      if (payload.preferredDate && payload.preferredDate < minBookingDate) {
        setBookingSubmitting(false);
        showBookingError('Please choose a date at least 3 days from today.');
        return;
      }
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
            (typeof data.error === 'string' && data.error) ||
            'Something went wrong. Try again or call us directly below.';
          setBookingSubmitting(false);
          showBookingError(msg);
          return;
        }
        bookingForm.hidden = true;
        if (bookingOverlay) bookingOverlay.classList.add('is-success');
        if (bookingSuccess) bookingSuccess.hidden = false;
        if (bookingSuccessText) {
          bookingSuccessText.textContent =
            'Chef Siler’s team will review your request and contact you as soon as possible.';
        }
        renderSuccessMeta(data);
        const bookingBody = bookingOverlay && bookingOverlay.querySelector('.booking-panel__body');
        if (bookingBody) bookingBody.scrollTo({ top: 0, behavior: 'smooth' });
        const bookingShell = bookingOverlay && bookingOverlay.querySelector('.booking-panel__shell');
        if (bookingShell && typeof bookingShell.scrollTo === 'function') {
          bookingShell.scrollTo({ top: 0, behavior: 'smooth' });
        }
        trackEvent('reservation_submit', {
          placement: 'booking_form',
        });
        setBookingSubmitting(false);
      } catch {
        setBookingSubmitting(false);
        showBookingError('Network error. Check your connection and try again.');
      }
    });
  }

  document.querySelectorAll('.social-tile--instagram').forEach((el) => {
    el.addEventListener('click', () => {
      trackEvent('social_click', {
        network: 'instagram',
        placement: 'contact_social',
        label: 'Instagram',
      });
    });
  });

  document.querySelectorAll('.social-tile--yelp').forEach((el) => {
    el.addEventListener('click', () => {
      trackEvent('social_click', {
        network: 'yelp',
        placement: 'contact_social',
        label: 'Yelp',
      });
    });
  });

  document.querySelectorAll('.social-tile--facebook').forEach((el) => {
    el.addEventListener('click', () => {
      trackEvent('social_click', {
        network: 'facebook',
        placement: 'contact_social',
        label: 'Facebook',
      });
    });
  });

  document.querySelectorAll('a[href^="tel:"]').forEach((el) => {
    el.addEventListener('click', () => {
      trackEvent('contact_click', {
        placement: 'contact_panel',
        target: 'phone',
        label: 'Phone',
      });
    });
  });

  document.querySelectorAll('a[href^="mailto:"]').forEach((el) => {
    el.addEventListener('click', () => {
      trackEvent('contact_click', {
        placement: 'contact_panel',
        target: 'email',
        label: 'Email',
      });
    });
  });

  const bookingFallbackLink = document.getElementById('booking-fallback-link');
  if (bookingFallbackLink) {
    bookingFallbackLink.addEventListener('click', () => {
      trackEvent('contact_click', {
        placement: 'booking_fallback',
        target: 'phone',
        label: 'Booking fallback phone',
      });
    });
  }

  applyBookingFromApi();
  loadRuntimeContent();
  loadAvailability();
  trackEvent('page_view', {
    label: 'homepage',
    placement: 'page_load',
  });

  (function initHeroRotator() {
    const root = document.querySelector('.hero-rotator');
    if (!root) return;
    const slides = root.querySelectorAll('.hero-rotator__slide');
    if (slides.length < 2) return;
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      slides.forEach((s, i) => s.classList.toggle('is-active', i === 0));
      return;
    }
    let idx = 0;
    window.setInterval(() => {
      idx = (idx + 1) % slides.length;
      slides.forEach((s, j) => s.classList.toggle('is-active', j === idx));
    }, 6500);
  })();

  (function initChefReel() {
    const section = document.getElementById('reel');
    const video = document.getElementById('chef-reel-video');
    const btn = document.getElementById('chef-reel-sound');
    const fbImg = document.getElementById('chef-reel-fallback');
    const capVideo = section && section.querySelector('.cinematic-caption__video');
    const capStill = section && section.querySelector('.cinematic-caption__still');
    if (!section || !video) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let videoReady = false;
    let observer = null;

    function applyStillMode() {
      section.classList.remove('cinematic--has-video');
      section.classList.add('cinematic--fallback');
      video.pause();
      if (fbImg) fbImg.removeAttribute('hidden');
      if (capVideo) capVideo.setAttribute('hidden', '');
      if (capStill) capStill.removeAttribute('hidden');
      if (btn) btn.hidden = true;
    }

    function applyVideoMode() {
      section.classList.add('cinematic--has-video');
      section.classList.remove('cinematic--fallback');
      if (fbImg) fbImg.setAttribute('hidden', '');
      if (capVideo) capVideo.removeAttribute('hidden');
      if (capStill) capStill.setAttribute('hidden', '');
      if (btn) btn.hidden = false;
    }

    function markVideoReady() {
      if (videoReady) return;
      videoReady = true;
      applyVideoMode();
    }

    video.addEventListener('error', () => {
      applyStillMode();
    });
    video.addEventListener('loadeddata', markVideoReady);
    video.addEventListener('loadedmetadata', markVideoReady);
    video.addEventListener('canplay', markVideoReady);
    video.addEventListener('playing', markVideoReady);

    if (reduce.matches) {
      applyStillMode();
      return;
    }

    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    if ('disableRemotePlayback' in video) {
      video.disableRemotePlayback = true;
    }
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'metadata';
    video.load();

    function reelSectionIntersectsViewport() {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      return rect.bottom > 0 && rect.top < vh;
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
            return;
          }
          video.pause();
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }
    );
    observer.observe(section);

    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState !== 'visible' || reduce.matches) return;
        if (!videoReady || section.classList.contains('cinematic--fallback')) return;
        if (reelSectionIntersectsViewport()) {
          video.play().catch(() => {});
        }
      },
      false
    );

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
  })();

  if (window.parent !== window && 'ResizeObserver' in window) {
    const postEmbedHeight = () => {
      try {
        const pageEl = document.querySelector('.page');
        const h = Math.max(
          document.documentElement.scrollHeight,
          document.body ? document.body.scrollHeight : 0,
          pageEl ? pageEl.scrollHeight : 0
        );
        window.parent.postMessage({ source: 'silerchef-embed', height: h }, '*');
      } catch (_) {}
    };
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(postEmbedHeight);
    });
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);
    const pageForRo = document.querySelector('.page');
    if (pageForRo) ro.observe(pageForRo);
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      requestAnimationFrame(postEmbedHeight);
    } else {
      document.addEventListener('DOMContentLoaded', postEmbedHeight);
    }
    window.addEventListener('load', postEmbedHeight);
  }

  document.addEventListener('keydown', (e) => {
    const bookingOv = document.getElementById('booking-overlay');
    if (e.key === 'Escape' && bookingOv && !bookingOv.hidden) {
      setBookingOpen(false);
      return;
    }
    const momentsOv = document.getElementById('moments-overlay');
    if (momentsOv && !momentsOv.hidden) {
      if (e.key === 'Escape') {
        setMomentsOpen(false);
        return;
      }
      if (e.key === 'ArrowLeft') {
        renderMoment(activeMomentIndex - 1);
        return;
      }
      if (e.key === 'ArrowRight') {
        renderMoment(activeMomentIndex + 1);
        return;
      }
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
