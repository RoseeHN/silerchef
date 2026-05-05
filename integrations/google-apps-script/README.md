# Free reservation email setup

This is the cheapest working setup for Siler Chef:

- Admin panel stays the main source of truth.
- Email notifications are sent with `Google Apps Script + Gmail` for free.
- WhatsApp stays on the current `wa.me` quick-link route unless you later decide to add a paid automation provider.

## What this gives you

- New reservations stay saved in the Siler Chef admin panel.
- A free email alert goes to:
  - `silerchef@gmail.com`
  - `silerduygu@gmail.com`
- The email contains guest name, phone, date, time, guest count, cuisine, location, ZIP, allergies, and notes.

## 1. Create the Google Apps Script

1. Open [Google Apps Script](https://script.google.com/)
2. Create a new project
3. Delete the default code
4. Paste the contents of:
   - `reservation_email_webhook.gs`
5. Save the project

## 2. Deploy it as a webhook

1. Click `Deploy`
2. Click `New deployment`
3. Choose `Web app`
4. Set:
   - `Execute as`: `Me`
   - `Who has access`: `Anyone`
5. Deploy
6. Copy the generated `Web app URL`

## 3. Add the webhook URL into Siler Chef admin

1. Open the admin panel:
   - [https://www.silerchef.com/admin](https://www.silerchef.com/admin)
2. Go to the homepage/contact routing area
3. Paste the Google Apps Script URL into:
   - `Webhook`
4. Save

## 4. Test

1. Submit a reservation from the website
2. Confirm:
   - it appears in the admin panel
   - email arrives in both inboxes

## Notes

- This is the best free email route.
- It uses the Gmail account that owns the Apps Script project.
- Automatic production WhatsApp delivery is not realistically free.
- If you later want full automation, keep this email webhook and add a paid WhatsApp provider separately.
