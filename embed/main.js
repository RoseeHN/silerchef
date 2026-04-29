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

  const SLOTS = 8;

  function buildGallery(basePath, altPrefix) {
    const wrap = document.createElement('div');
    wrap.className = 'gallery-grid';
    for (let i = 1; i <= SLOTS; i++) {
      const n = String(i).padStart(2, '0');
      const figure = document.createElement('figure');
      figure.className = 'gallery-card';
      const img = document.createElement('img');
      img.src = `${basePath}/${n}.jpg`;
      img.alt = `${altPrefix} — photo ${i}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => figure.classList.add('is-placeholder'));
      figure.appendChild(img);
      const cap = document.createElement('figcaption');
      cap.textContent = `${n}.jpg`;
      figure.appendChild(cap);
      wrap.appendChild(figure);
    }
    return wrap;
  }

  function mountList(containerId, items, baseFolder) {
    const root = document.getElementById(containerId);
    if (!root) return;
    items.forEach((item) => {
      const section = document.createElement('section');
      section.className = 'flow-section gallery-block observe';
      section.id = item.slug;
      const h = document.createElement('h3');
      h.className = 'section-subtitle';
      h.textContent = item.title;
      section.appendChild(h);
      const base = `${baseFolder}/${item.slug}`;
      section.appendChild(buildGallery(base, item.title));
      root.appendChild(section);
    });
  }

  mountList('cuisines-mount', CUISINES, 'images/cuisines');
  mountList('services-mount', SERVICES, 'images/services-and-occasions');

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

  const y = window.scrollY;
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
