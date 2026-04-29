'use strict';

(function () {
  const CUISINES = [
    { slug: 'american-cuisine', title: 'American Cuisine' },
    { slug: 'french-cuisine', title: 'French Cuisine' },
    { slug: 'greek-cuisine', title: 'Greek Cuisine' },
    { slug: 'italian-cuisine', title: 'Italian Cuisine' },
    { slug: 'middle-eastern-cuisine', title: 'Middle Eastern Cuisine' },
    { slug: 'turkish-cuisine', title: 'Turkish Cuisine' },
  ];

  const SERVICES = [
    { slug: 'anniversary-celebrations', title: 'Anniversary Celebrations' },
    { slug: 'birthday-events', title: 'Birthday Events' },
    { slug: 'family-dinners', title: 'Family Dinners' },
    { slug: 'special-events', title: 'Special Events' },
    { slug: 'special-occasion-dining', title: 'Special Occasion Dining' },
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

  async function collectGalleryUrls(baseFolder, slug) {
    const base = `${baseFolder}/${slug}`;
    const found = [];
    const hero = await probeImage(`${base}/hero.jpg`);
    if (hero) found.push(hero);

    for (let i = 1; i <= 14; i++) {
      const u = `${base}/gallery/${pad2(i)}.jpg`;
      const ok = await probeImage(u);
      if (ok) found.push(ok);
    }

    if (found.length <= (hero ? 1 : 0)) {
      for (let i = 1; i <= 8; i++) {
        const u = `${base}/${pad2(i)}.jpg`;
        const ok = await probeImage(u);
        if (ok) found.push(ok);
      }
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
      article.className = 'meal-card observe';
      const h = document.createElement('h4');
      h.className = 'meal-card-title';
      h.textContent = block.title;
      article.appendChild(h);
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
      article.appendChild(ul);
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
      { rootMargin: '0px 0px -6% 0px', threshold: 0.08 }
    );
    root.querySelectorAll('.observe').forEach((el) => io.observe(el));
  }

  let stripScrollHandler = null;

  function setupCarousel(heroEl, stripEl, urls) {
    heroEl.removeAttribute('src');
    stripEl.innerHTML = '';
    const prevBtn = document.querySelector('.detail-strip-prev');
    const nextBtn = document.querySelector('.detail-strip-next');

    if (stripScrollHandler && prevBtn && nextBtn) {
      prevBtn.removeEventListener('click', stripScrollHandler.prev);
      nextBtn.removeEventListener('click', stripScrollHandler.next);
      stripScrollHandler = null;
    }

    if (!urls.length) {
      heroEl.alt = '';
      heroEl.style.display = 'none';
      heroEl.parentElement.classList.add('is-empty');
      return;
    }

    heroEl.style.display = '';
    heroEl.parentElement.classList.remove('is-empty');
    heroEl.src = urls[0];
    heroEl.alt = 'Gallery';

    urls.forEach((url, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'detail-thumb' + (idx === 0 ? ' is-active' : '');
      b.setAttribute('aria-label', 'Show image ' + (idx + 1));
      const im = document.createElement('img');
      im.src = url;
      im.alt = '';
      im.loading = 'lazy';
      b.appendChild(im);
      b.addEventListener('click', () => {
        heroEl.src = url;
        stripEl.querySelectorAll('.detail-thumb').forEach((t) => t.classList.remove('is-active'));
        b.classList.add('is-active');
      });
      stripEl.appendChild(b);
    });

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

    collectGalleryUrls(baseFolder, slug).then((urls) => {
      setupCarousel(detailHero, detailStrip, urls);
    });

    if (detailClose) detailClose.focus();
  }

  function closeDetail() {
    if (!overlay) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('detail-open');
  }

  function mountHub(containerId, items, kind, baseFolder) {
    const root = document.getElementById(containerId);
    if (!root) return;
    const grid = document.createElement('div');
    grid.className = 'hub-grid';

    items.forEach((item) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'hub-card observe';
      card.setAttribute('aria-haspopup', 'dialog');

      const visual = document.createElement('div');
      visual.className = 'hub-card-visual';
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.src = `${baseFolder}/${item.slug}/thumb.jpg`;
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

      card.appendChild(visual);
      card.appendChild(body);

      card.addEventListener('click', () => openDetail(kind, item.slug, item.title));

      grid.appendChild(card);
    });

    root.appendChild(grid);
    observeFresh(root);
  }

  mountHub('cuisines-mount', CUISINES, 'cuisine', 'images/cuisines');
  mountHub('services-mount', SERVICES, 'service', 'images/services-and-occasions');

  if (detailClose) detailClose.addEventListener('click', closeDetail);
  const backdropEl = overlay && overlay.querySelector('.detail-backdrop');
  if (backdropEl) backdropEl.addEventListener('click', closeDetail);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && !overlay.hidden) closeDetail();
  });

  const nav = document.getElementById('site-nav');
  const toggle = document.querySelector('.nav-toggle');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', () => {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const onScroll = () => {
    document.documentElement.classList.toggle('is-scrolled', window.scrollY > 40);
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
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    io.observe(el);
  });
})();
