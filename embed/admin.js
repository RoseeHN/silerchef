'use strict';

(function () {
  const STORAGE_KEY = 'silerchef_admin_token';

  function getApiBase() {
    const base = window.__SILERCHEF_API_BASE__ || '';
    return base ? String(base).replace(/\/$/, '') : '';
  }

  function apiUrl(path) {
    const base = getApiBase();
    return base ? base + path : path;
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
    const res = await fetch(apiUrl(path), {
      ...(options || {}),
      headers,
    });
    return res;
  }

  function blockedDatesToText(blockedDates) {
    return (Array.isArray(blockedDates) ? blockedDates : [])
      .map((row) => `${row.date}${row.label ? ' | ' + row.label : ''}`)
      .join('\n');
  }

  function parseBlockedDates(text) {
    return String(text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [datePart, ...rest] = line.split('|');
        return {
          date: String(datePart || '').trim(),
          label: rest.join('|').trim(),
        };
      });
  }

  function formatDateTime(isoText) {
    if (!isoText) return 'Unknown';
    const dt = new Date(isoText);
    if (Number.isNaN(dt.getTime())) return isoText;
    return dt.toLocaleString();
  }

  const loginCard = document.getElementById('login-card');
  const dashboard = document.getElementById('dashboard');
  const logoutBtn = document.getElementById('logout-btn');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const contentJson = document.getElementById('content-json');
  const contentStatus = document.getElementById('content-status');
  const availabilityNote = document.getElementById('availability-note');
  const blockedDates = document.getElementById('blocked-dates');
  const availabilityStatus = document.getElementById('availability-status');
  const reservationsList = document.getElementById('reservations-list');
  const reservationsEmpty = document.getElementById('reservations-empty');

  let bootstrapData = null;

  function updateSummary() {
    const availability = (bootstrapData && bootstrapData.availability) || { blockedDates: [] };
    const reservations = (bootstrapData && bootstrapData.reservations) || [];
    document.getElementById('summary-blocked').textContent = String((availability.blockedDates || []).length);
    document.getElementById('summary-reservations').textContent = String(reservations.length);
    document.getElementById('summary-pending').textContent = String(
      reservations.filter((row) => row.status === 'pending').length
    );
  }

  function renderReservations() {
    const reservations = (bootstrapData && bootstrapData.reservations) || [];
    reservationsList.innerHTML = '';
    reservationsEmpty.hidden = reservations.length > 0;
    reservations.forEach((row) => {
      const card = document.createElement('article');
      card.className = 'reservation-card';

      const bodyText = [
        `Date: ${row.request && row.request.preferredDate ? row.request.preferredDate : '-'}`,
        `Time: ${row.request && row.request.preferredTime ? row.request.preferredTime : '-'}`,
        `Guests: ${row.request && row.request.guestCount != null ? row.request.guestCount : '-'}`,
        row.request && row.request.notes ? `Notes: ${row.request.notes}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      card.innerHTML = `
        <div class="reservation-head">
          <div>
            <h3 class="reservation-title">${row.customer.firstName} ${row.customer.lastName}</h3>
            <div class="reservation-meta">
              <span>${row.customer.email}</span>
              <span>${row.customer.phone || 'No phone'}</span>
              <span>${formatDateTime(row.createdAt)}</span>
            </div>
          </div>
          <span class="reservation-chip">${row.status}</span>
        </div>
        <div class="reservation-grid">
          <div>
            <p class="panel-kicker">Request</p>
            <p class="reservation-body"></p>
          </div>
          <div>
            <p class="panel-kicker">Wix sync</p>
            <p class="reservation-body">${row.wixSync && row.wixSync.ok ? 'Synced to Wix CRM' : row.wixSync && row.wixSync.error ? row.wixSync.error : 'Pending'}</p>
          </div>
        </div>
      `;
      card.querySelector('.reservation-body').textContent = bodyText;

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
      noteInput.rows = 3;
      noteInput.placeholder = 'Internal note for this request';
      noteInput.value = row.adminNote || '';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'primary-button';
      saveBtn.textContent = 'Save status';
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
          if (!res.ok) throw new Error('Unable to save reservation');
          const data = await res.json();
          const idx = bootstrapData.reservations.findIndex((item) => item.id === row.id);
          if (idx !== -1) bootstrapData.reservations[idx] = data.reservation;
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
      reservationsList.appendChild(card);
    });
  }

  function renderBootstrap() {
    if (!bootstrapData) return;
    contentJson.value = JSON.stringify(bootstrapData.content, null, 2);
    availabilityNote.value = bootstrapData.availability.note || '';
    blockedDates.value = blockedDatesToText(bootstrapData.availability.blockedDates || []);
    updateSummary();
    renderReservations();
  }

  async function loadBootstrap() {
    const res = await apiFetch('/api/admin/bootstrap');
    if (res.status === 401) {
      setToken('');
      dashboard.hidden = true;
      logoutBtn.hidden = true;
      loginCard.hidden = false;
      return;
    }
    if (!res.ok) throw new Error('Unable to load admin data');
    bootstrapData = await res.json();
    loginCard.hidden = true;
    dashboard.hidden = false;
    logoutBtn.hidden = false;
    renderBootstrap();
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(loginError, '', true);
    const form = new FormData(loginForm);
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
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Login failed');
      }
      setToken(data.token);
      loginForm.reset();
      await loadBootstrap();
    } catch (err) {
      setMessage(loginError, err.message || 'Login failed', true);
    }
  });

  document.getElementById('save-content-btn').addEventListener('click', async () => {
    setMessage(contentStatus, '', false);
    let parsed;
    try {
      parsed = JSON.parse(contentJson.value);
    } catch {
      setMessage(contentStatus, 'Content JSON is not valid.', true);
      return;
    }
    try {
      const res = await apiFetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || 'Unable to save content');
      bootstrapData.content = data.content;
      contentJson.value = JSON.stringify(data.content, null, 2);
      setMessage(contentStatus, 'Content saved successfully.', false);
    } catch (err) {
      setMessage(contentStatus, err.message || 'Unable to save content', true);
    }
  });

  document.getElementById('save-availability-btn').addEventListener('click', async () => {
    setMessage(availabilityStatus, '', false);
    try {
      const res = await apiFetch('/api/admin/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: availabilityNote.value,
          blockedDates: parseBlockedDates(blockedDates.value),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || 'Unable to save availability');
      bootstrapData.availability = data.availability;
      blockedDates.value = blockedDatesToText(data.availability.blockedDates || []);
      setMessage(availabilityStatus, 'Availability saved successfully.', false);
      updateSummary();
    } catch (err) {
      setMessage(availabilityStatus, err.message || 'Unable to save availability', true);
    }
  });

  document.getElementById('refresh-btn').addEventListener('click', async () => {
    await loadBootstrap().catch((err) => alert(err.message || 'Unable to refresh'));
  });

  logoutBtn.addEventListener('click', () => {
    setToken('');
    bootstrapData = null;
    dashboard.hidden = true;
    logoutBtn.hidden = true;
    loginCard.hidden = false;
  });

  if (getToken()) {
    loadBootstrap().catch(() => {
      setToken('');
      loginCard.hidden = false;
    });
  }
})();
