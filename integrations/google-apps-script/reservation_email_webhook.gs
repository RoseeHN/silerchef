const TARGET_EMAILS = ['silerchef@gmail.com', 'silerduygu@gmail.com', 'fikretsiler48@gmail.com'];

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
      '<div style="margin:0;padding:28px 0;background:#120f0d;font-family:Helvetica,Arial,sans-serif;color:#f5eee3">' +
      '<div style="max-width:760px;margin:0 auto;padding:0 18px">' +
      '<div style="background:linear-gradient(145deg,#231c18 0%,#151210 100%);border:1px solid rgba(202,164,91,0.24);border-radius:28px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.38)">' +
      '<div style="padding:28px 30px 18px;border-bottom:1px solid rgba(202,164,91,0.16);background:radial-gradient(circle at top left,rgba(202,164,91,0.18),transparent 42%)">' +
      '<div style="font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#caa45b;margin-bottom:14px">Siler Chef Reservation Desk</div>' +
      '<h1 style="margin:0;font-family:Georgia,Times New Roman,serif;font-size:34px;line-height:1.1;color:#f3e7cf">New private dining request</h1>' +
      '<p style="margin:14px 0 0;color:#d5c9b7;font-size:15px;line-height:1.7">A new reservation has been submitted through <strong style="color:#f4eddc">silerchef.com</strong>. Review the request, confirm the fit, and follow up with the guest.</p>' +
      '</div>' +
      '<div style="padding:24px 30px 8px">' +
      '<div style="margin-bottom:18px">' +
      chip(fullName) +
      chip(preferredDate) +
      chip(preferredTime) +
      chip(String(guestCount) + ' guests') +
      chip(cuisine) +
      '</div>' +
      '<div style="background:#171311;border:1px solid rgba(202,164,91,0.14);border-radius:22px;padding:18px 18px 8px">' +
      '<table style="border-collapse:separate;border-spacing:0 10px;width:100%">' +
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
      '</div>' +
      '<div style="padding:22px 0 10px">' +
      '<a href="https://www.silerchef.com/admin" style="display:inline-block;padding:14px 22px;background:linear-gradient(135deg,#f0dfb0 0%,#caa45b 100%);color:#151311;text-decoration:none;border-radius:999px;font-weight:700;letter-spacing:0.04em">Open admin panel</a>' +
      '<p style="margin:16px 0 0;color:#9f9383;font-size:13px;line-height:1.6">This alert was sent automatically from the Siler Chef reservation system. The admin dashboard remains the source of truth for all reservation records.</p>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
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
    '<td style="padding:12px 14px;border:1px solid rgba(202,164,91,0.14);background:#221c17;color:#caa45b;font-weight:700;width:220px;border-radius:14px 0 0 14px;vertical-align:top">' +
    escapeHtml(label) +
    '</td>' +
    '<td style="padding:12px 14px;border:1px solid rgba(202,164,91,0.14);background:#171311;color:#f5eee3;border-radius:0 14px 14px 0;vertical-align:top">' +
    escapeHtml(String(value || '-')) +
    '</td>' +
    '</tr>'
  );
}

function chip(value) {
  return (
    '<span style="display:inline-block;margin:0 10px 10px 0;padding:10px 14px;border-radius:999px;border:1px solid rgba(202,164,91,0.18);background:#171311;color:#f3e7cf;font-size:12px;letter-spacing:0.06em;text-transform:uppercase">' +
    escapeHtml(String(value || '-')) +
    '</span>'
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
