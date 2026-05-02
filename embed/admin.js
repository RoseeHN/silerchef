'use strict';

(function () {
  const STORAGE_KEY = 'silerchef_admin_token';

  const state = {
    bootstrap: null,
    activeTab: 'homepage',
    selectedCuisineSlug: '',
    selectedServiceSlug: '',
    reservationSearch: '',
    reservationStatusFilter: 'all',
  };

  function getApiBase() {
    const base = window.__SILERCHEF_API_BASE__ || '';
    return base ? String(base).replace(/\/$/, '') : '';
  }

  function apiUrl(path) {
    const base = getApiBase();
    return base ? base + path : path;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function lower(value) {
    return String(value == null ? '' : value).trim().toLowerCase();
  }

  function isPlaceholderCopy(value) {
    const text = lower(value);
    return (
      text.includes('placeholder') ||
      text.includes('space reserved') ||
      text.includes('reserve this block') ||
      text.includes('ready for chef fikret') ||
      text.includes('upcoming workshop') ||
      text.includes('use this area to') ||
      text.includes('add how') ||
      text.includes('add whether')
    );
  }

  function formatRouteLabel(value) {
    return value ? 'Configured' : 'Not set';
  }

  function setMessage(el, text, isError) {
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
    el.className = isError ? 'error' : 'status';
  }

  function setAdminMode(mode) {
    document.body.classList.remove('admin-authenticated', 'admin-logged-out', 'admin-auth-pending');
    if (mode === 'authenticated') {
      document.body.classList.add('admin-authenticated');
      return;
    }
    if (mode === 'pending') {
      document.body.classList.add('admin-auth-pending');
      return;
    }
    document.body.classList.add('admin-logged-out');
  }

  function getToken() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  function setToken(token) {
    if (!token) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, token);
  }

  async function apiFetch(path, options) {
    const token = getToken();
    const headers = {
      ...(options && options.headers ? options.headers : {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(apiUrl(path), { ...(options || {}), headers });
  }

  function showLoggedOutView() {
    byId('admin-stage').hidden = false;
    byId('login-card').hidden = false;
    byId('dashboard').hidden = true;
    byId('logout-btn').hidden = true;
    if (byId('sidebar-logout-btn')) byId('sidebar-logout-btn').hidden = true;
    setAdminMode('logged-out');
  }

  function showPendingView() {
    byId('admin-stage').hidden = true;
    byId('dashboard').hidden = true;
    byId('logout-btn').hidden = true;
    if (byId('sidebar-logout-btn')) byId('sidebar-logout-btn').hidden = true;
    setAdminMode('pending');
  }

  function showAuthenticatedView() {
    byId('admin-stage').hidden = true;
    byId('dashboard').hidden = false;
    byId('logout-btn').hidden = true;
    if (byId('sidebar-logout-btn')) byId('sidebar-logout-btn').hidden = false;
    setAdminMode('authenticated');
  }

  function formatDateTime(isoText) {
    if (!isoText) return 'Unknown';
    const dt = new Date(isoText);
    if (Number.isNaN(dt.getTime())) return isoText;
    return dt.toLocaleString();
  }

  function formatCount(value) {
    return new Intl.NumberFormat('en-US').format(Number(value || 0));
  }

  function formatPercent(value) {
    return `${Number(value || 0).toFixed(1)}%`;
  }

  function normalizePhoneForWhatsApp(value) {
    const digits = String(value || '').replace(/\D+/g, '');
    if (!digits) return '';
    return digits.startsWith('00') ? digits.slice(2) : digits;
  }

  function updateSummary() {
    const availability = state.bootstrap ? state.bootstrap.availability : { blockedDates: [] };
    const reservations = state.bootstrap ? state.bootstrap.reservations : [];
    const metrics = state.bootstrap ? state.bootstrap.metrics || {} : {};
    const overview = metrics.overview || {};
    byId('summary-blocked').textContent = String((availability.blockedDates || []).length);
    byId('summary-reservations').textContent = String(reservations.length);
    byId('summary-pending').textContent = String(
      reservations.filter((row) => row.status === 'pending').length
    );
    byId('summary-pageviews').textContent = formatCount(overview.pageViews || 0);
    byId('summary-whatsapp').textContent = formatCount(overview.whatsappClicks || 0);
  }

  function getTopRow(rows) {
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  function buildWebsiteSectionHref(hash) {
    const content = getContent();
    const base = content && content.site && content.site.contact ? content.site.contact.websiteHref : '';
    return `${base || '/'}${hash || ''}`;
  }

  function renderDashboardInsights() {
    if (!state.bootstrap) return;
    const content = getContent();
    const booking = content.site.booking || {};
    const metrics = state.bootstrap.metrics || {};
    const overview = metrics.overview || {};
    const recentActivity = metrics.recentActivity || {};
    const topCuisine = getTopRow((metrics.topContent || {}).cuisines || []);
    const topService = getTopRow((metrics.topContent || {}).services || []);
    const reservations = state.bootstrap.reservations || [];
    const blockedDates = state.bootstrap.availability ? state.bootstrap.availability.blockedDates || [] : [];
    const education = content.services['chef-education'] || { intro: '', blocks: [] };
    const educationPlaceholder =
      isPlaceholderCopy(education.intro) ||
      (education.blocks || []).some((block) =>
        isPlaceholderCopy(block.title) || (block.items || []).some((item) => isPlaceholderCopy(item.desc) || isPlaceholderCopy(item.name))
      );

    const actionCard = byId('action-center-card');
    const routingCard = byId('routing-overview-card');
    const contentCard = byId('content-health-card');
    const trafficCard = byId('traffic-insight-card');

    if (actionCard) {
      const actionLines = [];
      if (!reservations.length) actionLines.push('No reservation requests yet');
      if (!overview.bookingOpens && overview.pageViews > 0) actionLines.push('Guests are viewing the site but not opening the booking form');
      if (educationPlaceholder) actionLines.push('Education section still reads like a draft');
      if (!actionLines.length) actionLines.push('Reservation flow, scheduling, and content are all live');

      actionCard.innerHTML = `
        <p class="panel-kicker">Action center</p>
        <h3>What needs attention next</h3>
        <div class="utility-meta">
          <span class="utility-pill">${esc(`${reservations.length} request${reservations.length === 1 ? '' : 's'}`)}</span>
          <span class="utility-pill">${esc(`${blockedDates.length} blocked date${blockedDates.length === 1 ? '' : 's'}`)}</span>
        </div>
        <ul class="utility-list">
          ${actionLines.map((line) => `<li>${esc(line)}</li>`).join('')}
        </ul>
        <div class="utility-actions">
          <button class="ghost-button utility-link" type="button" data-jump-reservations>Review desk</button>
          <a class="ghost-link utility-link" href="${esc(buildWebsiteSectionHref('#contact'))}" target="_blank" rel="noopener noreferrer">Open website</a>
        </div>
      `;
    }

    if (routingCard) {
      routingCard.innerHTML = `
        <p class="panel-kicker">Routing</p>
        <h3>Where reservation requests land</h3>
        <div class="utility-specs">
          <div class="utility-spec"><span>Email alerts</span><strong>${esc(booking.notificationEmail || 'Dashboard only')}</strong></div>
          <div class="utility-spec"><span>Team WhatsApp</span><strong>${esc(formatRouteLabel(booking.teamWhatsAppHref))}</strong></div>
          <div class="utility-spec"><span>Webhook</span><strong>${esc(formatRouteLabel(booking.notificationWebhookUrl))}</strong></div>
          <div class="utility-spec"><span>Fallback CTA</span><strong>${esc(booking.fallbackUrl ? 'WhatsApp ready' : 'Missing')}</strong></div>
        </div>
        <p class="utility-note">Requests are always saved to the dashboard first, then mirrored to any extra routes you configure here.</p>
      `;
    }

    if (contentCard) {
      const healthLines = [];
      if (educationPlaceholder) healthLines.push('Private Lessons & Education still contains placeholder copy.');
      if (!content.site.contact.instagramHref) healthLines.push('Instagram link is missing.');
      if (!content.site.contact.facebookHref) healthLines.push('Facebook link is missing.');
      if (!booking.notificationEmail) healthLines.push('Reservation email route is not configured.');
      if (!healthLines.length) healthLines.push('Contact details, booking routes, and visible content look complete.');

      contentCard.innerHTML = `
        <p class="panel-kicker">Content health</p>
        <h3>Live copy and section readiness</h3>
        <ul class="utility-list">
          ${healthLines.map((line) => `<li>${esc(line)}</li>`).join('')}
        </ul>
        <div class="utility-meta">
          <span class="utility-pill">${esc(`${content.cuisineCards.length} cuisines live`)}</span>
          <span class="utility-pill">${esc(`${content.serviceCards.length} services live`)}</span>
        </div>
      `;
    }

    if (trafficCard) {
      const insights = [];
      if (topCuisine) insights.push(`Top cuisine interest: ${topCuisine.title} (${formatCount(topCuisine.count)} opens)`);
      if (topService) insights.push(`Top service interest: ${topService.title} (${formatCount(topService.count)} opens)`);
      if (overview.pageViews > 0 && !overview.bookingOpens) insights.push('Booking popup still has 0 opens, so the main CTA likely needs more emphasis.');
      if (overview.whatsappClicks > 0) insights.push(`WhatsApp is being used (${formatCount(overview.whatsappClicks)} click${overview.whatsappClicks === 1 ? '' : 's'}).`);

      trafficCard.innerHTML = `
        <p class="panel-kicker">Traffic insight</p>
        <h3>What visitor behavior is saying</h3>
        <ul class="utility-list">
          ${insights.map((line) => `<li>${esc(line)}</li>`).join('')}
        </ul>
        <p class="utility-note">Last tracked event: ${esc(formatDateTime(recentActivity.lastEventAt))}</p>
      `;
    }
  }

  function setActiveTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('.admin-tab').forEach((btn) => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.panel === tabName);
    });
  }

  function getContent() {
    return state.bootstrap ? state.bootstrap.content : null;
  }

  function getCuisineCard(slug) {
    const content = getContent();
    return content.cuisineCards.find((row) => row.slug === slug);
  }

  function getServiceCard(slug) {
    const content = getContent();
    return content.serviceCards.find((row) => row.slug === slug);
  }

  function renderHomepageFields() {
    const site = getContent().site;
    byId('homepage-fields').innerHTML = `
      <label class="field">
        <span>Hero headline</span>
        <input id="hp-hero-headline" type="text" value="${esc(site.hero.headline)}" />
      </label>
      <label class="field">
        <span>Hero short line</span>
        <input id="hp-hero-tagline" type="text" value="${esc(site.hero.tagline)}" />
      </label>
      <label class="field field--full">
        <span>Hero description</span>
        <textarea id="hp-hero-lede" rows="4">${esc(site.hero.lede)}</textarea>
      </label>

      <label class="field field--full">
        <span>Homepage quote</span>
        <textarea id="hp-quote-text" rows="3">${esc(site.quote.text)}</textarea>
      </label>
      <label class="field">
        <span>Quote author</span>
        <input id="hp-quote-cite" type="text" value="${esc(site.quote.cite)}" />
      </label>
      <div class="field"></div>

      <label class="field field--full">
        <span>Cuisines section intro</span>
        <textarea id="hp-cuisines-lede" rows="3">${esc(site.cuisinesSection.lede)}</textarea>
      </label>
      <label class="field">
        <span>Cuisines notice title</span>
        <input id="hp-cuisines-kicker" type="text" value="${esc(site.cuisinesSection.noticeKicker)}" />
      </label>
      <label class="field field--full">
        <span>Cuisines notice text</span>
        <textarea id="hp-cuisines-body" rows="3">${esc(site.cuisinesSection.noticeBody)}</textarea>
      </label>

      <label class="field field--full">
        <span>Services section intro</span>
        <textarea id="hp-services-lede" rows="3">${esc(site.servicesSection.lede)}</textarea>
      </label>
      <label class="field">
        <span>Services notice title</span>
        <input id="hp-services-kicker" type="text" value="${esc(site.servicesSection.noticeKicker)}" />
      </label>
      <label class="field field--full">
        <span>Services notice text</span>
        <textarea id="hp-services-body" rows="3">${esc(site.servicesSection.noticeBody)}</textarea>
      </label>

      <label class="field">
        <span>Craft heading small title</span>
        <input id="hp-craft-eyebrow" type="text" value="${esc(site.craft.eyebrow)}" />
      </label>
      <label class="field">
        <span>Craft main title</span>
        <input id="hp-craft-title" type="text" value="${esc(site.craft.title)}" />
      </label>
      <label class="field field--full">
        <span>Craft paragraph 1</span>
        <textarea id="hp-craft-body1" rows="4">${esc(site.craft.body1)}</textarea>
      </label>
      <label class="field field--full">
        <span>Craft paragraph 2</span>
        <textarea id="hp-craft-body2" rows="4">${esc(site.craft.body2)}</textarea>
      </label>

      <label class="field">
        <span>Homepage CTA title</span>
        <input id="hp-cta-headline" type="text" value="${esc(site.cta.headline)}" />
      </label>
      <label class="field field--full">
        <span>Homepage CTA text</span>
        <textarea id="hp-cta-summary" rows="3">${esc(site.cta.summary)}</textarea>
      </label>

      <label class="field">
        <span>Booking popup title</span>
        <input id="hp-booking-title" type="text" value="${esc(site.booking.title)}" />
      </label>
      <label class="field field--full">
        <span>Booking popup text</span>
        <textarea id="hp-booking-lede" rows="3">${esc(site.booking.lede)}</textarea>
      </label>
      <label class="field">
        <span>Booking success title</span>
        <input id="hp-booking-success-title" type="text" value="${esc(site.booking.successTitle)}" />
      </label>
      <label class="field field--full">
        <span>Booking success text</span>
        <textarea id="hp-booking-success-text" rows="3">${esc(site.booking.successText)}</textarea>
      </label>
      <label class="field field--full">
        <span>Booking fallback link</span>
        <input id="hp-booking-fallback-url" type="url" value="${esc(site.booking.fallbackUrl)}" />
      </label>
      <label class="field">
        <span>Reservation alert email</span>
        <input id="hp-booking-notification-email" type="email" value="${esc(site.booking.notificationEmail || '')}" placeholder="reservations@silerchef.com" />
      </label>
      <label class="field">
        <span>Team WhatsApp shortcut</span>
        <input id="hp-booking-team-whatsapp" type="url" value="${esc(site.booking.teamWhatsAppHref || '')}" placeholder="https://wa.me/17753896677" />
      </label>
      <label class="field field--full">
        <span>Optional notification webhook</span>
        <input id="hp-booking-webhook-url" type="url" value="${esc(site.booking.notificationWebhookUrl || '')}" placeholder="Optional: Make, Zapier, Slack, or custom endpoint" />
      </label>

      <label class="field field--full">
        <span>Menu detail note</span>
        <textarea id="hp-detail-notice" rows="3">${esc(site.detailNotice)}</textarea>
      </label>

      <label class="field">
        <span>Contact title</span>
        <input id="hp-contact-title" type="text" value="${esc(site.contact.title)}" />
      </label>
      <label class="field field--full">
        <span>Contact subtitle</span>
        <textarea id="hp-contact-subtitle" rows="2">${esc(site.contact.subtitle)}</textarea>
      </label>
      <label class="field">
        <span>Phone</span>
        <input id="hp-contact-phone" type="text" value="${esc(site.contact.phone)}" />
      </label>
      <label class="field">
        <span>Phone link</span>
        <input id="hp-contact-phone-href" type="text" value="${esc(site.contact.phoneHref)}" />
      </label>
      <label class="field">
        <span>Email</span>
        <input id="hp-contact-email" type="text" value="${esc(site.contact.email)}" />
      </label>
      <label class="field">
        <span>Email link</span>
        <input id="hp-contact-email-href" type="text" value="${esc(site.contact.emailHref)}" />
      </label>
      <label class="field">
        <span>Website text</span>
        <input id="hp-contact-website" type="text" value="${esc(site.contact.website)}" />
      </label>
      <label class="field">
        <span>Website link</span>
        <input id="hp-contact-website-href" type="url" value="${esc(site.contact.websiteHref)}" />
      </label>
      <label class="field field--full">
        <span>Location line</span>
        <input id="hp-contact-location" type="text" value="${esc(site.contact.location)}" />
      </label>
      <label class="field">
        <span>Instagram link</span>
        <input id="hp-contact-instagram" type="url" value="${esc(site.contact.instagramHref)}" />
      </label>
      <label class="field">
        <span>WhatsApp link</span>
        <input id="hp-contact-whatsapp" type="url" value="${esc(site.contact.whatsappHref)}" />
      </label>
      <label class="field">
        <span>Facebook link</span>
        <input id="hp-contact-facebook" type="url" value="${esc(site.contact.facebookHref)}" />
      </label>
    `;
  }

  function blockEditorHtml(prefix, block, blockIndex) {
    const itemsHtml = (block.items || [])
      .map(
        (item, itemIndex) => `
          <div class="editor-item">
            <h4>Dish ${itemIndex + 1}</h4>
            <div class="form-layout">
              <label class="field">
                <span>Dish title</span>
                <input type="text" id="${prefix}-block-${blockIndex}-item-${itemIndex}-name" value="${esc(item.name)}" />
              </label>
              <label class="field field--full">
                <span>Description</span>
                <textarea id="${prefix}-block-${blockIndex}-item-${itemIndex}-desc" rows="3">${esc(item.desc)}</textarea>
              </label>
            </div>
          </div>
        `
      )
      .join('');

    return `
      <section class="editor-block">
        <div class="form-layout">
          <label class="field">
            <span>Block title</span>
            <input type="text" id="${prefix}-block-${blockIndex}-title" value="${esc(block.title)}" />
          </label>
          <label class="field field--full">
            <span>Image path</span>
            <input type="text" id="${prefix}-block-${blockIndex}-image" value="${esc(block.image || '')}" />
          </label>
        </div>
        <div class="editor-items">${itemsHtml}</div>
      </section>
    `;
  }

  function renderCuisineSelect() {
    const select = byId('cuisine-select');
    const content = getContent();
    select.innerHTML = content.cuisineCards
      .map((card) => `<option value="${esc(card.slug)}">${esc(card.title)}</option>`)
      .join('');
    if (!state.selectedCuisineSlug || !content.cuisineCards.some((card) => card.slug === state.selectedCuisineSlug)) {
      state.selectedCuisineSlug = content.cuisineCards[0] ? content.cuisineCards[0].slug : '';
    }
    select.value = state.selectedCuisineSlug;
  }

  function renderMenuEditor() {
    const slug = state.selectedCuisineSlug;
    const card = getCuisineCard(slug);
    const detail = getContent().cuisines[slug];
    if (!card || !detail) return;
    renderMenuPreview(card, detail);
    byId('menu-editor').innerHTML = `
      <div class="editor-shell">
        <section class="editor-card">
          <h3>Card settings</h3>
          <p class="editor-help">These fields control the cuisine tile visible on the website.</p>
          <div class="form-layout">
            <label class="field">
              <span>Card title</span>
              <input type="text" id="menu-card-title" value="${esc(card.title)}" />
            </label>
            <label class="field">
              <span>Card number</span>
              <input type="text" id="menu-card-no" value="${esc(card.no)}" />
            </label>
            <label class="field field--full">
              <span>Card tagline</span>
              <textarea id="menu-card-tagline" rows="2">${esc(card.tagline)}</textarea>
            </label>
            <label class="field field--full">
              <span>Detail intro paragraph</span>
              <textarea id="menu-intro" rows="4">${esc(detail.intro)}</textarea>
            </label>
          </div>
        </section>

        <section class="editor-card">
          <h3>Sample menu blocks</h3>
          <p class="editor-help">Each block is one sample menu set shown when the guest opens this cuisine.</p>
          <div class="editor-blocks">
            ${(detail.blocks || []).map((block, index) => blockEditorHtml('menu', block, index)).join('')}
          </div>
        </section>
      </div>
    `;
  }

  function renderMenuPreview(card, detail) {
    const preview = byId('menu-preview');
    if (!preview) return;
    const blocks = detail.blocks || [];
    const hero = blocks[0] || {};
    preview.innerHTML = `
      <article class="editor-preview-card">
        <div class="editor-preview-card__media">
          ${hero.image ? `<img src="${esc(hero.image)}" alt="${esc(card.title)} preview image" loading="lazy" />` : '<div class="editor-preview-card__placeholder">No image selected</div>'}
        </div>
        <div class="editor-preview-card__body">
          <p class="panel-kicker">Live preview</p>
          <h3>${esc(card.no)} · ${esc(card.title)}</h3>
          <p class="editor-preview-card__tagline">${esc(card.tagline)}</p>
          <div class="utility-meta">
            <span class="utility-pill">${esc(`${blocks.length} sample set${blocks.length === 1 ? '' : 's'}`)}</span>
            <span class="utility-pill">${esc(`${(hero.items || []).length} dishes in first set`)}</span>
          </div>
          <p class="utility-note">${esc(detail.intro)}</p>
          <div class="utility-actions">
            <a class="ghost-link utility-link" href="${esc(buildWebsiteSectionHref('#cuisines'))}" target="_blank" rel="noopener noreferrer">Open public section</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderServiceSelect() {
    const select = byId('service-select');
    const content = getContent();
    select.innerHTML = content.serviceCards
      .map((card) => `<option value="${esc(card.slug)}">${esc(card.title)}</option>`)
      .join('');
    if (!state.selectedServiceSlug || !content.serviceCards.some((card) => card.slug === state.selectedServiceSlug)) {
      state.selectedServiceSlug = content.serviceCards[0] ? content.serviceCards[0].slug : '';
    }
    select.value = state.selectedServiceSlug;
  }

  function renderServiceEditor() {
    const slug = state.selectedServiceSlug;
    const card = getServiceCard(slug);
    const detail = getContent().services[slug];
    if (!card || !detail) return;
    renderServicePreview(card, detail, slug);
    byId('service-editor').innerHTML = `
      <div class="editor-shell">
        <section class="editor-card">
          <h3>Card settings</h3>
          <p class="editor-help">These fields control the service card visible on the website.</p>
          <div class="form-layout">
            <label class="field">
              <span>Card title</span>
              <input type="text" id="service-card-title" value="${esc(card.title)}" />
            </label>
            <label class="field">
              <span>Card number</span>
              <input type="text" id="service-card-no" value="${esc(card.no)}" />
            </label>
            <label class="field field--full">
              <span>Card tagline</span>
              <textarea id="service-card-tagline" rows="2">${esc(card.tagline)}</textarea>
            </label>
            <label class="field field--full">
              <span>Detail intro paragraph</span>
              <textarea id="service-intro" rows="4">${esc(detail.intro)}</textarea>
            </label>
          </div>
        </section>

        <section class="editor-card">
          <h3>Detail sections</h3>
          <p class="editor-help">These blocks appear inside the opened service detail view.</p>
          <div class="editor-blocks">
            ${(detail.blocks || []).map((block, index) => blockEditorHtml('service', block, index)).join('')}
          </div>
        </section>
      </div>
    `;
  }

  function renderServicePreview(card, detail, slug) {
    const preview = byId('service-preview');
    if (!preview) return;
    const blocks = detail.blocks || [];
    const hero = blocks[0] || {};
    const needsDraftWarning =
      slug === 'chef-education' &&
      (isPlaceholderCopy(detail.intro) ||
        blocks.some((block) => isPlaceholderCopy(block.title) || (block.items || []).some((item) => isPlaceholderCopy(item.desc) || isPlaceholderCopy(item.name))));

    preview.innerHTML = `
      <article class="editor-preview-card">
        <div class="editor-preview-card__media">
          ${hero.image ? `<img src="${esc(hero.image)}" alt="${esc(card.title)} preview image" loading="lazy" />` : '<div class="editor-preview-card__placeholder">No image selected</div>'}
        </div>
        <div class="editor-preview-card__body">
          <p class="panel-kicker">Live preview</p>
          <h3>${esc(card.no)} · ${esc(card.title)}</h3>
          <p class="editor-preview-card__tagline">${esc(card.tagline)}</p>
          <div class="utility-meta">
            <span class="utility-pill">${esc(`${blocks.length} detail block${blocks.length === 1 ? '' : 's'}`)}</span>
            <span class="utility-pill ${needsDraftWarning ? 'utility-pill--warn' : ''}">${needsDraftWarning ? 'Draft copy still present' : 'Ready for guests'}</span>
          </div>
          <p class="utility-note">${esc(detail.intro)}</p>
          ${
            needsDraftWarning
              ? '<p class="editor-draft-note">This section still contains placeholder education copy. Replacing it with Chef Fikret\'s real curriculum will make this area feel production-ready.</p>'
              : ''
          }
          <div class="utility-actions">
            <a class="ghost-link utility-link" href="${esc(buildWebsiteSectionHref('#services'))}" target="_blank" rel="noopener noreferrer">Open public section</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderAvailabilityEditor() {
    const rows = state.bootstrap.availability.blockedDates || [];
    byId('availability-note').value = state.bootstrap.availability.note || '';
    byId('blocked-dates-list').innerHTML = rows
      .map(
        (row, index) => `
          <div class="row-card" data-row-index="${index}">
            <div class="row-card__grid">
              <label class="field">
                <span>Date</span>
                <input type="date" data-blocked-date value="${esc(row.date)}" />
              </label>
              <label class="field">
                <span>Reason</span>
                <input type="text" data-blocked-label value="${esc(row.label || '')}" placeholder="Private event, travel day..." />
              </label>
              <button class="danger-button" type="button" data-remove-blocked="${index}">Remove</button>
            </div>
          </div>
        `
      )
      .join('');
  }

  function getReservationCounts(rows) {
    return ['pending', 'confirmed', 'completed', 'cancelled', 'blocked'].map((status) => ({
      status,
      count: rows.filter((row) => row.status === status).length,
    }));
  }

  function getFilteredReservations() {
    const reservations = (state.bootstrap && state.bootstrap.reservations) || [];
    const query = lower(state.reservationSearch);
    const status = state.reservationStatusFilter;
    return reservations
      .slice()
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .filter((row) => {
        if (status !== 'all' && row.status !== status) return false;
        if (!query) return true;
        const haystack = [
          row.customer && row.customer.firstName,
          row.customer && row.customer.lastName,
          row.customer && row.customer.email,
          row.customer && row.customer.phone,
          row.request && row.request.zipCode,
          row.request && row.request.notes,
          row.adminNote,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
  }

  function renderReservationMiniStats(rows) {
    const shell = byId('reservation-mini-stats');
    if (!shell) return;
    const counts = getReservationCounts((state.bootstrap && state.bootstrap.reservations) || []);
    const filteredCount = rows.length;
    shell.innerHTML = `
      <span class="utility-pill">${esc(`${filteredCount} visible`)}</span>
      ${counts
        .map(
          (entry) =>
            `<span class="utility-pill ${state.reservationStatusFilter === entry.status ? 'utility-pill--active' : ''}">${esc(
              `${entry.status}: ${entry.count}`
            )}</span>`
        )
        .join('')}
    `;
  }

  function renderReservations() {
    const reservations = getFilteredReservations();
    const container = byId('reservations-list');
    const empty = byId('reservations-empty');
    renderReservationRoutingNote();
    renderReservationMiniStats(reservations);
    container.innerHTML = '';
    empty.hidden = reservations.length > 0;
    if (empty) {
      if ((state.bootstrap.reservations || []).length === 0) {
        empty.innerHTML = `
          <strong>No reservation requests yet.</strong>
          <p>The desk is live and ready. Until the first request lands, the most valuable next step is pushing guests toward the booking popup or the WhatsApp route.</p>
          <div class="utility-actions">
            <a class="ghost-link utility-link" href="${esc(buildWebsiteSectionHref('#contact'))}" target="_blank" rel="noopener noreferrer">Open public contact area</a>
            <button class="ghost-button utility-link" type="button" data-jump-homepage>Review booking routing</button>
          </div>
        `;
      } else {
        empty.innerHTML = `
          <strong>No reservations match these filters.</strong>
          <p>Try a different status or clear the guest search to see all requests again.</p>
        `;
      }
    }
    reservations.forEach((row) => {
      const requestLines = [
        `Date: ${esc(row.request.preferredDate || '-')}`,
        `Time: ${esc(row.request.preferredTime || '-')}`,
        `Guests: ${esc(row.request.guestCount == null ? '-' : row.request.guestCount)}`,
        `ZIP code: ${esc(row.request.zipCode || '-')}`,
        `Preferred follow-up: ${esc(formatPreferredContact(row.request.preferredContact || 'any'))}`,
      ];
      if (row.request.notes) requestLines.push(`Notes: ${esc(row.request.notes)}`);

      const notificationSummary = summarizeReservationNotifications(row.notifications || {});
      const card = document.createElement('article');
      card.className = 'reservation-card';
      card.innerHTML = `
        <div class="reservation-head">
          <div>
            <h3 class="reservation-title">${esc(row.customer.firstName)} ${esc(row.customer.lastName)}</h3>
            <div class="reservation-meta">
              <span>${esc(row.customer.email)}</span>
              <span>${esc(row.customer.phone || 'No phone')}</span>
              <span>${esc(formatDateTime(row.createdAt))}</span>
            </div>
          </div>
          <span class="reservation-chip">${esc(row.status)}</span>
        </div>
        <div class="reservation-grid">
          <div>
            <p class="panel-kicker">Request details</p>
            <p class="reservation-body">${requestLines.join('\n')}</p>
          </div>
          <div>
            <p class="panel-kicker">Reservation workflow</p>
            <p class="reservation-body">Managed inside the private Siler Chef reservation dashboard.\nReservation ID: ${esc(row.id || '-')}\nFollow-up happens from this panel by phone, email, or WhatsApp.\nAlerts: ${esc(notificationSummary)}</p>
          </div>
        </div>
      `;

      const contactRow = document.createElement('div');
      contactRow.className = 'reservation-contact';

      const contactHead = document.createElement('p');
      contactHead.className = 'panel-kicker';
      contactHead.textContent = 'Guest follow-up';
      contactRow.appendChild(contactHead);

      const quickActions = document.createElement('div');
      quickActions.className = 'reservation-contact-actions';

      if (row.customer.email) {
        const emailLink = document.createElement('a');
        emailLink.className = 'ghost-link reservation-quick-link';
        emailLink.href = `mailto:${row.customer.email}`;
        emailLink.textContent = 'Email guest';
        quickActions.appendChild(emailLink);
      }

      if (row.customer.phone) {
        const callLink = document.createElement('a');
        callLink.className = 'ghost-link reservation-quick-link';
        callLink.href = `tel:${row.customer.phone}`;
        callLink.textContent = 'Call guest';
        quickActions.appendChild(callLink);

        const waDigits = normalizePhoneForWhatsApp(row.customer.phone);
        if (waDigits) {
          const waLink = document.createElement('a');
          waLink.className = 'ghost-link reservation-quick-link';
          waLink.href = `https://wa.me/${waDigits}`;
          waLink.target = '_blank';
          waLink.rel = 'noopener noreferrer';
          waLink.textContent = 'WhatsApp guest';
          quickActions.appendChild(waLink);
        }
      }

      const contactHelp = document.createElement('p');
      contactHelp.className = 'reservation-helper';
      contactHelp.textContent =
        'Each request is saved in the database and appears here immediately. Use the shortcuts above to reach the guest, then save your internal note and status.';

      contactRow.appendChild(quickActions);
      contactRow.appendChild(contactHelp);
      card.appendChild(contactRow);

      const actions = document.createElement('div');
      actions.className = 'reservation-actions';

      const statusSelect = document.createElement('select');
      ['pending', 'confirmed', 'completed', 'cancelled', 'blocked'].forEach((status) => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        if (row.status === status) option.selected = true;
        statusSelect.appendChild(option);
      });

      const noteInput = document.createElement('textarea');
      noteInput.className = 'reservation-note';
      noteInput.rows = 3;
      noteInput.placeholder = 'Internal note for this reservation';
      noteInput.value = row.adminNote || '';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'primary-button';
      saveBtn.textContent = 'Save reservation';
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        try {
          const res = await apiFetch(`/api/admin/reservations/${row.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: statusSelect.value,
              adminNote: noteInput.value,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.detail || data.error || 'Unable to save reservation');
          const idx = state.bootstrap.reservations.findIndex((item) => item.id === row.id);
          if (idx !== -1) state.bootstrap.reservations[idx] = data.reservation;
          renderReservations();
          updateSummary();
        } catch (err) {
          alert(err.message || 'Unable to save reservation');
        } finally {
          saveBtn.disabled = false;
        }
      });

      card.appendChild(noteInput);
      actions.appendChild(statusSelect);
      actions.appendChild(saveBtn);
      card.appendChild(actions);
      container.appendChild(card);
    });
  }

  function summarizeReservationNotifications(notifications) {
    if (!notifications || typeof notifications !== 'object') return 'Dashboard only';
    const parts = [];
    const emailStatus = notifications.email && notifications.email.status;
    const webhookStatus = notifications.webhook && notifications.webhook.status;
    const teamStatus = notifications.teamWhatsApp && notifications.teamWhatsApp.status;
    if (emailStatus && emailStatus !== 'skipped') parts.push(`Email ${emailStatus}`);
    if (webhookStatus && webhookStatus !== 'skipped') parts.push(`Webhook ${webhookStatus}`);
    if (teamStatus === 'configured') parts.push('WhatsApp shortcut ready');
    return parts.length ? parts.join(' · ') : 'Dashboard only';
  }

  function formatPreferredContact(value) {
    const key = String(value || 'any').toLowerCase();
    const labels = {
      any: 'Any method',
      phone: 'Phone call',
      email: 'Email',
      whatsapp: 'WhatsApp',
      text: 'Text message',
    };
    return labels[key] || 'Any method';
  }

  function renderReservationRoutingNote() {
    const note = byId('reservation-routing-note');
    if (!note) return;
    const content = state.bootstrap && state.bootstrap.content;
    const booking = content && content.site ? content.site.booking || {} : {};
    const routes = [];
    if (booking.notificationEmail) routes.push(`Email alerts: ${booking.notificationEmail}`);
    if (booking.teamWhatsAppHref) routes.push('Team WhatsApp shortcut configured');
    if (booking.notificationWebhookUrl) routes.push('Webhook alerts configured');

    note.hidden = false;
    note.innerHTML = `
      <p class="panel-kicker">Active routing</p>
      <p>${esc(
        routes.length
          ? `Every request is stored here first. Mirror routes currently enabled: ${routes.join(' · ')}.`
          : 'Every request is stored here first. Add an email inbox, WhatsApp shortcut, or webhook from the Homepage tab when you are ready.'
      )}</p>
    `;
  }

  function renderAnalytics() {
    const metrics = (state.bootstrap && state.bootstrap.metrics) || {};
    const overview = metrics.overview || {};
    const topContent = metrics.topContent || {};
    const recentActivity = metrics.recentActivity || {};
    const optimization = metrics.optimization || {};
    const statuses = metrics.statuses || {};
    const panel = byId('analytics-panel');
    if (!panel) return;

    const cuisineRows = (topContent.cuisines || []).length
      ? topContent.cuisines
          .map(
            (row) => `
              <div class="analytics-list__row">
                <span>${esc(row.title)}</span>
                <strong>${formatCount(row.count)}</strong>
              </div>
            `
          )
          .join('')
      : '<p class="empty-state">No cuisine opens tracked yet.</p>';

    const serviceRows = (topContent.services || []).length
      ? topContent.services
          .map(
            (row) => `
              <div class="analytics-list__row">
                <span>${esc(row.title)}</span>
                <strong>${formatCount(row.count)}</strong>
              </div>
            `
          )
          .join('')
      : '<p class="empty-state">No service opens tracked yet.</p>';

    const clickRows = (topContent.clickTargets || []).length
      ? topContent.clickTargets
          .map(
            (row) => `
              <div class="analytics-list__row">
                <span>${esc(row.label)}</span>
                <strong>${formatCount(row.count)}</strong>
              </div>
            `
          )
          .join('')
      : '<p class="empty-state">No click targets tracked yet.</p>';

    const checkRows = (optimization.checks || [])
      .map(
        (check) => `
          <article class="seo-check seo-check--${esc(check.status || 'info')}">
            <div class="seo-check__head">
              <strong>${esc(check.label)}</strong>
              <span class="seo-check__badge">${esc((check.status || 'info').toUpperCase())}</span>
            </div>
            <p>${esc(check.detail || '')}</p>
          </article>
        `
      )
      .join('');

    panel.innerHTML = `
      <div class="analytics-kpis">
        <article class="panel summary-card">
          <span class="summary-label">Page views</span>
          <strong>${formatCount(overview.pageViews)}</strong>
          <small class="summary-sub">Unique sessions: ${formatCount(overview.uniqueSessions)}</small>
        </article>
        <article class="panel summary-card">
          <span class="summary-label">Booking opens</span>
          <strong>${formatCount(overview.bookingOpens)}</strong>
          <small class="summary-sub">Open rate: ${formatPercent(overview.bookingOpenRate)}</small>
        </article>
        <article class="panel summary-card">
          <span class="summary-label">Reservation submits</span>
          <strong>${formatCount(overview.reservationSubmits)}</strong>
          <small class="summary-sub">Page conversion: ${formatPercent(overview.reservationConversionRate)}</small>
        </article>
        <article class="panel summary-card">
          <span class="summary-label">WhatsApp clicks</span>
          <strong>${formatCount(overview.whatsappClicks)}</strong>
          <small class="summary-sub">Share of page views: ${formatPercent(overview.whatsappShare)}</small>
        </article>
        <article class="panel summary-card">
          <span class="summary-label">Cuisine opens</span>
          <strong>${formatCount(overview.cuisineOpens)}</strong>
          <small class="summary-sub">Service opens: ${formatCount(overview.serviceOpens)}</small>
        </article>
        <article class="panel summary-card">
          <span class="summary-label">Tracked events</span>
          <strong>${formatCount(overview.trackedEvents)}</strong>
          <small class="summary-sub">Navigation clicks: ${formatCount(overview.navClicks)}</small>
        </article>
      </div>

      <div class="analytics-columns">
        <section class="panel analytics-block">
          <div class="panel-head panel-head--tight">
            <div>
              <p class="panel-kicker">Conversion funnel</p>
              <h3>Guest intent to reservation flow</h3>
            </div>
          </div>
          <div class="analytics-funnel">
            <div class="analytics-list__row"><span>Booking to reservation rate</span><strong>${formatPercent(overview.bookingToReservationRate)}</strong></div>
            <div class="analytics-list__row"><span>Contact clicks</span><strong>${formatCount(overview.contactClicks)}</strong></div>
            <div class="analytics-list__row"><span>Social clicks</span><strong>${formatCount(overview.socialClicks)}</strong></div>
            <div class="analytics-list__row"><span>Last tracked event</span><strong>${esc(formatDateTime(recentActivity.lastEventAt))}</strong></div>
            <div class="analytics-list__row"><span>Last reservation request</span><strong>${esc(formatDateTime(recentActivity.lastReservationAt))}</strong></div>
            <div class="analytics-list__row"><span>Page views in last 7 days</span><strong>${formatCount(recentActivity.pageViewsLast7Days)}</strong></div>
            <div class="analytics-list__row"><span>Booking opens in last 7 days</span><strong>${formatCount(recentActivity.bookingOpensLast7Days)}</strong></div>
            <div class="analytics-list__row"><span>Reservation submits in last 7 days</span><strong>${formatCount(recentActivity.reservationSubmitsLast7Days)}</strong></div>
          </div>
        </section>

        <section class="panel analytics-block">
          <div class="panel-head panel-head--tight">
            <div>
              <p class="panel-kicker">Reservation pipeline</p>
              <h3>Status distribution</h3>
            </div>
          </div>
          <div class="analytics-funnel">
            <div class="analytics-list__row"><span>Pending</span><strong>${formatCount(statuses.pending)}</strong></div>
            <div class="analytics-list__row"><span>Confirmed</span><strong>${formatCount(statuses.confirmed)}</strong></div>
            <div class="analytics-list__row"><span>Completed</span><strong>${formatCount(statuses.completed)}</strong></div>
            <div class="analytics-list__row"><span>Cancelled</span><strong>${formatCount(statuses.cancelled)}</strong></div>
            <div class="analytics-list__row"><span>Blocked</span><strong>${formatCount(statuses.blocked)}</strong></div>
          </div>
        </section>
      </div>

      <div class="analytics-columns analytics-columns--triple">
        <section class="panel analytics-block">
          <div class="panel-head panel-head--tight">
            <div>
              <p class="panel-kicker">Popular menus</p>
              <h3>Most opened cuisines</h3>
            </div>
          </div>
          <div class="analytics-list">${cuisineRows}</div>
        </section>

        <section class="panel analytics-block">
          <div class="panel-head panel-head--tight">
            <div>
              <p class="panel-kicker">Popular occasions</p>
              <h3>Most opened services</h3>
            </div>
          </div>
          <div class="analytics-list">${serviceRows}</div>
        </section>

        <section class="panel analytics-block">
          <div class="panel-head panel-head--tight">
            <div>
              <p class="panel-kicker">Click heat</p>
              <h3>Strongest targets</h3>
            </div>
          </div>
          <div class="analytics-list">${clickRows}</div>
        </section>
      </div>

      <section class="panel analytics-block">
        <div class="panel-head panel-head--tight">
          <div>
            <p class="panel-kicker">Optimization snapshot</p>
            <h3>SEO and technical readiness</h3>
          </div>
        </div>
        <div class="seo-checks">${checkRows}</div>
      </section>
    `;
  }

  function renderDashboard() {
    updateSummary();
    renderDashboardInsights();
    renderHomepageFields();
    renderCuisineSelect();
    renderMenuEditor();
    renderServiceSelect();
    renderServiceEditor();
    renderAvailabilityEditor();
    renderReservations();
    renderAnalytics();
  }

  function syncGlobalLinks() {
    const content = getContent();
    if (!content || !content.site || !content.site.contact) return;
    const href = content.site.contact.websiteHref || '/';
    ['open-website-link', 'sidebar-open-website-link'].forEach((id) => {
      const link = byId(id);
      if (link) link.href = href;
    });
  }

  async function loadBootstrap() {
    const res = await apiFetch('/api/admin/bootstrap');
    if (res.status === 401) {
      setToken('');
      showLoggedOutView();
      return;
    }
    if (!res.ok) throw new Error('Unable to load admin data');
    state.bootstrap = await res.json();
    showAuthenticatedView();
    syncGlobalLinks();
    renderDashboard();
    setActiveTab(state.activeTab);
  }

  function collectHomepageContent() {
    const next = clone(state.bootstrap.content);
    next.site.hero.headline = byId('hp-hero-headline').value.trim();
    next.site.hero.tagline = byId('hp-hero-tagline').value.trim();
    next.site.hero.lede = byId('hp-hero-lede').value.trim();
    next.site.quote.text = byId('hp-quote-text').value.trim();
    next.site.quote.cite = byId('hp-quote-cite').value.trim();
    next.site.cuisinesSection.lede = byId('hp-cuisines-lede').value.trim();
    next.site.cuisinesSection.noticeKicker = byId('hp-cuisines-kicker').value.trim();
    next.site.cuisinesSection.noticeBody = byId('hp-cuisines-body').value.trim();
    next.site.servicesSection.lede = byId('hp-services-lede').value.trim();
    next.site.servicesSection.noticeKicker = byId('hp-services-kicker').value.trim();
    next.site.servicesSection.noticeBody = byId('hp-services-body').value.trim();
    next.site.craft.eyebrow = byId('hp-craft-eyebrow').value.trim();
    next.site.craft.title = byId('hp-craft-title').value.trim();
    next.site.craft.body1 = byId('hp-craft-body1').value.trim();
    next.site.craft.body2 = byId('hp-craft-body2').value.trim();
    next.site.cta.headline = byId('hp-cta-headline').value.trim();
    next.site.cta.summary = byId('hp-cta-summary').value.trim();
    next.site.booking.title = byId('hp-booking-title').value.trim();
    next.site.booking.lede = byId('hp-booking-lede').value.trim();
    next.site.booking.successTitle = byId('hp-booking-success-title').value.trim();
    next.site.booking.successText = byId('hp-booking-success-text').value.trim();
    next.site.booking.fallbackUrl = byId('hp-booking-fallback-url').value.trim();
    next.site.booking.notificationEmail = byId('hp-booking-notification-email').value.trim();
    next.site.booking.teamWhatsAppHref = byId('hp-booking-team-whatsapp').value.trim();
    next.site.booking.notificationWebhookUrl = byId('hp-booking-webhook-url').value.trim();
    next.site.detailNotice = byId('hp-detail-notice').value.trim();
    next.site.contact.title = byId('hp-contact-title').value.trim();
    next.site.contact.subtitle = byId('hp-contact-subtitle').value.trim();
    next.site.contact.phone = byId('hp-contact-phone').value.trim();
    next.site.contact.phoneHref = byId('hp-contact-phone-href').value.trim();
    next.site.contact.email = byId('hp-contact-email').value.trim();
    next.site.contact.emailHref = byId('hp-contact-email-href').value.trim();
    next.site.contact.website = byId('hp-contact-website').value.trim();
    next.site.contact.websiteHref = byId('hp-contact-website-href').value.trim();
    next.site.contact.location = byId('hp-contact-location').value.trim();
    next.site.contact.instagramHref = byId('hp-contact-instagram').value.trim();
    next.site.contact.whatsappHref = byId('hp-contact-whatsapp').value.trim();
    next.site.contact.facebookHref = byId('hp-contact-facebook').value.trim();
    return next;
  }

  function collectBlocks(prefix, baseBlocks) {
    return baseBlocks.map((block, blockIndex) => ({
      title: byId(`${prefix}-block-${blockIndex}-title`).value.trim(),
      image: byId(`${prefix}-block-${blockIndex}-image`).value.trim(),
      items: (block.items || []).map((item, itemIndex) => ({
        name: byId(`${prefix}-block-${blockIndex}-item-${itemIndex}-name`).value.trim(),
        desc: byId(`${prefix}-block-${blockIndex}-item-${itemIndex}-desc`).value.trim(),
      })),
    }));
  }

  function collectCuisineContent() {
    const next = clone(state.bootstrap.content);
    const slug = state.selectedCuisineSlug;
    const card = next.cuisineCards.find((row) => row.slug === slug);
    const detail = next.cuisines[slug];
    card.title = byId('menu-card-title').value.trim();
    card.no = byId('menu-card-no').value.trim();
    card.tagline = byId('menu-card-tagline').value.trim();
    detail.intro = byId('menu-intro').value.trim();
    detail.blocks = collectBlocks('menu', detail.blocks);
    return next;
  }

  function collectServiceContent() {
    const next = clone(state.bootstrap.content);
    const slug = state.selectedServiceSlug;
    const card = next.serviceCards.find((row) => row.slug === slug);
    const detail = next.services[slug];
    card.title = byId('service-card-title').value.trim();
    card.no = byId('service-card-no').value.trim();
    card.tagline = byId('service-card-tagline').value.trim();
    detail.intro = byId('service-intro').value.trim();
    detail.blocks = collectBlocks('service', detail.blocks);
    return next;
  }

  function collectAvailability() {
    const blockedDates = Array.from(document.querySelectorAll('#blocked-dates-list .row-card')).map((row) => ({
      date: row.querySelector('[data-blocked-date]').value,
      label: row.querySelector('[data-blocked-label]').value.trim(),
    }));
    return {
      note: byId('availability-note').value.trim(),
      blockedDates: blockedDates.filter((row) => row.date),
    };
  }

  async function saveContent(nextContent, statusId, successText) {
    const statusEl = byId(statusId);
    setMessage(statusEl, '', false);
    try {
      const res = await apiFetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextContent),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || 'Unable to save content');
      state.bootstrap.content = data.content;
      renderDashboard();
      setActiveTab(state.activeTab);
      setMessage(statusEl, successText, false);
    } catch (err) {
      setMessage(statusEl, err.message || 'Unable to save content', true);
    }
  }

  async function saveAvailability() {
    const statusEl = byId('availability-status');
    setMessage(statusEl, '', false);
    try {
      const res = await apiFetch('/api/admin/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectAvailability()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || 'Unable to save availability');
      state.bootstrap.availability = data.availability;
      renderAvailabilityEditor();
      updateSummary();
      setMessage(statusEl, 'Availability saved successfully.', false);
    } catch (err) {
      setMessage(statusEl, err.message || 'Unable to save availability', true);
    }
  }

  byId('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(byId('login-error'), '', true);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    try {
      const res = await fetch(apiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.get('username'),
          password: form.get('password'),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || 'Login failed');
      setToken(data.token);
      formEl.reset();
      await loadBootstrap();
    } catch (err) {
      setMessage(byId('login-error'), err.message || 'Login failed', true);
    }
  });

  byId('save-homepage-btn').addEventListener('click', () => {
    saveContent(collectHomepageContent(), 'homepage-status', 'Homepage content saved successfully.');
  });

  byId('save-menus-btn').addEventListener('click', () => {
    saveContent(collectCuisineContent(), 'menus-status', 'Selected cuisine saved successfully.');
  });

  byId('save-services-btn').addEventListener('click', () => {
    saveContent(collectServiceContent(), 'services-status', 'Selected service saved successfully.');
  });

  byId('save-availability-btn').addEventListener('click', () => {
    saveAvailability();
  });

  byId('refresh-btn').addEventListener('click', async () => {
    await loadBootstrap().catch((err) => alert(err.message || 'Unable to refresh data'));
  });

  byId('refresh-metrics-btn').addEventListener('click', async () => {
    await loadBootstrap().catch((err) => alert(err.message || 'Unable to refresh metrics'));
  });

  function handleLogout() {
    setToken('');
    state.bootstrap = null;
    showLoggedOutView();
  }

  byId('logout-btn').addEventListener('click', handleLogout);
  if (byId('sidebar-logout-btn')) {
    byId('sidebar-logout-btn').addEventListener('click', handleLogout);
  }

  document.querySelectorAll('.admin-tab').forEach((btn) => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });

  byId('cuisine-select').addEventListener('change', (event) => {
    state.selectedCuisineSlug = event.target.value;
    renderMenuEditor();
  });

  byId('service-select').addEventListener('change', (event) => {
    state.selectedServiceSlug = event.target.value;
    renderServiceEditor();
  });

  byId('reservation-search').addEventListener('input', (event) => {
    state.reservationSearch = event.target.value || '';
    renderReservations();
  });

  byId('reservation-status-filter').addEventListener('change', (event) => {
    state.reservationStatusFilter = event.target.value || 'all';
    renderReservations();
  });

  byId('add-blocked-date-btn').addEventListener('click', () => {
    if (!state.bootstrap) return;
    state.bootstrap.availability.blockedDates.push({ date: '', label: '' });
    renderAvailabilityEditor();
  });

  byId('blocked-dates-list').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-remove-blocked]');
    if (!btn || !state.bootstrap) return;
    const index = Number(btn.getAttribute('data-remove-blocked'));
    state.bootstrap.availability.blockedDates.splice(index, 1);
    renderAvailabilityEditor();
  });

  document.addEventListener('click', (event) => {
    const jumpBtn = event.target.closest('[data-jump-homepage]');
    if (jumpBtn) {
      setActiveTab('homepage');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const reservationsBtn = event.target.closest('[data-jump-reservations]');
    if (reservationsBtn) {
      setActiveTab('reservations');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  if (getToken()) {
    showPendingView();
    loadBootstrap().catch(() => {
      setToken('');
      showLoggedOutView();
    });
  } else {
    showLoggedOutView();
  }
})();
