'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const { createWixContactFromReservation } = require('./wixContact');
const { createAdminToken, verifyAdminToken } = require('./adminAuth');
const { buildStore } = require('./runtimeStore');

const PORT = Number(process.env.PORT) || 3000;
const WIX_API_KEY = process.env.WIX_API_KEY;
const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || '').trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '').trim();
const store = buildStore();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    const allowed =
      /\.wix\.com$/i.test(origin) ||
      /\.wixsite\.com$/i.test(origin) ||
      /^https:\/\/(www\.)?silerchef\.com$/i.test(origin) ||
      /^https:\/\/[a-z0-9][a-z0-9-]*\.up\.railway\.app$/i.test(origin);
    const extra = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (allowed || extra.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));

/** Allow embedding from Wix / silerchef.com / optional FRAME_ANCESTORS_EXTRA (comma-separated origins). */
function buildFrameAncestorsCsp() {
  const parts = [
    "'self'",
    'https://silerchef.com',
    'https://www.silerchef.com',
    'https://*.wix.com',
    'https://*.editor.wix.com',
    'https://*.wixsite.com',
    'https://*.editorx.io',
    'https://*.wixstudio.com',
  ];
  const extra = (process.env.FRAME_ANCESTORS_EXTRA || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  extra.forEach((o) => parts.push(o));
  return `frame-ancestors ${parts.join(' ')}`;
}

app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', buildFrameAncestorsCsp());
  next();
});

function requireApiKey(req, res, next) {
  if (!WIX_API_KEY) {
    res.status(500).json({ error: 'server_misconfigured', detail: 'WIX_API_KEY missing' });
    return;
  }
  const auth = req.headers.authorization || '';
  const bearer = /^Bearer\s+(.+)$/i.exec(auth);
  const fromBearer = bearer ? bearer[1].trim() : '';
  const fromHeader = (req.headers['x-api-key'] || '').toString().trim();
  const key = fromBearer || fromHeader;
  if (!key || key !== WIX_API_KEY) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'silerchef-api', dataDir: store.dataDir });
});

app.get('/api/ping', requireApiKey, (_req, res) => {
  res.json({ ok: true, authenticated: true });
});

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const bearer = /^Bearer\s+(.+)$/i.exec(auth);
  const token = bearer ? bearer[1].trim() : '';
  const session = verifyAdminToken(token);
  if (!session) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  req.admin = session;
  next();
}

function extractBookingConfig(content) {
  const booking = (content && content.site && content.site.booking) || {};
  const cta = (content && content.site && content.site.cta) || {};
  return {
    url: booking.fallbackUrl || bookingEnv('WIX_BOOKING_URL') || 'https://www.silerchef.com/book-online',
    headline: cta.headline || bookingEnv('WIX_BOOKING_HEADLINE'),
    summary: cta.summary || bookingEnv('WIX_BOOKING_SUMMARY'),
  };
}

/** Public booking config for the embed (copy URL + text from Wix Bookings / site). */
function bookingEnv(key) {
  const v = process.env[key];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

app.get('/api/site-content', async (_req, res) => {
  const content = await store.getContent();
  res.json(content);
});

app.get('/api/availability', async (_req, res) => {
  const availability = await store.getAvailability();
  res.json(availability);
});

app.get('/api/booking', async (_req, res) => {
  const content = await store.getContent();
  res.json(extractBookingConfig(content));
});

function validEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Creates a Wix CRM contact with full reservation note (Bookings calendar needs separate setup). */
app.post('/api/reservations', async (req, res) => {
  const p = req.body;
  if (!p || typeof p !== 'object') {
    res.status(400).json({ error: 'invalid_body' });
    return;
  }
  const firstName = String(p.firstName || '').trim();
  const lastName = String(p.lastName || '').trim();
  const email = String(p.email || '').trim();
  if (!firstName || !lastName || !email || !validEmail(email)) {
    res.status(400).json({ error: 'validation', detail: 'name_email_required' });
    return;
  }
  const availability = await store.getAvailability();
  const blocked = (availability.blockedDates || []).find((row) => row.date === String(p.preferredDate || '').trim());
  if (blocked) {
    res.status(409).json({
      error: 'date_unavailable',
      detail: blocked.label ? `This date is currently unavailable: ${blocked.label}` : 'This date is currently unavailable.',
    });
    return;
  }
  const reservation = await store.createReservation({
    firstName,
    lastName,
    email,
    phone: String(p.phone || '').trim(),
    preferredDate: String(p.preferredDate || '').trim(),
    preferredTime: String(p.preferredTime || '').trim(),
    guestCount: Number.isFinite(Number(p.guestCount)) ? Number(p.guestCount) : null,
    notes: String(p.notes || '').trim(),
  });
  try {
    const result = await createWixContactFromReservation(p);
    if (!result.ok) {
      await store.updateReservation(reservation.id, {
        wixSync: {
          ok: false,
          contactId: null,
          error: result.detail || result.code || 'wix_sync_failed',
        },
      });
      if (result.code === 'missing_wix_config') {
        res.status(503).json({
          error: 'server_misconfigured',
          detail: 'Set WIX_META_SITE_ID and WIX_API_KEY (Contacts: Manage) on Railway.',
        });
        return;
      }
      res.status(502).json({ error: 'wix_error', status: result.status, detail: result.detail });
      return;
    }
    await store.updateReservation(reservation.id, {
      wixSync: {
        ok: true,
        contactId: result.contactId || null,
        error: null,
      },
    });
    res.json({ ok: true, contactId: result.contactId, reservationId: reservation.id });
  } catch (e) {
    console.error('reservation_error', e);
    await store.updateReservation(reservation.id, {
      wixSync: {
        ok: false,
        contactId: null,
        error: 'server_error',
      },
    });
    res.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    res.status(503).json({ error: 'server_misconfigured', detail: 'Set ADMIN_USERNAME and ADMIN_PASSWORD on Railway.' });
    return;
  }
  const username = String((req.body && req.body.username) || '').trim();
  const password = String((req.body && req.body.password) || '').trim();
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }
  const token = createAdminToken(username);
  if (!token) {
    res.status(503).json({ error: 'server_misconfigured', detail: 'Set ADMIN_SECRET on Railway.' });
    return;
  }
  res.json({ ok: true, token, username });
});

app.get('/api/admin/bootstrap', requireAdmin, async (_req, res) => {
  const [content, availability, reservations] = await Promise.all([
    store.getContent(),
    store.getAvailability(),
    store.listReservations(),
  ]);
  res.json({ ok: true, content, availability, reservations });
});

app.put('/api/admin/content', requireAdmin, async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    res.status(400).json({ error: 'invalid_body' });
    return;
  }
  const content = await store.saveContent(req.body);
  res.json({ ok: true, content });
});

app.put('/api/admin/availability', requireAdmin, async (req, res) => {
  const availability = await store.saveAvailability(req.body || {});
  res.json({ ok: true, availability });
});

app.patch('/api/admin/reservations/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) {
    res.status(400).json({ error: 'missing_id' });
    return;
  }
  const updated = await store.updateReservation(id, req.body || {});
  if (!updated) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ ok: true, reservation: updated });
});

const embedDir = path.join(__dirname, '..', 'embed');
app.use(
  express.static(embedDir, {
    extensions: ['html'],
    index: ['index.html'],
    maxAge: process.env.NODE_ENV === 'production' ? 3600000 : 0,
  })
);

app.use((_req, res) => {
  if (res.headersSent) return;
  res.status(404).json({ error: 'not_found' });
});

store
  .ensureSeed()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`silerchef-api listening on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('startup_error', err);
    process.exitCode = 1;
  });
