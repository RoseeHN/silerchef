const TARGET_EMAILS = ['silerchef@gmail.com', 'silerduygu@gmail.com'];

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const reservation = payload.reservation || {};
    const customer = reservation.customer || {};
    const request = reservation.request || {};

    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || 'Guest request';
    const reservationId = reservation.id || '-';
    const createdAt = reservation.createdAt || payload.generatedAt || new Date().toISOString();
    const preferredDate = request.preferredDate || '-';
    const preferredTime = request.preferredTime || '-';
    const guestCount = request.guestCount || '-';
    const cuisine = request.cuisinePreference || '-';
    const location = request.eventLocation || '-';
    const zipCode = request.zipCode || '-';
    const preferredContact = request.preferredContact || 'any';
    const allergies = request.allergyNotes || '-';
    const notes = request.notes || '-';
    const email = customer.email || '-';
    const phone = customer.phone || '-';

    const subject = 'New Siler Chef reservation: ' + fullName + ' - ' + preferredDate;

    const textBody = [
      'A new reservation request has been created on silerchef.com.',
      '',
      'Reservation ID: ' + reservationId,
      'Created at: ' + createdAt,
      '',
      'Guest: ' + fullName,
      'Email: ' + email,
      'Phone: ' + phone,
      'Event location: ' + location,
      'ZIP: ' + zipCode,
      'Preferred contact: ' + preferredContact,
      '',
      'Preferred date: ' + preferredDate,
      'Preferred time: ' + preferredTime,
      'Guests: ' + guestCount,
      'Cuisine: ' + cuisine,
      'Allergies / intolerances: ' + allergies,
      '',
      'Notes:',
      notes,
      '',
      'Open the Siler Chef admin panel to review and follow up.',
      'https://www.silerchef.com/admin',
    ].join('\n');

    const htmlBody =
      '<div style="font-family:Arial,sans-serif;color:#1f1a16;line-height:1.6">' +
      '<h2 style="margin:0 0 12px;color:#8c6a2c">New Siler Chef reservation</h2>' +
      '<p style="margin:0 0 18px">A new reservation request has been created on <strong>silerchef.com</strong>.</p>' +
      '<table style="border-collapse:collapse;width:100%;max-width:760px">' +
      row('Reservation ID', reservationId) +
      row('Created at', createdAt) +
      row('Guest', fullName) +
      row('Email', email) +
      row('Phone', phone) +
      row('Event location', location) +
      row('ZIP', zipCode) +
      row('Preferred contact', preferredContact) +
      row('Preferred date', preferredDate) +
      row('Preferred time', preferredTime) +
      row('Guests', guestCount) +
      row('Cuisine', cuisine) +
      row('Allergies / intolerances', allergies) +
      row('Notes', notes) +
      '</table>' +
      '<p style="margin:18px 0 0"><a href="https://www.silerchef.com/admin" style="display:inline-block;padding:10px 16px;background:#c5a059;color:#151311;text-decoration:none;border-radius:999px;font-weight:700">Open admin panel</a></p>' +
      '</div>';

    MailApp.sendEmail({
      to: TARGET_EMAILS.join(','),
      subject: subject,
      body: textBody,
      htmlBody: htmlBody,
      replyTo: customer.email || undefined,
      name: 'Siler Chef Reservations',
    });

    return jsonResponse({ ok: true, deliveredTo: TARGET_EMAILS });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: String((error && error.message) || error || 'Unknown error'),
      },
      500
    );
  }
}

function row(label, value) {
  return (
    '<tr>' +
    '<td style="padding:8px 12px;border:1px solid #e5dcc9;background:#f7f2e8;font-weight:700;width:220px">' +
    escapeHtml(label) +
    '</td>' +
    '<td style="padding:8px 12px;border:1px solid #e5dcc9">' +
    escapeHtml(String(value || '-')) +
    '</td>' +
    '</tr>'
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonResponse(payload, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  if (typeof output.setStatusCode === 'function' && statusCode) {
    output.setStatusCode(statusCode);
  }
  return output;
}
