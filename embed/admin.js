'use strict';

(function () {
  const STORAGE_KEY = 'silerchef_admin_token';

  const state = {
    bootstrap: null,
    activeTab: 'homepage',
    selectedCuisineSlug: '',
    selectedServiceSlug: '',
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

  function setMessage(el, text, isError) {
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
    el.className = isError ? 'error' : 'status';
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

  function setActiveTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('.admin-tab').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.tab === tabName);
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

  function renderReservations() {
    const reservations = state.bootstrap.reservations || [];
    const container = byId('reservations-list');
    const empty = byId('reservations-empty');
    container.innerHTML = '';
    empty.hidden = reservations.length > 0;
    reservations.forEach((row) => {
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
            <p class="reservation-body">Date: ${esc(row.request.preferredDate || '-')}\nTime: ${esc(row.request.preferredTime || '-')}\nGuests: ${esc(row.request.guestCount == null ? '-' : row.request.guestCount)}${row.request.notes ? `\nNotes: ${esc(row.request.notes)}` : ''}</p>
          </div>
          <div>
            <p class="panel-kicker">Reservation workflow</p>
            <p class="reservation-body">Managed inside the private Siler Chef reservation dashboard.\nReservation ID: ${esc(row.id || '-')}</p>
          </div>
        </div>
      `;

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
    renderHomepageFields();
    renderCuisineSelect();
    renderMenuEditor();
    renderServiceSelect();
    renderServiceEditor();
    renderAvailabilityEditor();
    renderReservations();
    renderAnalytics();
  }

  async function loadBootstrap() {
    const res = await apiFetch('/api/admin/bootstrap');
    if (res.status === 401) {
      setToken('');
      byId('dashboard').hidden = true;
      byId('logout-btn').hidden = true;
      byId('login-card').hidden = false;
      return;
    }
    if (!res.ok) throw new Error('Unable to load admin data');
    state.bootstrap = await res.json();
    byId('login-card').hidden = true;
    byId('dashboard').hidden = false;
    byId('logout-btn').hidden = false;
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
    const form = new FormData(event.currentTarget);
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
      event.currentTarget.reset();
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

  byId('logout-btn').addEventListener('click', () => {
    setToken('');
    state.bootstrap = null;
    byId('dashboard').hidden = true;
    byId('logout-btn').hidden = true;
    byId('login-card').hidden = false;
  });

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

  if (getToken()) {
    loadBootstrap().catch(() => {
      setToken('');
      byId('login-card').hidden = false;
    });
  }
})();
