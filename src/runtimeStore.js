'use strict';

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { cloneDefaultContent } = require('./siteContentDefaults');

function deepMerge(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override : base;
  }
  if (!base || typeof base !== 'object') {
    return override === undefined ? base : override;
  }
  const out = { ...base };
  if (!override || typeof override !== 'object') return out;
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      out[key] = value;
      continue;
    }
    if (value && typeof value === 'object' && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
      out[key] = deepMerge(out[key], value);
      continue;
    }
    out[key] = value;
  }
  return out;
}

function normalizeBlockedDates(rawDates) {
  const out = [];
  const seen = new Set();
  const arr = Array.isArray(rawDates) ? rawDates : [];
  for (const row of arr) {
    const date = typeof row === 'string' ? row.trim() : String((row && row.date) || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || seen.has(date)) continue;
    const label = typeof row === 'string' ? '' : String((row && row.label) || '').trim().slice(0, 160);
    seen.add(date);
    out.push({ date, label });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

function normalizeAvailability(raw) {
  return {
    note: String((raw && raw.note) || '').trim().slice(0, 500),
    blockedDates: normalizeBlockedDates(raw && raw.blockedDates),
  };
}

function normalizeReservationStatus(value) {
  const allowed = new Set(['pending', 'confirmed', 'completed', 'cancelled', 'blocked']);
  return allowed.has(value) ? value : 'pending';
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, value) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  await fs.rename(temp, filePath);
}

function buildStore() {
  const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', '.runtime-data'));
  const contentFile = path.join(dataDir, 'site-content.json');
  const reservationsFile = path.join(dataDir, 'reservations.json');

  async function getContent() {
    const defaults = cloneDefaultContent();
    const saved = await readJsonFile(contentFile, null);
    return saved && typeof saved === 'object' ? deepMerge(defaults, saved) : defaults;
  }

  async function saveContent(raw) {
    const merged = deepMerge(cloneDefaultContent(), raw && typeof raw === 'object' ? raw : {});
    if (!merged.availability) {
      merged.availability = { note: '', blockedDates: [] };
    }
    merged.availability = normalizeAvailability(merged.availability);
    await writeJsonFile(contentFile, merged);
    return merged;
  }

  async function getAvailability() {
    const content = await getContent();
    return normalizeAvailability(content.availability || {});
  }

  async function saveAvailability(raw) {
    const content = await getContent();
    content.availability = normalizeAvailability(raw || {});
    await writeJsonFile(contentFile, content);
    return content.availability;
  }

  async function listReservations() {
    const data = await readJsonFile(reservationsFile, []);
    const arr = Array.isArray(data) ? data : [];
    arr.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return arr;
  }

  async function createReservation(payload) {
    const reservations = await listReservations();
    const reservation = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      adminNote: '',
      wixSync: { ok: false, contactId: null, error: null },
      customer: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone || '',
      },
      request: {
        preferredDate: payload.preferredDate || '',
        preferredTime: payload.preferredTime || '',
        guestCount: payload.guestCount,
        notes: payload.notes || '',
      },
    };
    reservations.unshift(reservation);
    await writeJsonFile(reservationsFile, reservations);
    return reservation;
  }

  async function updateReservation(id, patch) {
    const reservations = await listReservations();
    const index = reservations.findIndex((row) => row.id === id);
    if (index === -1) return null;
    const current = reservations[index];
    reservations[index] = {
      ...current,
      status: patch.status ? normalizeReservationStatus(String(patch.status)) : current.status,
      adminNote:
        patch.adminNote !== undefined ? String(patch.adminNote || '').trim().slice(0, 2000) : current.adminNote,
      wixSync:
        patch.wixSync && typeof patch.wixSync === 'object'
          ? {
              ok: !!patch.wixSync.ok,
              contactId: patch.wixSync.contactId || null,
              error: patch.wixSync.error || null,
            }
          : current.wixSync,
      updatedAt: new Date().toISOString(),
    };
    await writeJsonFile(reservationsFile, reservations);
    return reservations[index];
  }

  async function ensureSeed() {
    if (!(await fileExists(contentFile))) {
      await saveContent(cloneDefaultContent());
    }
    if (!(await fileExists(reservationsFile))) {
      await writeJsonFile(reservationsFile, []);
    }
  }

  return {
    dataDir,
    ensureSeed,
    getContent,
    saveContent,
    getAvailability,
    saveAvailability,
    listReservations,
    createReservation,
    updateReservation,
  };
}

module.exports = { buildStore, deepMerge, normalizeAvailability };
