'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');

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
      /^https:\/\/(www\.)?silerchef\.com$/i.test(origin);
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
