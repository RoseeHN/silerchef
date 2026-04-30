'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const { createWixContactFromReservation } = require('./wixContact');

const PORT = Number(process.env.PORT) || 3000;
const WIX_API_KEY = process.env.WIX_API_KEY;

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

/** Allow this app to be shown inside a Wix (or silerchef.com) full-page iframe. */
app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://silerchef.com https://www.silerchef.com https://*.wix.com https://*.wixsite.com"
  );
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
  res.json({ ok: true, service: 'silerchef-api' });
});

app.get('/api/ping', requireApiKey, (_req, res) => {
  res.json({ ok: true, authenticated: true });
});

/** Public booking config for the embed (copy URL + text from Wix Bookings / site). */
function bookingEnv(key) {
  const v = process.env[key];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

app.get('/api/booking', (_req, res) => {
  res.json({
    url:
      bookingEnv('WIX_BOOKING_URL') ||
      'https://www.silerchef.com/book-online',
    headline: bookingEnv('WIX_BOOKING_HEADLINE'),
    summary: bookingEnv('WIX_BOOKING_SUMMARY'),
  });
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
  try {
    const result = await createWixContactFromReservation(p);
    if (!result.ok) {
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
    res.json({ ok: true, contactId: result.contactId });
  } catch (e) {
    console.error('reservation_error', e);
    res.status(500).json({ error: 'server_error' });
  }
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`silerchef-api listening on ${PORT}`);
});
