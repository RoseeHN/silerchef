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
    simpleMode: true,
    sidebarOpen: false,
    editorPanels: {
      menu: { block: 0, item: '0:0' },
      service: { block: 0, item: '0:0' },
    },
  };

  const TAB_COPY = {
    homepage: {
      kicker: 'Homepage command',
      title: 'Shape the first impression guests get from the brand',
      note: 'Hero copy, booking messaging, and contact routing live here. This is the fastest place to sharpen positioning and conversion.',
      badges: ['Hero narrative', 'Booking CTA', 'Contact routing'],
      actions: [
        { type: 'button', label: 'Edit homepage copy', jump: 'homepage' },
        { type: 'link', label: 'Open homepage', href: '#home' },
      ],
    },
    menus: {
      kicker: 'Menus workspace',
      title: 'Curate cuisine stories, sample sets, and food-led persuasion',
      note: 'Use this section to keep cuisine cards aspirational and the menu details aligned with the experience guests are shopping for.',
      badges: ['Cuisine cards', 'Sample menus', 'Photo pairing'],
      actions: [
        { type: 'button', label: 'Go to cuisines', jump: 'menus' },
        { type: 'link', label: 'Open cuisines section', href: '#cuisines' },
      ],
    },
    services: {
      kicker: 'Services workspace',
      title: 'Design the offer structure behind each occasion',
      note: 'Services should explain how the night flows, what the guest receives, and why each format feels premium and intentional.',
      badges: ['Occasions', 'Lessons', 'Detail blocks'],
      actions: [
        { type: 'button', label: 'Edit services', jump: 'services' },
        { type: 'link', label: 'Open services section', href: '#services' },
      ],
    },
    availability: {
      kicker: 'Availability control',
      title: 'Keep the calendar clean before reservations turn into friction',
      note: 'Blocked dates and planning notes should be current so guests never submit for dates that are already unavailable.',
      badges: ['Blocked dates', 'Planning note', 'Booking guardrails'],
      actions: [
        { type: 'button', label: 'Manage availability', jump: 'availability' },
        { type: 'button', label: 'Review reservation desk', jump: 'reservations' },
      ],
    },
    reservations: {
      kicker: 'Reservation desk',
      title: 'Turn incoming requests into fast, high-touch follow-up',
      note: 'This view is about response speed, clear status management, and making it easy to call, email, or WhatsApp the guest right away.',
      badges: ['Guest pipeline', 'Follow-up', 'Status tracking'],
      actions: [
        { type: 'button', label: 'Review requests', jump: 'reservations' },
        { type: 'link', label: 'Open contact section', href: '#contact' },
      ],
    },
    analytics: {
      kicker: 'Analytics and SEO',
      title: 'Read demand signals and tighten the conversion path',
      note: 'This layer should tell you what guests open, where interest is building, and which sections still need SEO or booking refinements.',
      badges: ['Traffic', 'Content demand', 'Optimization'],
      actions: [
        { type: 'button', label: 'Refresh metrics', jump: 'analytics' },
        { type: 'link', label: 'Open live website', href: '#home' },
      ],
    },
  };

  function getApiBase() {
    if (typeof window !== 'undefined' && window.__SILERCHEF_API_BASE__) {
      const b = String(window.__SILERCHEF_API_BASE__).trim();
      if (b) return b.replace(/\/$/, '');
    }
    const meta = document.querySelector('meta[name="silerchef-api-base"]');
    if (meta) {
      const raw = String(meta.getAttribute('content') || '').trim();
      if (raw) return raw.replace(/\/$/, '');
    }
    return '';
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

  function getEditorPanelState(prefix) {
    if (!state.editorPanels[prefix]) {
      state.editorPanels[prefix] = { block: 0, item: '0:0' };
    }
    return state.editorPanels[prefix];
  }

  function ensureEditorExpansion(prefix, blocks) {
    const panelState = getEditorPanelState(prefix);
    const safeBlocks = Array.isArray(blocks) ? blocks : [];
    if (!safeBlocks.length) {
      panelState.block = null;
      panelState.item = null;
      return;
    }

    const maxBlockIndex = safeBlocks.length - 1;
    if (typeof panelState.block !== 'number' || panelState.block < 0 || panelState.block > maxBlockIndex) {
      panelState.block = 0;
    }

    const activeBlock = safeBlocks[panelState.block] || safeBlocks[0];
    const items = Array.isArray(activeBlock && activeBlock.items) ? activeBlock.items : [];
    if (!items.length) {
      panelState.item = null;
      return;
    }

    const currentItem = String(panelState.item || '');
    const [blockRaw, itemRaw] = currentItem.split(':').map((value) => Number(value));
    if (blockRaw !== panelState.block || !Number.isInteger(itemRaw) || itemRaw < 0 || itemRaw >= items.length) {
      panelState.item = `${panelState.block}:0`;
    }
  }

  function isBlockExpanded(prefix, blockIndex) {
    return getEditorPanelState(prefix).block === blockIndex;
  }

  function isItemExpanded(prefix, blockIndex, itemIndex) {
    return getEditorPanelState(prefix).item === `${blockIndex}:${itemIndex}`;
  }

  function toggleEditorBlock(prefix, blockIndex) {
    const panelState = getEditorPanelState(prefix);
    panelState.block = panelState.block === blockIndex ? null : blockIndex;
    if (panelState.block == null) {
      panelState.item = null;
    } else {
      panelState.item = `${blockIndex}:0`;
    }
    rerenderEditor(prefix);
  }

  function toggleEditorItem(prefix, blockIndex, itemIndex) {
    const panelState = getEditorPanelState(prefix);
    const key = `${blockIndex}:${itemIndex}`;
    panelState.block = blockIndex;
    panelState.item = panelState.item === key ? null : key;
    rerenderEditor(prefix);
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

  function syncSimpleModeUI() {
    document.body.classList.toggle('admin-simple-mode', !!state.simpleMode);
    const label = `Simple mode: ${state.simpleMode ? 'On' : 'Off'}`;
    ['simple-mode-btn', 'simple-mode-btn-mobile'].forEach((id) => {
      const button = byId(id);
      if (button) {
        button.textContent = label;
        button.setAttribute('aria-pressed', state.simpleMode ? 'true' : 'false');
      }
    });
  }

  function setSidebarOpen(open) {
    state.sidebarOpen = !!open;
    document.body.classList.toggle('sidebar-open', state.sidebarOpen);
    const backdrop = byId('sidebar-backdrop');
    if (backdrop) {
      backdrop.hidden = !state.sidebarOpen;
    }
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
    setSidebarOpen(false);
  }

  function showPendingView() {
    byId('admin-stage').hidden = true;
    byId('dashboard').hidden = true;
    byId('logout-btn').hidden = true;
    if (byId('sidebar-logout-btn')) byId('sidebar-logout-btn').hidden = true;
    setAdminMode('pending');
    setSidebarOpen(false);
  }

  function showAuthenticatedView() {
    byId('admin-stage').hidden = true;
    byId('dashboard').hidden = false;
    byId('logout-btn').hidden = true;
    if (byId('sidebar-logout-btn')) byId('sidebar-logout-btn').hidden = false;
    setAdminMode('authenticated');
    syncSimpleModeUI();
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

  function getCurrentCuisineCard() {
    const content = getContent();
    if (!content || !content.cuisineCards || !content.cuisineCards.length) return null;
    return getCuisineCard(state.selectedCuisineSlug || content.cuisineCards[0].slug);
  }

  function getCurrentServiceCard() {
    const content = getContent();
    if (!content || !content.serviceCards || !content.serviceCards.length) return null;
    return getServiceCard(state.selectedServiceSlug || content.serviceCards[0].slug);
  }

  function renderOverviewFrame(config) {
    const overview = config || TAB_COPY.homepage;
    byId('overview-kicker').textContent = overview.kicker;
    byId('overview-title').textContent = overview.title;
    byId('overview-note').textContent = overview.note;
    byId('overview-badges').innerHTML = (overview.badges || [])
      .map((badge) => `<span class="overview-badge">${esc(badge)}</span>`)
      .join('');
    byId('overview-actions').innerHTML = (overview.actions || [])
      .map((action) => {
        if (action.type === 'button') {
          return `<button class="ghost-button overview-action" type="button" data-jump-tab="${esc(action.jump)}">${esc(action.label)}</button>`;
        }
        return `<a class="ghost-link overview-action" href="${esc(buildWebsiteSectionHref(action.href || ''))}" target="_blank" rel="noopener noreferrer">${esc(action.label)}</a>`;
      })
      .join('');
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
    const availabilityNote = state.bootstrap.availability ? state.bootstrap.availability.note || '' : '';
    const education = content.services['chef-education'] || { intro: '', blocks: [] };
    const educationPlaceholder =
      isPlaceholderCopy(education.intro) ||
      (education.blocks || []).some((block) =>
        isPlaceholderCopy(block.title) || (block.items || []).some((item) => isPlaceholderCopy(item.desc) || isPlaceholderCopy(item.name))
      );
    const pendingReservations = reservations.filter((row) => row.status === 'pending');
    const currentCuisine = getCurrentCuisineCard();
    const currentService = getCurrentServiceCard();

    const actionCard = byId('action-center-card');
    const routingCard = byId('routing-overview-card');
    const contentCard = byId('content-health-card');
    const trafficCard = byId('traffic-insight-card');

    renderOverviewFrame(TAB_COPY[state.activeTab] || TAB_COPY.homepage);

    if (state.activeTab === 'menus') {
      if (actionCard) {
        actionCard.innerHTML = `
          <p class="panel-kicker">Selected cuisine</p>
          <h3>${esc(currentCuisine ? currentCuisine.title : 'Cuisine selection')}</h3>
          <div class="utility-meta">
            <span class="utility-pill">${esc(currentCuisine ? currentCuisine.no : '--')}</span>
            <span class="utility-pill">${esc(topCuisine ? `${formatCount(topCuisine.count)} opens` : 'No opens yet')}</span>
          </div>
          <p class="utility-note">${esc(currentCuisine ? currentCuisine.tagline : 'Choose a cuisine card to edit its menu direction and visual tone.')}</p>
          <div class="utility-actions">
            <button class="ghost-button utility-link" type="button" data-jump-tab="menus">Edit this cuisine</button>
          </div>
        `;
      }

      if (routingCard) {
        routingCard.innerHTML = `
          <p class="panel-kicker">Menu structure</p>
          <h3>What the cuisine section is doing</h3>
          <div class="utility-specs">
            <div class="utility-spec"><span>Live cuisines</span><strong>${esc(String(content.cuisineCards.length))}</strong></div>
            <div class="utility-spec"><span>Top cuisine interest</span><strong>${esc(topCuisine ? topCuisine.title : 'No data yet')}</strong></div>
            <div class="utility-spec"><span>Current focus</span><strong>${esc(currentCuisine ? currentCuisine.title : 'Not selected')}</strong></div>
          </div>
          <p class="utility-note">The menu section should feel curated, visual, and easy to compare at a glance before the guest opens details.</p>
        `;
      }

      if (contentCard) {
        contentCard.innerHTML = `
          <p class="panel-kicker">Visual pairing</p>
          <h3>How this section reads right now</h3>
          <ul class="utility-list">
            <li>${esc(currentCuisine ? currentCuisine.title : 'Cuisine cards')} should lead with a strong regional identity.</li>
            <li>Keep each sample set distinct so the menus feel worth opening.</li>
            <li>Use imagery that immediately signals premium plating or craft.</li>
          </ul>
        `;
      }

      if (trafficCard) {
        trafficCard.innerHTML = `
          <p class="panel-kicker">Demand signal</p>
          <h3>What guests are opening in cuisines</h3>
          <ul class="utility-list">
            <li>${esc(topCuisine ? `${topCuisine.title} is currently the strongest pull.` : 'Cuisines have not gathered enough interaction yet.')}</li>
            <li>${esc(currentCuisine ? `${currentCuisine.title} is the card you are editing now.` : 'Select a cuisine to start refining it.')}</li>
            <li>Use this data to decide which cuisines deserve stronger hero imagery or shorter intros.</li>
          </ul>
          <p class="utility-note">Last tracked event: ${esc(formatDateTime(recentActivity.lastEventAt))}</p>
        `;
      }
      return;
    }

    if (state.activeTab === 'services') {
      if (actionCard) {
        actionCard.innerHTML = `
          <p class="panel-kicker">Selected service</p>
          <h3>${esc(currentService ? currentService.title : 'Service selection')}</h3>
          <div class="utility-meta">
            <span class="utility-pill">${esc(currentService ? currentService.no : '--')}</span>
            <span class="utility-pill">${esc(topService ? `${formatCount(topService.count)} opens` : 'No opens yet')}</span>
          </div>
          <p class="utility-note">${esc(currentService ? currentService.tagline : 'Choose a service card to refine its positioning, detail blocks, and photography.')}</p>
          <div class="utility-actions">
            <button class="ghost-button utility-link" type="button" data-jump-tab="services">Edit this service</button>
          </div>
        `;
      }

      if (routingCard) {
        routingCard.innerHTML = `
          <p class="panel-kicker">Offer structure</p>
          <h3>How the service section is framed</h3>
          <div class="utility-specs">
            <div class="utility-spec"><span>Live services</span><strong>${esc(String(content.serviceCards.length))}</strong></div>
            <div class="utility-spec"><span>Top service interest</span><strong>${esc(topService ? topService.title : 'No data yet')}</strong></div>
            <div class="utility-spec"><span>Current focus</span><strong>${esc(currentService ? currentService.title : 'Not selected')}</strong></div>
          </div>
          <p class="utility-note">Services should explain the event format clearly enough that guests can imagine the full flow before contacting you.</p>
        `;
      }

      if (contentCard) {
        const serviceLines = [];
        if (educationPlaceholder) serviceLines.push('Private Lessons & Education still contains placeholder copy.');
        serviceLines.push('Each service card should feel distinct, not like a duplicate with swapped wording.');
        serviceLines.push('Detail blocks should describe guest experience, not just ingredients or logistics.');
        contentCard.innerHTML = `
          <p class="panel-kicker">Experience design</p>
          <h3>What still needs sharpening</h3>
          <ul class="utility-list">${serviceLines.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>
        `;
      }

      if (trafficCard) {
        trafficCard.innerHTML = `
          <p class="panel-kicker">Guest interest</p>
          <h3>What visitor behavior is showing</h3>
          <ul class="utility-list">
            <li>${esc(topService ? `${topService.title} is pulling the most attention right now.` : 'Service cards have not built enough interaction yet.')}</li>
            <li>${esc(currentService ? `${currentService.title} is the current editing focus.` : 'Select a service to refine its structure.')}</li>
            <li>Strong service cards should immediately signal who the experience is for and what mood it creates.</li>
          </ul>
          <p class="utility-note">Last tracked event: ${esc(formatDateTime(recentActivity.lastEventAt))}</p>
        `;
      }
      return;
    }

    if (state.activeTab === 'availability') {
      if (actionCard) {
        actionCard.innerHTML = `
          <p class="panel-kicker">Calendar status</p>
          <h3>Availability guardrails</h3>
          <div class="utility-meta">
            <span class="utility-pill">${esc(`${blockedDates.length} blocked date${blockedDates.length === 1 ? '' : 's'}`)}</span>
            <span class="utility-pill">${esc(`${pendingReservations.length} pending request${pendingReservations.length === 1 ? '' : 's'}`)}</span>
          </div>
          <ul class="utility-list">
            <li>${esc(blockedDates.length ? 'Blocked dates are active and preventing those days from being requested.' : 'No blocked dates are active right now.')}</li>
            <li>${esc(availabilityNote ? 'A planning note is saved for internal scheduling.' : 'No internal planning note is saved yet.')}</li>
          </ul>
        `;
      }

      if (routingCard) {
        routingCard.innerHTML = `
          <p class="panel-kicker">Planning note</p>
          <h3>Internal scheduling context</h3>
          <p class="utility-note">${esc(availabilityNote || 'Add a note here when travel, event cadence, or seasonal workload should stay visible to the team.')}</p>
        `;
      }

      if (contentCard) {
        const datesPreview = blockedDates
          .slice(0, 3)
          .map((row) => `<li>${esc(row.date)}${row.label ? ` - ${esc(row.label)}` : ''}</li>`)
          .join('');
        contentCard.innerHTML = `
          <p class="panel-kicker">Upcoming closures</p>
          <h3>Dates the system is currently protecting</h3>
          ${blockedDates.length ? `<ul class="utility-list">${datesPreview}</ul>` : '<p class="utility-note">No dates are blocked yet.</p>'}
        `;
      }

      if (trafficCard) {
        trafficCard.innerHTML = `
          <p class="panel-kicker">Booking pressure</p>
          <h3>How availability connects to demand</h3>
          <ul class="utility-list">
            <li>${esc(overview.bookingOpens ? `${formatCount(overview.bookingOpens)} booking open${overview.bookingOpens === 1 ? '' : 's'} tracked so far.` : 'No booking-open events tracked yet.')}</li>
            <li>Keep closures current before demand rises so the desk does not spend time declining the wrong dates.</li>
          </ul>
        `;
      }
      return;
    }

    if (state.activeTab === 'reservations') {
      const recentReservation = reservations[0];
      if (actionCard) {
        actionCard.innerHTML = `
          <p class="panel-kicker">Reservation queue</p>
          <h3>What needs attention first</h3>
          <div class="utility-meta">
            <span class="utility-pill">${esc(`${pendingReservations.length} pending`)}</span>
            <span class="utility-pill">${esc(`${reservations.length} total`)}</span>
          </div>
          <ul class="utility-list">
            <li>${esc(pendingReservations.length ? 'Pending requests should be handled first for a premium response feel.' : 'No pending reservations are waiting right now.')}</li>
            <li>${esc(recentReservation ? `Latest request: ${recentReservation.firstName || 'Guest'} ${recentReservation.lastName || ''}`.trim() : 'No recent guest request has been stored yet.')}</li>
          </ul>
          <div class="utility-actions">
            <button class="ghost-button utility-link" type="button" data-jump-tab="reservations">Open reservation desk</button>
          </div>
        `;
      }

      if (routingCard) {
        routingCard.innerHTML = `
          <p class="panel-kicker">Follow-up routing</p>
          <h3>How the team responds</h3>
          <div class="utility-specs">
            <div class="utility-spec"><span>Email alerts</span><strong>${esc(booking.notificationEmail || 'Dashboard only')}</strong></div>
            <div class="utility-spec"><span>WhatsApp</span><strong>${esc(formatRouteLabel(booking.teamWhatsAppHref))}</strong></div>
            <div class="utility-spec"><span>Fallback CTA</span><strong>${esc(booking.fallbackUrl ? 'Ready' : 'Missing')}</strong></div>
          </div>
          <p class="utility-note">The desk should feel immediate: request stored, guest visible, follow-up channel obvious.</p>
        `;
      }

      if (contentCard) {
        contentCard.innerHTML = `
          <p class="panel-kicker">Desk quality</p>
          <h3>What makes this feel premium</h3>
          <ul class="utility-list">
            <li>Fast follow-up by the guest’s preferred contact channel.</li>
            <li>Clear statuses so no request disappears into the cracks.</li>
            <li>Guest count, event location, cuisine preference, and allergy notes captured before the first call.</li>
          </ul>
        `;
      }

      if (trafficCard) {
        trafficCard.innerHTML = `
          <p class="panel-kicker">Activity signal</p>
          <h3>Current reservation momentum</h3>
          <ul class="utility-list">
            <li>${esc(overview.reservationSubmits ? `${formatCount(overview.reservationSubmits)} reservation submit${overview.reservationSubmits === 1 ? '' : 's'} tracked.` : 'No reservation submits tracked yet.')}</li>
            <li>${esc(overview.whatsappClicks ? `${formatCount(overview.whatsappClicks)} WhatsApp click${overview.whatsappClicks === 1 ? '' : 's'} indicate direct contact intent.` : 'No WhatsApp clicks tracked yet.')}</li>
          </ul>
          <p class="utility-note">Last tracked event: ${esc(formatDateTime(recentActivity.lastEventAt))}</p>
        `;
      }
      return;
    }

    if (state.activeTab === 'analytics') {
      if (actionCard) {
        actionCard.innerHTML = `
          <p class="panel-kicker">Macro view</p>
          <h3>Topline performance</h3>
          <div class="utility-specs">
            <div class="utility-spec"><span>Page views</span><strong>${esc(formatCount(overview.pageViews || 0))}</strong></div>
            <div class="utility-spec"><span>Unique sessions</span><strong>${esc(formatCount(overview.uniqueSessions || 0))}</strong></div>
            <div class="utility-spec"><span>Booking opens</span><strong>${esc(formatCount(overview.bookingOpens || 0))}</strong></div>
            <div class="utility-spec"><span>Reservation submits</span><strong>${esc(formatCount(overview.reservationSubmits || 0))}</strong></div>
          </div>
        `;
      }

      if (routingCard) {
        routingCard.innerHTML = `
          <p class="panel-kicker">Content demand</p>
          <h3>What people are exploring most</h3>
          <ul class="utility-list">
            <li>${esc(topCuisine ? `${topCuisine.title} leads cuisine interest.` : 'No cuisine interaction data yet.')}</li>
            <li>${esc(topService ? `${topService.title} leads service interest.` : 'No service interaction data yet.')}</li>
            <li>${esc(overview.whatsappClicks ? `WhatsApp has ${formatCount(overview.whatsappClicks)} click${overview.whatsappClicks === 1 ? '' : 's'}.` : 'WhatsApp has no tracked clicks yet.')}</li>
          </ul>
        `;
      }

      if (contentCard) {
        contentCard.innerHTML = `
          <p class="panel-kicker">Optimization priorities</p>
          <h3>What to improve next</h3>
          <ul class="utility-list">
            <li>${esc(!overview.bookingOpens && overview.pageViews > 0 ? 'Guests are arriving but not opening booking yet.' : 'Booking-open behavior is being captured.')}</li>
            <li>${esc(educationPlaceholder ? 'Education content still reads like a draft and weakens trust.' : 'Education content looks production-ready.')}</li>
            <li>${esc(!content.site.contact.instagramHref || !content.site.contact.facebookHref ? 'Some social/contact proof is still incomplete.' : 'Core contact proof is present.')}</li>
            <li>${esc(!content.site.contact.yelpHref ? 'Yelp business link not set yet — strong for local discovery.' : 'Yelp is linked.')}</li>
          </ul>
        `;
      }

      if (trafficCard) {
        trafficCard.innerHTML = `
          <p class="panel-kicker">Tracking pulse</p>
          <h3>Current instrumentation snapshot</h3>
          <ul class="utility-list">
            <li>${esc(`Last tracked event: ${formatDateTime(recentActivity.lastEventAt)}`)}</li>
            <li>${esc(overview.pageViews ? `${formatPercent(((overview.bookingOpens || 0) / Math.max(overview.pageViews, 1)) * 100)} booking-open rate against page views.` : 'Need more traffic data before conversion rate reads matter.')}</li>
          </ul>
        `;
      }
      return;
    }

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
      if (!content.site.contact.yelpHref) healthLines.push('Yelp link is not set — add your listing URL for local search.');
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
      if (isActive) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.panel === tabName);
    });
    renderDashboardInsights();
    if (window.location.pathname.indexOf('/admin') !== -1) {
      window.history.replaceState(null, '', `#admin-${tabName}`);
    }
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
    const hero = site.hero || {};
    const experience = site.experience || {};
    const pillars = Array.isArray(site.pillars) ? site.pillars : [];
    const coverage = site.coverage || {};
    const faq = site.faq || {};
    const faqItems = Array.from({ length: 6 }, (_, index) => (Array.isArray(faq.items) && faq.items[index] ? faq.items[index] : { eyebrow: '', title: '', body: '' }));
    const heroProofChips = Array.from({ length: 3 }, (_, index) => (Array.isArray(hero.proofChips) && hero.proofChips[index] ? hero.proofChips[index] : ''));
    const booking = site.booking || {};
    const bookingHighlights = Array.from({ length: 3 }, (_, index) => (Array.isArray(booking.highlights) && booking.highlights[index] ? booking.highlights[index] : ''));
    const bookingSteps = Array.from({ length: 3 }, (_, index) => (Array.isArray(booking.steps) && booking.steps[index] ? booking.steps[index] : { title: '', body: '' }));
    const reel = site.reel || {};
    byId('homepage-fields').innerHTML = `
      <label class="field">
        <span>Hero headline</span>
        <input id="hp-hero-headline" type="text" value="${esc(hero.headline)}" />
      </label>
      <label class="field">
        <span>Hero short line</span>
        <input id="hp-hero-tagline" type="text" value="${esc(hero.tagline)}" />
      </label>
      <label class="field field--full">
        <span>Hero description</span>
        <textarea id="hp-hero-lede" rows="4">${esc(hero.lede)}</textarea>
      </label>
      <label class="field">
        <span>Hero floating card 1 eyebrow</span>
        <input id="hp-hero-floating-north-eyebrow" type="text" value="${esc(hero.floatingNorthEyebrow || '')}" />
      </label>
      <label class="field">
        <span>Hero floating card 1 title</span>
        <input id="hp-hero-floating-north-title" type="text" value="${esc(hero.floatingNorthTitle || '')}" />
      </label>
      <label class="field">
        <span>Hero floating card 2 eyebrow</span>
        <input id="hp-hero-floating-south-eyebrow" type="text" value="${esc(hero.floatingSouthEyebrow || '')}" />
      </label>
      <label class="field">
        <span>Hero floating card 2 title</span>
        <input id="hp-hero-floating-south-title" type="text" value="${esc(hero.floatingSouthTitle || '')}" />
      </label>
      ${[0, 1, 2]
        .map(
          (index) => `
            <label class="field">
              <span>Hero chip ${index + 1}</span>
              <input id="hp-hero-chip-${index}" type="text" value="${esc(heroProofChips[index])}" />
            </label>
          `
        )
        .join('')}
      <label class="field">
        <span>Hero mini card 1 eyebrow</span>
        <input id="hp-hero-mini-primary-eyebrow" type="text" value="${esc(hero.miniPrimaryEyebrow || '')}" />
      </label>
      <label class="field">
        <span>Hero mini card 1 title</span>
        <input id="hp-hero-mini-primary-title" type="text" value="${esc(hero.miniPrimaryTitle || '')}" />
      </label>
      <label class="field">
        <span>Hero mini card 2 eyebrow</span>
        <input id="hp-hero-mini-secondary-eyebrow" type="text" value="${esc(hero.miniSecondaryEyebrow || '')}" />
      </label>
      <label class="field">
        <span>Hero mini card 2 title</span>
        <input id="hp-hero-mini-secondary-title" type="text" value="${esc(hero.miniSecondaryTitle || '')}" />
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
        <span>Brand promise eyebrow</span>
        <input id="hp-experience-featured-eyebrow" type="text" value="${esc(experience.featuredEyebrow || '')}" />
      </label>
      <label class="field">
        <span>Brand promise title</span>
        <input id="hp-experience-featured-title" type="text" value="${esc(experience.featuredTitle || '')}" />
      </label>
      <label class="field field--full">
        <span>Brand promise body</span>
        <textarea id="hp-experience-featured-body" rows="4">${esc(experience.featuredBody || '')}</textarea>
      </label>
      <label class="field">
        <span>Hosting tile eyebrow</span>
        <input id="hp-experience-hosting-eyebrow" type="text" value="${esc(experience.hostingEyebrow || '')}" />
      </label>
      <label class="field">
        <span>Hosting tile title</span>
        <input id="hp-experience-hosting-title" type="text" value="${esc(experience.hostingTitle || '')}" />
      </label>
      <label class="field field--full">
        <span>Hosting tile body</span>
        <textarea id="hp-experience-hosting-body" rows="3">${esc(experience.hostingBody || '')}</textarea>
      </label>
      <label class="field">
        <span>Guest tile eyebrow</span>
        <input id="hp-experience-guest-eyebrow" type="text" value="${esc(experience.guestEyebrow || '')}" />
      </label>
      <label class="field">
        <span>Guest tile title</span>
        <input id="hp-experience-guest-title" type="text" value="${esc(experience.guestTitle || '')}" />
      </label>
      <label class="field field--full">
        <span>Guest tile body</span>
        <textarea id="hp-experience-guest-body" rows="3">${esc(experience.guestBody || '')}</textarea>
      </label>

      ${[0, 1, 2, 3]
        .map(
          (index) => `
            <label class="field">
              <span>Pillar ${index + 1} label</span>
              <input id="hp-pillar-${index}-label" type="text" value="${esc((pillars[index] && pillars[index].label) || '')}" />
            </label>
            <label class="field">
              <span>Pillar ${index + 1} title</span>
              <input id="hp-pillar-${index}-title" type="text" value="${esc((pillars[index] && pillars[index].title) || '')}" />
            </label>
            <label class="field field--full">
              <span>Pillar ${index + 1} meta</span>
              <textarea id="hp-pillar-${index}-meta" rows="2">${esc((pillars[index] && pillars[index].meta) || '')}</textarea>
            </label>
          `
        )
        .join('')}

      <label class="field">
        <span>Coverage eyebrow</span>
        <input id="hp-coverage-eyebrow" type="text" value="${esc(coverage.eyebrow || '')}" />
      </label>
      <label class="field">
        <span>Coverage title</span>
        <input id="hp-coverage-title" type="text" value="${esc(coverage.title || '')}" />
      </label>
      <label class="field field--full">
        <span>Coverage body</span>
        <textarea id="hp-coverage-body" rows="4">${esc(coverage.body || '')}</textarea>
      </label>
      ${[0, 1, 2, 3]
        .map(
          (index) => `
            <label class="field">
              <span>Coverage chip ${index + 1}</span>
              <input id="hp-coverage-chip-${index}" type="text" value="${esc((coverage.chips && coverage.chips[index]) || '')}" />
            </label>
          `
        )
        .join('')}

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
      <label class="field">
        <span>Booking popup kicker</span>
        <input id="hp-booking-kicker" type="text" value="${esc(booking.kicker || '')}" />
      </label>
      <label class="field field--full">
        <span>Booking popup text</span>
        <textarea id="hp-booking-lede" rows="3">${esc(site.booking.lede)}</textarea>
      </label>
      ${[0, 1, 2]
        .map(
          (index) => `
            <label class="field">
              <span>Booking highlight ${index + 1}</span>
              <input id="hp-booking-highlight-${index}" type="text" value="${esc(bookingHighlights[index])}" />
            </label>
          `
        )
        .join('')}
      ${bookingSteps
        .map(
          (step, index) => `
            <label class="field">
              <span>Booking step ${index + 1} title</span>
              <input id="hp-booking-step-${index}-title" type="text" value="${esc(step.title || '')}" />
            </label>
            <label class="field field--full">
              <span>Booking step ${index + 1} body</span>
              <textarea id="hp-booking-step-${index}-body" rows="2">${esc(step.body || '')}</textarea>
            </label>
          `
        )
        .join('')}
      <label class="field field--full">
        <span>Booking form intro</span>
        <textarea id="hp-booking-form-sub" rows="2">${esc(booking.formSub || '')}</textarea>
      </label>
      <label class="field">
        <span>Booking success title</span>
        <input id="hp-booking-success-title" type="text" value="${esc(site.booking.successTitle)}" />
      </label>
      <label class="field field--full">
        <span>Booking success text</span>
        <textarea id="hp-booking-success-text" rows="3">${esc(site.booking.successText)}</textarea>
      </label>
      <label class="field field--full field--advanced">
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
      <label class="field field--full field--advanced">
        <span>Optional notification webhook</span>
        <input id="hp-booking-webhook-url" type="url" value="${esc(site.booking.notificationWebhookUrl || '')}" placeholder="Optional: Make, Zapier, Slack, or custom endpoint" />
      </label>

      <label class="field field--full">
        <span>Menu detail note</span>
        <textarea id="hp-detail-notice" rows="3">${esc(site.detailNotice)}</textarea>
      </label>
      <label class="field">
        <span>Reel eyebrow</span>
        <input id="hp-reel-kicker" type="text" value="${esc(reel.kicker || '')}" />
      </label>
      <label class="field">
        <span>Reel video caption</span>
        <input id="hp-reel-video-caption" type="text" value="${esc(reel.videoCaption || '')}" />
      </label>
      <label class="field field--full">
        <span>Reel still caption</span>
        <input id="hp-reel-still-caption" type="text" value="${esc(reel.stillCaption || '')}" />
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
      <label class="field field--advanced">
        <span>Phone link</span>
        <input id="hp-contact-phone-href" type="text" value="${esc(site.contact.phoneHref)}" />
      </label>
      <label class="field">
        <span>Email</span>
        <input id="hp-contact-email" type="text" value="${esc(site.contact.email)}" />
      </label>
      <label class="field field--advanced">
        <span>Email link</span>
        <input id="hp-contact-email-href" type="text" value="${esc(site.contact.emailHref)}" />
      </label>
      <label class="field">
        <span>Website text</span>
        <input id="hp-contact-website" type="text" value="${esc(site.contact.website)}" />
      </label>
      <label class="field field--advanced">
        <span>Website link</span>
        <input id="hp-contact-website-href" type="url" value="${esc(site.contact.websiteHref)}" />
      </label>
      <label class="field field--full">
        <span>Location line</span>
        <input id="hp-contact-location" type="text" value="${esc(site.contact.location)}" />
      </label>
      <label class="field field--advanced">
        <span>Instagram link</span>
        <input id="hp-contact-instagram" type="url" value="${esc(site.contact.instagramHref)}" />
      </label>
      <label class="field field--advanced">
        <span>Yelp link</span>
        <input id="hp-contact-yelp" type="url" value="${esc(site.contact.yelpHref || '')}" placeholder="https://www.yelp.com/biz/..." />
      </label>
      <label class="field field--advanced">
        <span>WhatsApp link</span>
        <input id="hp-contact-whatsapp" type="url" value="${esc(site.contact.whatsappHref)}" />
      </label>
      <label class="field field--advanced">
        <span>Facebook link</span>
        <input id="hp-contact-facebook" type="url" value="${esc(site.contact.facebookHref)}" />
      </label>

      <label class="field">
        <span>FAQ eyebrow</span>
        <input id="hp-faq-eyebrow" type="text" value="${esc(faq.eyebrow || '')}" />
      </label>
      <label class="field">
        <span>FAQ title</span>
        <input id="hp-faq-title" type="text" value="${esc(faq.title || '')}" />
      </label>
      <label class="field field--full">
        <span>FAQ intro</span>
        <textarea id="hp-faq-lede" rows="3">${esc(faq.lede || '')}</textarea>
      </label>
      ${faqItems.map(
        (item, index) => `
          <label class="field">
            <span>FAQ ${index + 1} eyebrow</span>
            <input id="hp-faq-${index}-eyebrow" type="text" value="${esc(item.eyebrow || '')}" />
          </label>
          <label class="field">
            <span>FAQ ${index + 1} title</span>
            <input id="hp-faq-${index}-title" type="text" value="${esc(item.title || '')}" />
          </label>
          <label class="field field--full">
            <span>FAQ ${index + 1} body</span>
            <textarea id="hp-faq-${index}-body" rows="3">${esc(item.body || '')}</textarea>
          </label>
        `
      ).join('')}
    `;
  }

  function blockEditorHtml(prefix, block, blockIndex) {
    const isMenu = prefix === 'menu';
    const blockLabel = isMenu ? 'Sample set' : 'Detail section';
    const itemLabel = isMenu ? 'Course' : 'Point';
    const itemTitleLabel = isMenu ? 'Course title' : 'Point title';
    const addItemLabel = isMenu ? 'Add course' : 'Add point';
    const blockExpanded = isBlockExpanded(prefix, blockIndex);
    const itemCount = Array.isArray(block.items) ? block.items.length : 0;
    const itemsHtml = (block.items || [])
      .map(
        (item, itemIndex) => `
          <div class="editor-item ${isItemExpanded(prefix, blockIndex, itemIndex) ? 'is-open' : ''}">
            <button class="editor-item__toggle" type="button" data-toggle-item="${prefix}:${blockIndex}:${itemIndex}" aria-expanded="${isItemExpanded(prefix, blockIndex, itemIndex) ? 'true' : 'false'}">
              <div class="editor-item__summary">
                <p class="panel-kicker">${itemLabel} ${itemIndex + 1}</p>
                <h4>${esc(item.name || `${itemLabel} ${itemIndex + 1}`)}</h4>
                <p class="editor-summary-note">${esc(item.desc || `Open this ${itemLabel.toLowerCase()} to edit its title and description.`)}</p>
              </div>
              <span class="editor-disclosure" aria-hidden="true">${isItemExpanded(prefix, blockIndex, itemIndex) ? '−' : '+'}</span>
            </button>
            <div class="editor-item__body" ${isItemExpanded(prefix, blockIndex, itemIndex) ? '' : 'hidden'}>
              <div class="editor-item__head">
                <p class="editor-microcopy">Only open the course you want to update. Everything else stays tucked away.</p>
                <button class="ghost-button editor-inline-button" type="button" data-remove-item="${prefix}:${blockIndex}:${itemIndex}">Remove ${itemLabel.toLowerCase()}</button>
              </div>
              <div class="form-layout">
                <label class="field">
                  <span>${itemTitleLabel}</span>
                  <input type="text" id="${prefix}-block-${blockIndex}-item-${itemIndex}-name" value="${esc(item.name)}" />
                </label>
                <label class="field field--full">
                  <span>Description</span>
                  <textarea id="${prefix}-block-${blockIndex}-item-${itemIndex}-desc" rows="3">${esc(item.desc)}</textarea>
                </label>
              </div>
            </div>
          </div>
        `
      )
      .join('');

    return `
      <section class="editor-block ${blockExpanded ? 'is-open' : ''}">
        <button class="editor-block__toggle" type="button" data-toggle-block="${prefix}:${blockIndex}" aria-expanded="${blockExpanded ? 'true' : 'false'}">
          <div class="editor-block__summary">
            <p class="panel-kicker">${blockLabel} ${blockIndex + 1}</p>
            <h4>${esc(block.title || `${blockLabel} ${blockIndex + 1}`)}</h4>
            <p class="editor-summary-note">${itemCount} ${itemLabel.toLowerCase()}${itemCount === 1 ? '' : 's'} inside this section.</p>
          </div>
          <span class="editor-disclosure" aria-hidden="true">${blockExpanded ? '−' : '+'}</span>
        </button>
        <div class="editor-block__body" ${blockExpanded ? '' : 'hidden'}>
          <div class="editor-block__head">
            <p class="editor-microcopy">Only this sample set is open. Close it any time and move to the next one.</p>
            <button class="danger-button editor-inline-button" type="button" data-remove-block="${prefix}:${blockIndex}">Remove ${blockLabel.toLowerCase()}</button>
          </div>
          <div class="form-layout">
            <label class="field">
              <span>Block title</span>
              <input type="text" id="${prefix}-block-${blockIndex}-title" value="${esc(block.title)}" />
            </label>
            <label class="field field--full field--advanced">
              <span>Image path</span>
              <input type="text" id="${prefix}-block-${blockIndex}-image" value="${esc(block.image || '')}" />
            </label>
          </div>
          <div class="editor-items">${itemsHtml}</div>
          <div class="utility-actions">
            <button class="ghost-button editor-inline-button" type="button" data-add-item="${prefix}:${blockIndex}">${addItemLabel}</button>
          </div>
        </div>
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
    ensureEditorExpansion('menu', detail.blocks || []);
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
            <label class="field field--advanced">
              <span>Card number</span>
              <input type="text" id="menu-card-no" value="${esc(card.no)}" />
            </label>
            <p class="field-help field-help--advanced field--full field--advanced">Card number and image path are usually left alone in simple mode.</p>
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
          <p class="editor-help">Each block is one sample menu set. Only the section you open stays visible, so editing stays simple and focused.</p>
          <div class="utility-actions">
            <button class="ghost-button editor-inline-button" type="button" data-add-block="menu">Add sample set</button>
          </div>
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
    ensureEditorExpansion('service', detail.blocks || []);
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
            <label class="field field--advanced">
              <span>Card number</span>
              <input type="text" id="service-card-no" value="${esc(card.no)}" />
            </label>
            <p class="field-help field-help--advanced field--full field--advanced">Card number and image path are usually left alone in simple mode.</p>
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
          <p class="editor-help">Only the detail section you open stays on screen, so updates stay easy to follow.</p>
          <div class="utility-actions">
            <button class="ghost-button editor-inline-button" type="button" data-add-block="service">Add detail section</button>
          </div>
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
        const rq = row.request || {};
        const haystack = [
          row.customer && row.customer.firstName,
          row.customer && row.customer.lastName,
          row.customer && row.customer.email,
          row.customer && row.customer.phone,
          rq.eventLocation,
          rq.cuisinePreference,
          formatReservationAllergyFlags(rq.allergyFlags || []),
          rq.allergyNotes,
          rq.zipCode,
          rq.notes,
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
      const rq = row.request || {};
      const allergyChecklist =
        Array.isArray(rq.allergyFlags) && rq.allergyFlags.length
          ? `Allergen checklist: ${esc(formatReservationAllergyFlags(rq.allergyFlags))}`
          : '';
      const requestLines = [
        `Date: ${esc(rq.preferredDate || '-')}`,
        `Time: ${esc(rq.preferredTime || '-')}`,
        `Guests: ${esc(rq.guestCount == null ? '-' : rq.guestCount)}`,
        `Location: ${esc(rq.eventLocation || '-')}`,
        `Cuisine: ${esc(rq.cuisinePreference || '-')}`,
      ];
      if (allergyChecklist) requestLines.push(allergyChecklist);
      requestLines.push(`Allergy & dietary notes: ${esc(rq.allergyNotes || '-')}`);
      requestLines.push(`Preferred follow-up: ${esc(formatPreferredContact(rq.preferredContact || 'any'))}`);
      if (rq.zipCode) requestLines.push(`ZIP code: ${esc(rq.zipCode)}`);
      if (rq.notes) requestLines.push(`Notes: ${esc(rq.notes)}`);

      const notificationSummary = summarizeReservationNotifications(row.notifications || {});
      const card = document.createElement('article');
      card.className = 'reservation-card';
      card.innerHTML = `
        <div class="reservation-head">
          <div>
            <h3 class="reservation-title">${esc(row.customer.firstName)} ${esc(row.customer.lastName)}</h3>
            <div class="reservation-meta">
              <span>${esc(row.customer.email || 'No email provided')}</span>
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
    if (teamStatus && teamStatus !== 'unconfigured') parts.push(`WhatsApp ${teamStatus}`);
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

  const RESERVATION_ALLERGY_LABELS = {
    dairy: 'Dairy / milk',
    eggs: 'Eggs',
    peanuts: 'Peanuts',
    'tree-nuts': 'Tree nuts',
    gluten: 'Wheat / gluten',
    soy: 'Soy',
    sesame: 'Sesame',
    fish: 'Fish',
    shellfish: 'Shellfish',
    other: 'Other',
  };

  function formatReservationAllergyFlags(flags) {
    if (!Array.isArray(flags) || !flags.length) return '';
    return flags.map((key) => RESERVATION_ALLERGY_LABELS[key] || key).join(', ');
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
      <p class="panel-note routing-persist-hint">${esc(
        'If submitted requests are missing: open this admin from the same server as the site API, or set the silerchef-api-base meta to your API URL. On Railway (or similar), mount a persistent volume for DATA_DIR so reservations are not wiped on redeploy.'
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
    renderCuisineSelect();
    renderServiceSelect();
    renderDashboardInsights();
    renderHomepageFields();
    renderMenuEditor();
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
    next.site.hero = next.site.hero || {};
    next.site.experience = next.site.experience || {};
    next.site.pillars = Array.isArray(next.site.pillars) ? next.site.pillars : [{}, {}, {}, {}];
    next.site.coverage = next.site.coverage || {};
    next.site.coverage.chips = Array.isArray(next.site.coverage.chips) ? next.site.coverage.chips : ['', '', '', ''];
    next.site.booking = next.site.booking || {};
    next.site.booking.highlights = Array.isArray(next.site.booking.highlights) ? next.site.booking.highlights : ['', '', ''];
    next.site.booking.steps = Array.from({ length: 3 }, (_, index) => (Array.isArray(next.site.booking.steps) && next.site.booking.steps[index] ? next.site.booking.steps[index] : {}));
    next.site.reel = next.site.reel || {};
    next.site.faq = next.site.faq || {};
    next.site.faq.items = Array.from({ length: 6 }, (_, index) => (Array.isArray(next.site.faq.items) && next.site.faq.items[index] ? next.site.faq.items[index] : {}));
    next.site.hero.headline = byId('hp-hero-headline').value.trim();
    next.site.hero.tagline = byId('hp-hero-tagline').value.trim();
    next.site.hero.lede = byId('hp-hero-lede').value.trim();
    next.site.hero.floatingNorthEyebrow = byId('hp-hero-floating-north-eyebrow').value.trim();
    next.site.hero.floatingNorthTitle = byId('hp-hero-floating-north-title').value.trim();
    next.site.hero.floatingSouthEyebrow = byId('hp-hero-floating-south-eyebrow').value.trim();
    next.site.hero.floatingSouthTitle = byId('hp-hero-floating-south-title').value.trim();
    next.site.hero.proofChips = [0, 1, 2].map((index) => byId(`hp-hero-chip-${index}`).value.trim());
    next.site.hero.miniPrimaryEyebrow = byId('hp-hero-mini-primary-eyebrow').value.trim();
    next.site.hero.miniPrimaryTitle = byId('hp-hero-mini-primary-title').value.trim();
    next.site.hero.miniSecondaryEyebrow = byId('hp-hero-mini-secondary-eyebrow').value.trim();
    next.site.hero.miniSecondaryTitle = byId('hp-hero-mini-secondary-title').value.trim();
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
    next.site.experience.featuredEyebrow = byId('hp-experience-featured-eyebrow').value.trim();
    next.site.experience.featuredTitle = byId('hp-experience-featured-title').value.trim();
    next.site.experience.featuredBody = byId('hp-experience-featured-body').value.trim();
    next.site.experience.hostingEyebrow = byId('hp-experience-hosting-eyebrow').value.trim();
    next.site.experience.hostingTitle = byId('hp-experience-hosting-title').value.trim();
    next.site.experience.hostingBody = byId('hp-experience-hosting-body').value.trim();
    next.site.experience.guestEyebrow = byId('hp-experience-guest-eyebrow').value.trim();
    next.site.experience.guestTitle = byId('hp-experience-guest-title').value.trim();
    next.site.experience.guestBody = byId('hp-experience-guest-body').value.trim();
    next.site.pillars = [0, 1, 2, 3].map((index) => ({
      label: byId(`hp-pillar-${index}-label`).value.trim(),
      title: byId(`hp-pillar-${index}-title`).value.trim(),
      meta: byId(`hp-pillar-${index}-meta`).value.trim(),
    }));
    next.site.coverage.eyebrow = byId('hp-coverage-eyebrow').value.trim();
    next.site.coverage.title = byId('hp-coverage-title').value.trim();
    next.site.coverage.body = byId('hp-coverage-body').value.trim();
    next.site.coverage.chips = [0, 1, 2, 3].map((index) => byId(`hp-coverage-chip-${index}`).value.trim());
    next.site.cta.headline = byId('hp-cta-headline').value.trim();
    next.site.cta.summary = byId('hp-cta-summary').value.trim();
    next.site.booking.title = byId('hp-booking-title').value.trim();
    next.site.booking.kicker = byId('hp-booking-kicker').value.trim();
    next.site.booking.lede = byId('hp-booking-lede').value.trim();
    next.site.booking.highlights = [0, 1, 2].map((index) => byId(`hp-booking-highlight-${index}`).value.trim());
    next.site.booking.steps = [0, 1, 2].map((index) => ({
      title: byId(`hp-booking-step-${index}-title`).value.trim(),
      body: byId(`hp-booking-step-${index}-body`).value.trim(),
    }));
    next.site.booking.formSub = byId('hp-booking-form-sub').value.trim();
    next.site.booking.successTitle = byId('hp-booking-success-title').value.trim();
    next.site.booking.successText = byId('hp-booking-success-text').value.trim();
    next.site.booking.fallbackUrl = byId('hp-booking-fallback-url').value.trim();
    next.site.booking.notificationEmail = byId('hp-booking-notification-email').value.trim();
    next.site.booking.teamWhatsAppHref = byId('hp-booking-team-whatsapp').value.trim();
    next.site.booking.notificationWebhookUrl = byId('hp-booking-webhook-url').value.trim();
    next.site.detailNotice = byId('hp-detail-notice').value.trim();
    next.site.reel.kicker = byId('hp-reel-kicker').value.trim();
    next.site.reel.videoCaption = byId('hp-reel-video-caption').value.trim();
    next.site.reel.stillCaption = byId('hp-reel-still-caption').value.trim();
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
    next.site.contact.yelpHref = byId('hp-contact-yelp').value.trim();
    next.site.contact.whatsappHref = byId('hp-contact-whatsapp').value.trim();
    next.site.contact.facebookHref = byId('hp-contact-facebook').value.trim();
    next.site.faq.eyebrow = byId('hp-faq-eyebrow').value.trim();
    next.site.faq.title = byId('hp-faq-title').value.trim();
    next.site.faq.lede = byId('hp-faq-lede').value.trim();
    next.site.faq.items = (next.site.faq.items || []).map((_, index) => ({
      eyebrow: byId(`hp-faq-${index}-eyebrow`).value.trim(),
      title: byId(`hp-faq-${index}-title`).value.trim(),
      body: byId(`hp-faq-${index}-body`).value.trim(),
    }));
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

  function createEmptyEditorItem() {
    return {
      name: '',
      desc: '',
    };
  }

  function createEmptyEditorBlock(prefix) {
    const isMenu = prefix === 'menu';
    return {
      title: isMenu ? 'New sample set' : 'New detail section',
      image: '',
      items: [createEmptyEditorItem()],
    };
  }

  function makeCardNo(length) {
    return String(length + 1).padStart(2, '0');
  }

  function createDynamicSlug(prefix) {
    return `${prefix}-${Date.now().toString(36).slice(-6)}`;
  }

  function createEmptyCuisineCard() {
    const content = getContent();
    const slug = createDynamicSlug('cuisine');
    return {
      card: {
        slug,
        title: 'New Cuisine',
        no: makeCardNo((content.cuisineCards || []).length),
        tagline: 'Describe the flavor profile and guest experience for this cuisine.',
      },
      detail: {
        intro: 'Add a short introduction that explains the mood, menu direction, and why this cuisine belongs on the table.',
        blocks: [createEmptyEditorBlock('menu')],
      },
    };
  }

  function createEmptyServiceCard() {
    const content = getContent();
    const slug = createDynamicSlug('service');
    return {
      card: {
        slug,
        title: 'New Service',
        no: makeCardNo((content.serviceCards || []).length),
        tagline: 'Describe the kind of event this service is designed for.',
      },
      detail: {
        intro: 'Add a short introduction that explains how this service feels, flows, and what the guest receives.',
        blocks: [createEmptyEditorBlock('service')],
      },
    };
  }

  function getEditorDetail(prefix) {
    const content = getContent();
    if (prefix === 'menu') {
      const slug = state.selectedCuisineSlug;
      return slug ? content.cuisines[slug] : null;
    }
    const slug = state.selectedServiceSlug;
    return slug ? content.services[slug] : null;
  }

  function rerenderEditor(prefix) {
    syncEditorDraft(prefix);
    if (prefix === 'menu') {
      renderMenuEditor();
      return;
    }
    renderServiceEditor();
  }

  function syncEditorDraft(prefix) {
    if (!state.bootstrap) return;
    try {
      if (prefix === 'menu' && byId('menu-editor') && byId('menu-card-title')) {
        state.bootstrap.content = collectCuisineContent();
        return;
      }
      if (prefix === 'service' && byId('service-editor') && byId('service-card-title')) {
        state.bootstrap.content = collectServiceContent();
      }
    } catch (err) {
      // Ignore partial draft sync failures while sections are re-rendering.
    }
  }

  function addEditorBlock(prefix) {
    const detail = getEditorDetail(prefix);
    if (!detail) return;
    detail.blocks = Array.isArray(detail.blocks) ? detail.blocks : [];
    detail.blocks.push(createEmptyEditorBlock(prefix));
    const panelState = getEditorPanelState(prefix);
    panelState.block = detail.blocks.length - 1;
    panelState.item = `${panelState.block}:0`;
    rerenderEditor(prefix);
  }

  function removeEditorBlock(prefix, blockIndex) {
    const detail = getEditorDetail(prefix);
    if (!detail || !Array.isArray(detail.blocks)) return;
    detail.blocks.splice(blockIndex, 1);
    if (!detail.blocks.length) {
      detail.blocks.push(createEmptyEditorBlock(prefix));
    }
    ensureEditorExpansion(prefix, detail.blocks);
    rerenderEditor(prefix);
  }

  function addEditorItem(prefix, blockIndex) {
    const detail = getEditorDetail(prefix);
    const block = detail && Array.isArray(detail.blocks) ? detail.blocks[blockIndex] : null;
    if (!block) return;
    block.items = Array.isArray(block.items) ? block.items : [];
    block.items.push(createEmptyEditorItem());
    const panelState = getEditorPanelState(prefix);
    panelState.block = blockIndex;
    panelState.item = `${blockIndex}:${block.items.length - 1}`;
    rerenderEditor(prefix);
  }

  function removeEditorItem(prefix, blockIndex, itemIndex) {
    const detail = getEditorDetail(prefix);
    const block = detail && Array.isArray(detail.blocks) ? detail.blocks[blockIndex] : null;
    if (!block || !Array.isArray(block.items)) return;
    block.items.splice(itemIndex, 1);
    if (!block.items.length) {
      block.items.push(createEmptyEditorItem());
    }
    const panelState = getEditorPanelState(prefix);
    panelState.block = blockIndex;
    panelState.item = `${blockIndex}:0`;
    rerenderEditor(prefix);
  }

  function addContentCard(kind) {
    const content = getContent();
    if (kind === 'cuisine') syncEditorDraft('menu');
    if (kind === 'service') syncEditorDraft('service');
    if (kind === 'cuisine') {
      const next = createEmptyCuisineCard();
      content.cuisineCards.push(next.card);
      content.cuisines[next.card.slug] = next.detail;
      state.selectedCuisineSlug = next.card.slug;
      renderCuisineSelect();
      renderMenuEditor();
      renderMenuPreview(next.card, next.detail);
      return;
    }

    const next = createEmptyServiceCard();
    content.serviceCards.push(next.card);
    content.services[next.card.slug] = next.detail;
    state.selectedServiceSlug = next.card.slug;
    renderServiceSelect();
    renderServiceEditor();
    renderServicePreview(next.card, next.detail, next.card.slug);
  }

  function removeContentCard(kind) {
    const content = getContent();
    if (kind === 'cuisine') syncEditorDraft('menu');
    if (kind === 'service') syncEditorDraft('service');
    if (kind === 'cuisine') {
      if ((content.cuisineCards || []).length <= 1) return;
      const slug = state.selectedCuisineSlug;
      content.cuisineCards = content.cuisineCards.filter((row) => row.slug !== slug);
      delete content.cuisines[slug];
      state.selectedCuisineSlug = content.cuisineCards[0] ? content.cuisineCards[0].slug : '';
      renderCuisineSelect();
      renderMenuEditor();
      return;
    }

    if ((content.serviceCards || []).length <= 1) return;
    const slug = state.selectedServiceSlug;
    content.serviceCards = content.serviceCards.filter((row) => row.slug !== slug);
    delete content.services[slug];
    state.selectedServiceSlug = content.serviceCards[0] ? content.serviceCards[0].slug : '';
    renderServiceSelect();
    renderServiceEditor();
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

  if (byId('simple-mode-btn')) {
    byId('simple-mode-btn').addEventListener('click', () => {
      state.simpleMode = !state.simpleMode;
      syncSimpleModeUI();
    });
  }

  if (byId('simple-mode-btn-mobile')) {
    byId('simple-mode-btn-mobile').addEventListener('click', () => {
      state.simpleMode = !state.simpleMode;
      syncSimpleModeUI();
    });
  }

  if (byId('sidebar-toggle-btn')) {
    byId('sidebar-toggle-btn').addEventListener('click', () => {
      setSidebarOpen(!state.sidebarOpen);
    });
  }

  if (byId('sidebar-backdrop')) {
    byId('sidebar-backdrop').addEventListener('click', () => {
      setSidebarOpen(false);
    });
  }

  document.querySelectorAll('.admin-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      setActiveTab(btn.dataset.tab);
      setSidebarOpen(false);
      const contentRoot = byId('dashboard-content');
      if (contentRoot) {
        contentRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  byId('cuisine-select').addEventListener('change', (event) => {
    syncEditorDraft('menu');
    state.selectedCuisineSlug = event.target.value;
    renderMenuEditor();
    renderDashboardInsights();
  });

  byId('service-select').addEventListener('change', (event) => {
    syncEditorDraft('service');
    state.selectedServiceSlug = event.target.value;
    renderServiceEditor();
    renderDashboardInsights();
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
    const addCardBtn = event.target.closest('[data-add-card]');
    if (addCardBtn && state.bootstrap) {
      addContentCard(addCardBtn.getAttribute('data-add-card') || 'cuisine');
      return;
    }

    const removeCardBtn = event.target.closest('[data-remove-card]');
    if (removeCardBtn && state.bootstrap) {
      removeContentCard(removeCardBtn.getAttribute('data-remove-card') || 'cuisine');
      return;
    }

    const addBlockBtn = event.target.closest('[data-add-block]');
    if (addBlockBtn && state.bootstrap) {
      addEditorBlock(addBlockBtn.getAttribute('data-add-block') || 'menu');
      return;
    }

    const removeBlockBtn = event.target.closest('[data-remove-block]');
    if (removeBlockBtn && state.bootstrap) {
      const [prefix, blockIndexRaw] = String(removeBlockBtn.getAttribute('data-remove-block') || '').split(':');
      removeEditorBlock(prefix || 'menu', Number(blockIndexRaw));
      return;
    }

    const addItemBtn = event.target.closest('[data-add-item]');
    if (addItemBtn && state.bootstrap) {
      const [prefix, blockIndexRaw] = String(addItemBtn.getAttribute('data-add-item') || '').split(':');
      addEditorItem(prefix || 'menu', Number(blockIndexRaw));
      return;
    }

    const removeItemBtn = event.target.closest('[data-remove-item]');
    if (removeItemBtn && state.bootstrap) {
      const [prefix, blockIndexRaw, itemIndexRaw] = String(removeItemBtn.getAttribute('data-remove-item') || '').split(':');
      removeEditorItem(prefix || 'menu', Number(blockIndexRaw), Number(itemIndexRaw));
      return;
    }

    const toggleBlockBtn = event.target.closest('[data-toggle-block]');
    if (toggleBlockBtn && state.bootstrap) {
      const [prefix, blockIndexRaw] = String(toggleBlockBtn.getAttribute('data-toggle-block') || '').split(':');
      toggleEditorBlock(prefix || 'menu', Number(blockIndexRaw));
      return;
    }

    const toggleItemBtn = event.target.closest('[data-toggle-item]');
    if (toggleItemBtn && state.bootstrap) {
      const [prefix, blockIndexRaw, itemIndexRaw] = String(toggleItemBtn.getAttribute('data-toggle-item') || '').split(':');
      toggleEditorItem(prefix || 'menu', Number(blockIndexRaw), Number(itemIndexRaw));
      return;
    }

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
      return;
    }

    const jumpTabBtn = event.target.closest('[data-jump-tab]');
    if (jumpTabBtn) {
      setActiveTab(jumpTabBtn.getAttribute('data-jump-tab') || 'homepage');
      const contentRoot = byId('dashboard-content');
      if (contentRoot) {
        contentRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });

  const hashTab = (window.location.hash || '').replace(/^#admin-/, '');
  if (TAB_COPY[hashTab]) {
    state.activeTab = hashTab;
  }

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
