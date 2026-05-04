'use strict';

const WIX_CONTACTS_URL = 'https://www.wixapis.com/contacts/v4/contacts';

const ALLERGY_LABELS = {
  dairy: 'Dairy / milk',
  eggs: 'Eggs',
  peanuts: 'Peanuts',
  'tree-nuts': 'Tree nuts',
  gluten: 'Wheat / gluten',
  soy: 'Soy',
  sesame: 'Sesame',
  fish: 'Fish',
  shellfish: 'Shellfish',
  other: 'Other (see notes)',
};

function formatAllergyFlags(flags) {
  if (!Array.isArray(flags) || !flags.length) return '';
  return flags.map((key) => ALLERGY_LABELS[key] || key).join('; ');
}

function buildReservationNote(p) {
  const allergyLine = [];
  const flagsText = formatAllergyFlags(p.allergyFlags);
  if (flagsText) allergyLine.push(`Allergy checklist: ${flagsText}`);
  if (p.allergyNotes) allergyLine.push(`Allergy notes: ${String(p.allergyNotes).slice(0, 800)}`);
  const lines = [
    'Siler Chef — website reservation request',
    p.eventLocation ? `Event location: ${p.eventLocation}` : '',
    p.zipCode ? `ZIP: ${p.zipCode}` : '',
    `Preferred date: ${p.preferredDate || '—'}`,
    `Preferred time: ${p.preferredTime || '—'}`,
    `Guests: ${p.guestCount != null ? p.guestCount : '—'}`,
    p.cuisinePreference ? `Cuisine: ${p.cuisinePreference}` : '',
    ...allergyLine,
    p.preferredContact && p.preferredContact !== 'any' ? `Preferred follow-up: ${p.preferredContact}` : '',
    p.notes ? `Notes: ${p.notes}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

/**
 * Creates a Wix CRM contact with reservation details in company + job title.
 * Requires Railway: WIX_API_KEY (Contacts: Manage) and WIX_META_SITE_ID.
 */
async function createWixContactFromReservation(raw) {
  const apiKey = process.env.WIX_API_KEY;
  const siteId = process.env.WIX_META_SITE_ID;
  if (!apiKey || !siteId) {
    return { ok: false, code: 'missing_wix_config' };
  }

  const p = {
    firstName: String(raw.firstName || '').trim().slice(0, 80),
    lastName: String(raw.lastName || '').trim().slice(0, 80),
    email: String(raw.email || '').trim().slice(0, 320),
    phone: raw.phone ? String(raw.phone).trim().slice(0, 40) : '',
    preferredDate: raw.preferredDate ? String(raw.preferredDate).trim().slice(0, 32) : '',
    preferredTime: raw.preferredTime ? String(raw.preferredTime).trim().slice(0, 16) : '',
    guestCount: Number.isFinite(Number(raw.guestCount)) ? Math.min(999, Math.max(1, Number(raw.guestCount))) : null,
    notes: raw.notes ? String(raw.notes).trim().slice(0, 2000) : '',
    eventLocation: raw.eventLocation ? String(raw.eventLocation).trim().slice(0, 200) : '',
    zipCode: raw.zipCode ? String(raw.zipCode).trim().slice(0, 20) : '',
    cuisinePreference: raw.cuisinePreference ? String(raw.cuisinePreference).trim().slice(0, 200) : '',
    allergyNotes: raw.allergyNotes ? String(raw.allergyNotes).trim().slice(0, 1200) : '',
    allergyFlags: Array.isArray(raw.allergyFlags) ? raw.allergyFlags : [],
    preferredContact: raw.preferredContact ? String(raw.preferredContact).trim().slice(0, 40) : '',
  };

  const note = buildReservationNote(p);
  const company = note.length > 1800 ? `${note.slice(0, 1770)}…` : note;

  const info = {
    name: { first: p.firstName, last: p.lastName },
    emails: { items: [{ tag: 'MAIN', email: p.email, primary: true }] },
    jobTitle: 'Private chef — reservation (embed)',
    company,
    locale: 'en-US',
  };

  if (p.phone) {
    info.phones = {
      items: [{ tag: 'MOBILE', countryCode: 'US', phone: p.phone, primary: true }],
    };
  }

  const body = { allowDuplicates: true, info };

  const res = await fetch(WIX_CONTACTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
      'wix-site-id': siteId,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, code: 'wix_rejected', status: res.status, detail: text.slice(0, 800) };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  const contactId = parsed?.contact?.id || null;
  return { ok: true, contactId };
}

module.exports = { createWixContactFromReservation, buildReservationNote };
