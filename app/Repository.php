<?php

declare(strict_types=1);

require_once __DIR__ . '/Support.php';

final class Repository
{
    private PDO $pdo;
    private string $driver;
    private string $seedContentFile;
    private string $seedReservationsFile;

    public function __construct(Database $database)
    {
        $this->pdo = $database->pdo();
        $this->driver = $database->driver();
        $this->seedContentFile = dirname(__DIR__) . '/config/default-site-content.json';
        $this->seedReservationsFile = dirname(__DIR__) . '/config/default-reservations.json';
    }

    public function ensureReady(): void
    {
        $this->createSchema();
        $this->ensureReservationColumns();
        $this->seedContentIfMissing();
        $this->seedReservationsIfMissing();
        $this->syncAdminFromEnvironment();
    }

    public function getContent(): array
    {
        $raw = $this->getSetting('site_content');
        $content = is_array($raw) ? $raw : $this->loadSeedContent();
        return $this->normalizeContent($content);
    }

    public function saveContent(array $content): array
    {
        $next = $this->normalizeContent($content);
        $this->setSetting('site_content', $next);
        return $next;
    }

    public function getAvailability(): array
    {
        $content = $this->getContent();
        return normalize_availability($content['availability'] ?? []);
    }

    public function saveAvailability(array $availability): array
    {
        $content = $this->getContent();
        $content['availability'] = normalize_availability($availability);
        $this->setSetting('site_content', $content);
        return $content['availability'];
    }

    public function listReservations(): array
    {
        $stmt = $this->pdo->query(
            'SELECT * FROM reservations ORDER BY created_at DESC'
        );
        $rows = $stmt->fetchAll();
        return array_map(fn (array $row): array => $this->hydrateReservation($row), $rows);
    }

    public function createReservation(array $payload): array
    {
        $id = $this->uuid();
        $createdAt = gmdate('c');
        $stmt = $this->pdo->prepare(
            'INSERT INTO reservations (
                id, first_name, last_name, email, phone, event_location, zip_code, preferred_date, preferred_time, preferred_contact, guest_count, cuisine_preference, allergy_notes, notes,
                status, admin_note, notification_log, wix_sync_ok, wix_contact_id, wix_sync_error, created_at, updated_at
            ) VALUES (
                :id, :first_name, :last_name, :email, :phone, :event_location, :zip_code, :preferred_date, :preferred_time, :preferred_contact, :guest_count, :cuisine_preference, :allergy_notes, :notes,
                :status, :admin_note, :notification_log, :wix_sync_ok, :wix_contact_id, :wix_sync_error, :created_at, :updated_at
            )'
        );
        $stmt->execute(
            [
                ':id' => $id,
                ':first_name' => $payload['firstName'],
                ':last_name' => $payload['lastName'],
                ':email' => $payload['email'],
                ':phone' => $payload['phone'] ?? '',
                ':event_location' => $payload['eventLocation'] ?? '',
                ':zip_code' => normalize_zip_code((string) ($payload['zipCode'] ?? '')),
                ':preferred_date' => $payload['preferredDate'] ?? '',
                ':preferred_time' => $payload['preferredTime'] ?? '',
                ':preferred_contact' => normalize_preferred_contact((string) ($payload['preferredContact'] ?? '')),
                ':guest_count' => $payload['guestCount'],
                ':cuisine_preference' => $payload['cuisinePreference'] ?? '',
                ':allergy_notes' => $payload['allergyNotes'] ?? '',
                ':notes' => $payload['notes'] ?? '',
                ':status' => 'pending',
                ':admin_note' => '',
                ':notification_log' => '{}',
                ':wix_sync_ok' => 0,
                ':wix_contact_id' => null,
                ':wix_sync_error' => null,
                ':created_at' => $createdAt,
                ':updated_at' => null,
            ]
        );

        return $this->findReservation($id) ?? [];
    }

    public function dispatchReservationNotifications(array $reservation): array
    {
        $content = $this->getContent();
        $booking = is_array($content['site']['booking'] ?? null) ? $content['site']['booking'] : [];
        $contact = is_array($content['site']['contact'] ?? null) ? $content['site']['contact'] : [];
        $config = [
            'email' => trim((string) ($booking['notificationEmail'] ?? ($contact['email'] ?? ''))),
            'teamWhatsAppHref' => trim((string) ($booking['teamWhatsAppHref'] ?? ($contact['whatsappHref'] ?? ''))),
            'webhookUrl' => trim((string) ($booking['notificationWebhookUrl'] ?? '')),
        ];

        $alerts = [
            'dashboard' => [
                'status' => 'saved',
                'detail' => 'Saved to the private Siler Chef reservation dashboard.',
            ],
            'email' => [
                'status' => $config['email'] !== '' ? 'queued' : 'skipped',
                'target' => $config['email'] !== '' ? $config['email'] : null,
                'detail' => $config['email'] !== ''
                    ? 'Attempting delivery to the configured reservation email.'
                    : 'No reservation email destination is configured yet.',
            ],
            'teamWhatsApp' => [
                'status' => $config['teamWhatsAppHref'] !== '' ? 'queued' : 'unconfigured',
                'target' => $config['teamWhatsAppHref'] !== '' ? $config['teamWhatsAppHref'] : null,
                'detail' => $config['teamWhatsAppHref'] !== ''
                    ? 'Attempting delivery to the configured team WhatsApp route.'
                    : 'No team WhatsApp route is configured yet.',
            ],
            'webhook' => [
                'status' => $config['webhookUrl'] !== '' ? 'queued' : 'skipped',
                'target' => $config['webhookUrl'] !== '' ? $config['webhookUrl'] : null,
                'detail' => $config['webhookUrl'] !== ''
                    ? 'Attempting webhook delivery for extra notification routing.'
                    : 'No webhook route is configured.',
            ],
        ];

        if ($config['email'] !== '') {
            $alerts['email'] = $this->sendReservationEmailAlert($config['email'], $reservation);
        }
        if ($config['teamWhatsAppHref'] !== '') {
            $alerts['teamWhatsApp'] = $this->sendReservationWhatsAppAlert($config['teamWhatsAppHref'], $reservation);
        }
        if ($config['webhookUrl'] !== '') {
            $alerts['webhook'] = $this->sendReservationWebhookAlert($config['webhookUrl'], $reservation);
        }

        $this->storeReservationNotificationLog((string) ($reservation['id'] ?? ''), $alerts);
        return $alerts;
    }

    public function updateReservation(string $id, array $patch): ?array
    {
        $current = $this->findReservation($id);
        if ($current === null) {
            return null;
        }

        $nextStatus = isset($patch['status']) ? normalize_reservation_status((string) $patch['status']) : $current['status'];
        $nextAdminNote = array_key_exists('adminNote', $patch)
            ? mb_substr(trim((string) ($patch['adminNote'] ?? '')), 0, 2000)
            : (string) $current['adminNote'];

        $wixSync = $current['wixSync'];
        if (isset($patch['wixSync']) && is_array($patch['wixSync'])) {
            $wixSync = [
                'ok' => !empty($patch['wixSync']['ok']),
                'contactId' => $patch['wixSync']['contactId'] ?? null,
                'error' => $patch['wixSync']['error'] ?? null,
            ];
        }

        $stmt = $this->pdo->prepare(
            'UPDATE reservations
             SET status = :status,
                 admin_note = :admin_note,
                 wix_sync_ok = :wix_sync_ok,
                 wix_contact_id = :wix_contact_id,
                 wix_sync_error = :wix_sync_error,
                 updated_at = :updated_at
             WHERE id = :id'
        );
        $stmt->execute(
            [
                ':status' => $nextStatus,
                ':admin_note' => $nextAdminNote,
                ':wix_sync_ok' => $wixSync['ok'] ? 1 : 0,
                ':wix_contact_id' => $wixSync['contactId'],
                ':wix_sync_error' => $wixSync['error'],
                ':updated_at' => gmdate('c'),
                ':id' => $id,
            ]
        );

        return $this->findReservation($id);
    }

    public function deleteReservation(string $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM reservations WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    public function trackSiteEvent(array $payload): void
    {
        $eventName = trim((string) ($payload['event'] ?? ''));
        if (!$this->isAllowedEventName($eventName)) {
            return;
        }

        $sessionId = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($payload['sessionId'] ?? ''));
        $pagePath = trim((string) ($payload['path'] ?? '/'));
        $meta = $this->normalizeEventMeta($payload['meta'] ?? []);
        $createdAt = gmdate('c');

        $stmt = $this->pdo->prepare(
            'INSERT INTO site_events (
                id, event_name, session_id, page_path, event_meta, created_at
            ) VALUES (
                :id, :event_name, :session_id, :page_path, :event_meta, :created_at
            )'
        );
        $stmt->execute(
            [
                ':id' => $this->uuid(),
                ':event_name' => $eventName,
                ':session_id' => $sessionId !== '' ? mb_substr($sessionId, 0, 120) : 'anon',
                ':page_path' => $pagePath !== '' ? mb_substr($pagePath, 0, 255) : '/',
                ':event_meta' => json_encode($meta, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}',
                ':created_at' => $createdAt,
            ]
        );
    }

    public function analyticsSnapshot(array $context = []): array
    {
        $content = $this->getContent();
        $reservations = $this->listReservations();
        $events = $this->listSiteEvents();

        $counts = [];
        $recentCounts = [];
        $uniqueSessions = [];
        $topCuisines = [];
        $topServices = [];
        $topClickTargets = [];
        $lastEventAt = null;
        $cutoff = strtotime('-7 days') ?: 0;

        $cuisineTitles = [];
        foreach (($content['cuisineCards'] ?? []) as $card) {
            if (!empty($card['slug'])) {
                $cuisineTitles[(string) $card['slug']] = (string) ($card['title'] ?? $card['slug']);
            }
        }

        $serviceTitles = [];
        foreach (($content['serviceCards'] ?? []) as $card) {
            if (!empty($card['slug'])) {
                $serviceTitles[(string) $card['slug']] = (string) ($card['title'] ?? $card['slug']);
            }
        }

        foreach ($events as $event) {
            $name = (string) ($event['event'] ?? '');
            if ($name === '') {
                continue;
            }

            $counts[$name] = ($counts[$name] ?? 0) + 1;
            $sessionId = (string) ($event['sessionId'] ?? '');
            if ($sessionId !== '') {
                $uniqueSessions[$sessionId] = true;
            }

            $createdAt = (string) ($event['createdAt'] ?? '');
            if ($createdAt !== '' && ($lastEventAt === null || strcmp($createdAt, $lastEventAt) > 0)) {
                $lastEventAt = $createdAt;
            }

            $ts = strtotime($createdAt);
            if ($ts !== false && $ts >= $cutoff) {
                $recentCounts[$name] = ($recentCounts[$name] ?? 0) + 1;
            }

            $meta = is_array($event['meta'] ?? null) ? $event['meta'] : [];
            if ($name === 'cuisine_open') {
                $slug = (string) ($meta['slug'] ?? '');
                if ($slug !== '') {
                    $topCuisines[$slug] = ($topCuisines[$slug] ?? 0) + 1;
                }
            }
            if ($name === 'service_open') {
                $slug = (string) ($meta['slug'] ?? '');
                if ($slug !== '') {
                    $topServices[$slug] = ($topServices[$slug] ?? 0) + 1;
                }
            }
            if (in_array($name, ['booking_trigger', 'whatsapp_click', 'contact_click', 'social_click', 'nav_click'], true)) {
                $label = trim((string) ($meta['label'] ?? $meta['placement'] ?? $meta['network'] ?? $meta['target'] ?? $name));
                if ($label !== '') {
                    $topClickTargets[$label] = ($topClickTargets[$label] ?? 0) + 1;
                }
            }
        }

        $statusCounts = [
            'pending' => 0,
            'confirmed' => 0,
            'completed' => 0,
            'cancelled' => 0,
            'blocked' => 0,
        ];
        $lastReservationAt = null;
        foreach ($reservations as $reservation) {
            $status = (string) ($reservation['status'] ?? 'pending');
            if (!isset($statusCounts[$status])) {
                $statusCounts[$status] = 0;
            }
            $statusCounts[$status]++;
            $createdAt = (string) ($reservation['createdAt'] ?? '');
            if ($createdAt !== '' && ($lastReservationAt === null || strcmp($createdAt, $lastReservationAt) > 0)) {
                $lastReservationAt = $createdAt;
            }
        }

        $pageViews = (int) ($counts['page_view'] ?? 0);
        $bookingOpens = (int) ($counts['booking_trigger'] ?? 0);
        $reservationSubmits = (int) ($counts['reservation_submit'] ?? 0);
        $whatsappClicks = (int) ($counts['whatsapp_click'] ?? 0);

        return [
            'overview' => [
                'pageViews' => $pageViews,
                'uniqueSessions' => count($uniqueSessions),
                'bookingOpens' => $bookingOpens,
                'reservationSubmits' => $reservationSubmits,
                'whatsappClicks' => $whatsappClicks,
                'contactClicks' => (int) ($counts['contact_click'] ?? 0),
                'socialClicks' => (int) ($counts['social_click'] ?? 0),
                'navClicks' => (int) ($counts['nav_click'] ?? 0),
                'cuisineOpens' => (int) ($counts['cuisine_open'] ?? 0),
                'serviceOpens' => (int) ($counts['service_open'] ?? 0),
                'totalReservations' => count($reservations),
                'pendingReservations' => (int) ($statusCounts['pending'] ?? 0),
                'confirmedReservations' => (int) ($statusCounts['confirmed'] ?? 0),
                'completedReservations' => (int) ($statusCounts['completed'] ?? 0),
                'cancelledReservations' => (int) ($statusCounts['cancelled'] ?? 0),
                'blockedReservations' => (int) ($statusCounts['blocked'] ?? 0),
                'bookingOpenRate' => $pageViews > 0 ? round(($bookingOpens / $pageViews) * 100, 1) : 0,
                'reservationConversionRate' => $pageViews > 0 ? round(($reservationSubmits / $pageViews) * 100, 1) : 0,
                'bookingToReservationRate' => $bookingOpens > 0 ? round(($reservationSubmits / $bookingOpens) * 100, 1) : 0,
                'whatsappShare' => $pageViews > 0 ? round(($whatsappClicks / $pageViews) * 100, 1) : 0,
                'trackedEvents' => count($events),
            ],
            'topContent' => [
                'cuisines' => $this->topSlugCounts($topCuisines, $cuisineTitles),
                'services' => $this->topSlugCounts($topServices, $serviceTitles),
                'clickTargets' => $this->topLabelCounts($topClickTargets),
            ],
            'recentActivity' => [
                'lastEventAt' => $lastEventAt,
                'lastReservationAt' => $lastReservationAt,
                'pageViewsLast7Days' => (int) ($recentCounts['page_view'] ?? 0),
                'bookingOpensLast7Days' => (int) ($recentCounts['booking_trigger'] ?? 0),
                'reservationSubmitsLast7Days' => (int) ($recentCounts['reservation_submit'] ?? 0),
                'whatsappClicksLast7Days' => (int) ($recentCounts['whatsapp_click'] ?? 0),
            ],
            'statuses' => $statusCounts,
            'optimization' => $this->buildOptimizationSnapshot($content, $context),
        ];
    }

    public function validateAdminCredentials(string $username, string $password): bool
    {
        $stmt = $this->pdo->prepare('SELECT password_hash FROM admins WHERE username = :username LIMIT 1');
        $stmt->execute([':username' => $username]);
        $row = $stmt->fetch();
        if (!is_array($row) || empty($row['password_hash'])) {
            return false;
        }

        return password_verify($password, (string) $row['password_hash']);
    }

    private function createSchema(): void
    {
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS app_settings (
                setting_key TEXT PRIMARY KEY,
                setting_value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )'
        );

        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS admins (
                username TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )'
        );

        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS reservations (
                id TEXT PRIMARY KEY,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                event_location TEXT NOT NULL DEFAULT \'\',
                zip_code TEXT NOT NULL DEFAULT \'\',
                preferred_date TEXT NOT NULL,
                preferred_time TEXT NOT NULL,
                preferred_contact TEXT NOT NULL DEFAULT \'any\',
                guest_count INTEGER NULL,
                cuisine_preference TEXT NOT NULL DEFAULT \'\',
                allergy_notes TEXT NOT NULL DEFAULT \'\',
                notes TEXT NOT NULL,
                status TEXT NOT NULL,
                admin_note TEXT NOT NULL,
                notification_log TEXT NOT NULL DEFAULT \'{}\',
                wix_sync_ok INTEGER NOT NULL DEFAULT 0,
                wix_contact_id TEXT NULL,
                wix_sync_error TEXT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NULL
            )'
        );

        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS site_events (
                id TEXT PRIMARY KEY,
                event_name TEXT NOT NULL,
                session_id TEXT NOT NULL,
                page_path TEXT NOT NULL,
                event_meta TEXT NOT NULL,
                created_at TEXT NOT NULL
            )'
        );
        $this->pdo->exec('CREATE INDEX IF NOT EXISTS idx_site_events_created_at ON site_events(created_at)');
        $this->pdo->exec('CREATE INDEX IF NOT EXISTS idx_site_events_name ON site_events(event_name)');
    }

    private function ensureReservationColumns(): void
    {
        $this->ensureColumn('reservations', 'event_location', "TEXT NOT NULL DEFAULT ''");
        $this->ensureColumn('reservations', 'zip_code', "TEXT NOT NULL DEFAULT ''");
        $this->ensureColumn('reservations', 'preferred_contact', "TEXT NOT NULL DEFAULT 'any'");
        $this->ensureColumn('reservations', 'cuisine_preference', "TEXT NOT NULL DEFAULT ''");
        $this->ensureColumn('reservations', 'allergy_notes', "TEXT NOT NULL DEFAULT ''");
        $this->ensureColumn('reservations', 'notification_log', "TEXT NOT NULL DEFAULT '{}'");
    }

    private function ensureColumn(string $table, string $column, string $definition): void
    {
        if ($this->columnExists($table, $column)) {
            return;
        }

        $this->pdo->exec(sprintf('ALTER TABLE %s ADD COLUMN %s %s', $table, $column, $definition));
    }

    private function columnExists(string $table, string $column): bool
    {
        if ($this->driver === 'pgsql') {
            $stmt = $this->pdo->prepare(
                'SELECT 1
                   FROM information_schema.columns
                  WHERE table_schema = current_schema()
                    AND table_name = :table
                    AND column_name = :column
                  LIMIT 1'
            );
            $stmt->execute([
                ':table' => $table,
                ':column' => $column,
            ]);
            return (bool) $stmt->fetchColumn();
        }

        $stmt = $this->pdo->query(sprintf('PRAGMA table_info(%s)', $table));
        foreach ($stmt->fetchAll() as $row) {
            if ((string) ($row['name'] ?? '') === $column) {
                return true;
            }
        }

        return false;
    }

    private function storeReservationNotificationLog(string $id, array $alerts): void
    {
        if ($id === '') {
            return;
        }

        $stmt = $this->pdo->prepare(
            'UPDATE reservations
                SET notification_log = :notification_log,
                    updated_at = :updated_at
              WHERE id = :id'
        );
        $stmt->execute([
            ':notification_log' => json_encode($alerts, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}',
            ':updated_at' => gmdate('c'),
            ':id' => $id,
        ]);
    }

    private function sendReservationEmailAlert(string $to, array $reservation): array
    {
        $subject = sprintf(
            'New Siler Chef reservation request · %s',
            $this->formatReservationQuickSummary($reservation)
        );
        $body = $this->buildReservationAlertText($reservation);
        $replyTo = trim((string) ($reservation['customer']['email'] ?? ''));
        $resendApiKey = env_string('RESEND_API_KEY', '');
        $from = env_string('NOTIFICATION_FROM_EMAIL', env_string('RESEND_FROM_EMAIL', 'no-reply@silerchef.com'));

        if ($resendApiKey !== '' && $from !== '') {
            $payload = [
                'from' => $from,
                'to' => [$to],
                'subject' => $subject,
                'text' => $body,
            ];
            if ($replyTo !== '' && valid_email($replyTo)) {
                $payload['reply_to'] = $replyTo;
            }
            [$ok, $statusCode, $detail] = $this->postJsonRequest(
                'https://api.resend.com/emails',
                $payload,
                [
                    'Authorization: Bearer ' . $resendApiKey,
                    'Content-Type: application/json',
                ]
            );

            return [
                'status' => $ok ? 'sent' : 'failed',
                'target' => $to,
                'detail' => $ok
                    ? 'Reservation alert sent through Resend.'
                    : ($detail !== '' ? $detail : ('Resend delivery failed' . ($statusCode > 0 ? ' (HTTP ' . $statusCode . ')' : '') . '.')),
            ];
        }

        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'From: Siler Chef <' . $from . '>',
        ];
        if ($replyTo !== '' && valid_email($replyTo)) {
            $headers[] = 'Reply-To: ' . $replyTo;
        }
        $sent = function_exists('mail') ? @mail($to, $subject, $body, implode("\r\n", $headers)) : false;
        return [
            'status' => $sent ? 'sent' : 'failed',
            'target' => $to,
            'detail' => $sent
                ? 'Reservation alert sent to the configured inbox.'
                : 'Email alert could not be delivered from this server yet. Add RESEND_API_KEY and RESEND_FROM_EMAIL for provider-backed delivery.',
        ];
    }

    private function sendReservationWhatsAppAlert(string $href, array $reservation): array
    {
        $message = $this->buildReservationWhatsAppText($reservation);
        $quickLink = $this->buildTeamWhatsAppAlertUrl($href, $message);
        $accountSid = env_string('TWILIO_ACCOUNT_SID', '');
        $authToken = env_string('TWILIO_AUTH_TOKEN', '');
        $from = env_string('TWILIO_WHATSAPP_FROM', '');
        $to = env_string('TWILIO_WHATSAPP_TO', '');

        if ($to === '') {
            $parsedPhone = $this->extractPhoneFromWhatsAppHref($href);
            if ($parsedPhone !== '') {
                $to = 'whatsapp:+' . $parsedPhone;
            }
        }

        if ($accountSid !== '' && $authToken !== '' && $from !== '' && $to !== '') {
            [$ok, $statusCode, $detail] = $this->postFormRequest(
                'https://api.twilio.com/2010-04-01/Accounts/' . rawurlencode($accountSid) . '/Messages.json',
                [
                    'From' => $from,
                    'To' => $to,
                    'Body' => $message,
                ],
                $accountSid,
                $authToken
            );

            return [
                'status' => $ok ? 'sent' : 'failed',
                'target' => $to,
                'detail' => $ok
                    ? 'WhatsApp alert sent through Twilio.'
                    : ($detail !== '' ? $detail : ('Twilio WhatsApp delivery failed' . ($statusCode > 0 ? ' (HTTP ' . $statusCode . ')' : '') . '.')),
                'quickLink' => $quickLink !== '' ? $quickLink : null,
            ];
        }

        return [
            'status' => 'configured',
            'target' => $quickLink !== '' ? $quickLink : $href,
            'detail' => 'WhatsApp route is configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, and TWILIO_WHATSAPP_TO for automatic delivery.',
            'quickLink' => $quickLink !== '' ? $quickLink : null,
        ];
    }

    private function sendReservationWebhookAlert(string $url, array $reservation): array
    {
        $payload = $this->buildReservationAlertPayload($reservation);
        [$ok, $statusCode, $detail] = $this->postJson($url, $payload);

        return [
            'status' => $ok ? 'sent' : 'failed',
            'target' => $url,
            'detail' => $ok
                ? 'Webhook alert delivered successfully.'
                : ($detail !== '' ? $detail : ('Webhook alert failed' . ($statusCode > 0 ? ' (HTTP ' . $statusCode . ')' : '') . '.')),
        ];
    }

    private function postJson(string $url, array $payload): array
    {
        return $this->postJsonRequest($url, $payload, ['Content-Type: application/json']);
    }

    private function postJsonRequest(string $url, array $payload, array $headers): array
    {
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (!is_string($body)) {
            return [false, 0, 'Webhook payload could not be encoded.'];
        }

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array(
                $ch,
                [
                    CURLOPT_POST => true,
                    CURLOPT_HTTPHEADER => $headers,
                    CURLOPT_POSTFIELDS => $body,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_CONNECTTIMEOUT => 4,
                    CURLOPT_TIMEOUT => 15,
                    CURLOPT_HEADER => false,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_MAXREDIRS => 5,
                ]
            );
            $response = curl_exec($ch);
            $err = curl_error($ch);
            $statusCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            curl_close($ch);
            if ($response === false) {
                return [false, $statusCode, $err !== '' ? $err : 'Unable to reach the webhook endpoint.'];
            }
            return [$statusCode >= 200 && $statusCode < 300, $statusCode, ''];
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $headers) . "\r\n",
                'content' => $body,
                'timeout' => 15,
                'ignore_errors' => true,
                'follow_location' => 1,
                'max_redirects' => 5,
            ],
        ]);
        $response = @file_get_contents($url, false, $context);
        $statusLine = is_array($http_response_header ?? null) ? ((string) ($http_response_header[0] ?? '')) : '';
        $statusCode = preg_match('/\s(\d{3})\s/', $statusLine, $matches) ? (int) $matches[1] : 0;
        if ($response === false) {
            return [false, $statusCode, 'Unable to reach the webhook endpoint.'];
        }

        return [$statusCode >= 200 && $statusCode < 300, $statusCode, ''];
    }

    private function postFormRequest(string $url, array $payload, string $username = '', string $password = ''): array
    {
        $body = http_build_query($payload);
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            $headers = ['Content-Type: application/x-www-form-urlencoded'];
            curl_setopt_array(
                $ch,
                [
                    CURLOPT_POST => true,
                    CURLOPT_HTTPHEADER => $headers,
                    CURLOPT_POSTFIELDS => $body,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_CONNECTTIMEOUT => 4,
                    CURLOPT_TIMEOUT => 15,
                    CURLOPT_HEADER => false,
                ]
            );
            if ($username !== '' || $password !== '') {
                curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
                curl_setopt($ch, CURLOPT_USERPWD, $username . ':' . $password);
            }
            $response = curl_exec($ch);
            $err = curl_error($ch);
            $statusCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            curl_close($ch);
            if ($response === false) {
                return [false, $statusCode, $err !== '' ? $err : 'Unable to reach the form endpoint.'];
            }
            return [$statusCode >= 200 && $statusCode < 300, $statusCode, ''];
        }

        return [false, 0, 'cURL is required for form-encoded notification delivery.'];
    }

    private function buildReservationAlertPayload(array $reservation): array
    {
        return [
            'type' => 'reservation.created',
            'reservation' => $reservation,
            'summary' => $this->formatReservationQuickSummary($reservation),
            'whatsAppText' => $this->buildReservationWhatsAppText($reservation),
            'generatedAt' => gmdate('c'),
        ];
    }

    private function buildReservationAlertText(array $reservation): string
    {
        $customer = is_array($reservation['customer'] ?? null) ? $reservation['customer'] : [];
        $request = is_array($reservation['request'] ?? null) ? $reservation['request'] : [];

        $lines = [
            'A new reservation request has been created on silerchef.com.',
            '',
            'Reservation ID: ' . (string) ($reservation['id'] ?? '-'),
            'Created at: ' . (string) ($reservation['createdAt'] ?? gmdate('c')),
            '',
            'Preferred date: ' . ((string) ($request['preferredDate'] ?? '') !== '' ? (string) $request['preferredDate'] : '-'),
            'Event location: ' . ((string) ($request['eventLocation'] ?? '') !== '' ? (string) $request['eventLocation'] : '-'),
            'Guests: ' . ((string) ($request['guestCount'] ?? '') !== '' ? (string) $request['guestCount'] : '-'),
            'Cuisine: ' . ((string) ($request['cuisinePreference'] ?? '') !== '' ? (string) $request['cuisinePreference'] : '-'),
            'Allergies / intolerances: ' . ((string) ($request['allergyNotes'] ?? '') !== '' ? (string) $request['allergyNotes'] : '-'),
            '',
            'Notes:',
            ((string) ($request['notes'] ?? '') !== '' ? (string) $request['notes'] : '-'),
            '',
            'Guest: ' . trim(((string) ($customer['firstName'] ?? '')) . ' ' . ((string) ($customer['lastName'] ?? ''))),
            'Phone: ' . ((string) ($customer['phone'] ?? '') !== '' ? (string) $customer['phone'] : '-'),
            'Email: ' . (((string) ($customer['email'] ?? '')) !== '' ? (string) $customer['email'] : '-'),
            'Open the Siler Chef admin panel to review and follow up.',
        ];

        return implode("\n", $lines);
    }

    private function buildReservationWhatsAppText(array $reservation): string
    {
        $customer = is_array($reservation['customer'] ?? null) ? $reservation['customer'] : [];
        $request = is_array($reservation['request'] ?? null) ? $reservation['request'] : [];
        $name = trim(((string) ($customer['firstName'] ?? '')) . ' ' . ((string) ($customer['lastName'] ?? '')));

        $lines = [
            'New Siler Chef reservation request',
            'Date: ' . (((string) ($request['preferredDate'] ?? '')) !== '' ? (string) $request['preferredDate'] : '-'),
            'Location: ' . (((string) ($request['eventLocation'] ?? '')) !== '' ? (string) $request['eventLocation'] : '-'),
            'Guests: ' . (((string) ($request['guestCount'] ?? '')) !== '' ? (string) $request['guestCount'] : '-'),
            'Cuisine: ' . (((string) ($request['cuisinePreference'] ?? '')) !== '' ? (string) $request['cuisinePreference'] : '-'),
            'Allergies: ' . (((string) ($request['allergyNotes'] ?? '')) !== '' ? (string) $request['allergyNotes'] : '-'),
            'Notes: ' . (((string) ($request['notes'] ?? '')) !== '' ? (string) $request['notes'] : '-'),
            'Guest: ' . ($name !== '' ? $name : 'Guest request'),
            'Phone: ' . (((string) ($customer['phone'] ?? '')) !== '' ? (string) $customer['phone'] : '-'),
            'Email: ' . (((string) ($customer['email'] ?? '')) !== '' ? (string) $customer['email'] : '-'),
        ];

        $zipCode = trim((string) ($request['zipCode'] ?? ''));
        if ($zipCode !== '') {
            $lines[] = 'ZIP: ' . $zipCode;
        }

        return implode("\n", $lines);
    }

    private function buildTeamWhatsAppAlertUrl(string $href, string $message): string
    {
        $phone = $this->extractPhoneFromWhatsAppHref($href);
        if ($phone === '') {
            return $href;
        }

        return 'https://wa.me/' . rawurlencode($phone) . '?text=' . rawurlencode($message);
    }

    private function extractPhoneFromWhatsAppHref(string $href): string
    {
        if ($href === '') {
            return '';
        }
        if (preg_match('~wa\.me/(\d+)~', $href, $matches)) {
            return (string) $matches[1];
        }
        if (preg_match('~phone=(\d+)~', $href, $matches)) {
            return (string) $matches[1];
        }

        return '';
    }

    private function formatReservationQuickSummary(array $reservation): string
    {
        $customer = is_array($reservation['customer'] ?? null) ? $reservation['customer'] : [];
        $request = is_array($reservation['request'] ?? null) ? $reservation['request'] : [];
        $name = trim(((string) ($customer['firstName'] ?? '')) . ' ' . ((string) ($customer['lastName'] ?? '')));
        $date = trim((string) ($request['preferredDate'] ?? ''));
        $guests = $request['guestCount'] ?? null;

        $parts = array_filter([
            $name !== '' ? $name : 'Guest request',
            $date !== '' ? $date : null,
            $guests !== null && $guests !== '' ? (string) $guests . ' guests' : null,
        ]);

        return implode(' · ', $parts);
    }

    private function seedContentIfMissing(): void
    {
        if ($this->getSetting('site_content') !== null) {
            return;
        }

        $this->setSetting('site_content', $this->loadSeedContent());
    }

    private function seedReservationsIfMissing(): void
    {
        $count = (int) $this->pdo->query('SELECT COUNT(*) FROM reservations')->fetchColumn();
        if ($count > 0 || !is_file($this->seedReservationsFile)) {
            return;
        }

        $raw = json_decode((string) file_get_contents($this->seedReservationsFile), true);
        if (!is_array($raw)) {
            return;
        }

        foreach ($raw as $reservation) {
            if (!is_array($reservation) || empty($reservation['id'])) {
                continue;
            }
            $stmt = $this->pdo->prepare(
                'INSERT INTO reservations (
                    id, first_name, last_name, email, phone, event_location, zip_code, preferred_date, preferred_time, preferred_contact, guest_count, cuisine_preference, allergy_notes, notes,
                    status, admin_note, notification_log, wix_sync_ok, wix_contact_id, wix_sync_error, created_at, updated_at
                ) VALUES (
                    :id, :first_name, :last_name, :email, :phone, :event_location, :zip_code, :preferred_date, :preferred_time, :preferred_contact, :guest_count, :cuisine_preference, :allergy_notes, :notes,
                    :status, :admin_note, :notification_log, :wix_sync_ok, :wix_contact_id, :wix_sync_error, :created_at, :updated_at
                )'
            );
            $stmt->execute(
                [
                    ':id' => (string) $reservation['id'],
                    ':first_name' => (string) ($reservation['customer']['firstName'] ?? ''),
                    ':last_name' => (string) ($reservation['customer']['lastName'] ?? ''),
                    ':email' => (string) ($reservation['customer']['email'] ?? ''),
                    ':phone' => (string) ($reservation['customer']['phone'] ?? ''),
                    ':event_location' => (string) ($reservation['request']['eventLocation'] ?? ''),
                    ':zip_code' => normalize_zip_code((string) ($reservation['request']['zipCode'] ?? '')),
                    ':preferred_date' => (string) ($reservation['request']['preferredDate'] ?? ''),
                    ':preferred_time' => (string) ($reservation['request']['preferredTime'] ?? ''),
                    ':preferred_contact' => normalize_preferred_contact((string) ($reservation['request']['preferredContact'] ?? '')),
                    ':guest_count' => $reservation['request']['guestCount'] ?? null,
                    ':cuisine_preference' => (string) ($reservation['request']['cuisinePreference'] ?? ''),
                    ':allergy_notes' => (string) ($reservation['request']['allergyNotes'] ?? ''),
                    ':notes' => (string) ($reservation['request']['notes'] ?? ''),
                    ':status' => normalize_reservation_status((string) ($reservation['status'] ?? 'pending')),
                    ':admin_note' => (string) ($reservation['adminNote'] ?? ''),
                    ':notification_log' => json_encode($reservation['notifications'] ?? new stdClass(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}',
                    ':wix_sync_ok' => !empty($reservation['wixSync']['ok']) ? 1 : 0,
                    ':wix_contact_id' => $reservation['wixSync']['contactId'] ?? null,
                    ':wix_sync_error' => $reservation['wixSync']['error'] ?? null,
                    ':created_at' => (string) ($reservation['createdAt'] ?? gmdate('c')),
                    ':updated_at' => $reservation['updatedAt'] ?? null,
                ]
            );
        }
    }

    private function syncAdminFromEnvironment(): void
    {
        $username = env_string('ADMIN_USERNAME', '');
        $password = env_string('ADMIN_PASSWORD', '');
        if ($username === '' || $password === '') {
            return;
        }

        $displayName = env_string('ADMIN_DISPLAY_NAME', ucfirst($username));
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $now = gmdate('c');

        if ($this->driver === 'pgsql') {
            $sql = 'INSERT INTO admins (username, display_name, password_hash, created_at, updated_at)
                    VALUES (:username, :display_name, :password_hash, :created_at, :updated_at)
                    ON CONFLICT (username) DO UPDATE SET
                      display_name = EXCLUDED.display_name,
                      password_hash = EXCLUDED.password_hash,
                      updated_at = EXCLUDED.updated_at';
        } else {
            $sql = 'INSERT INTO admins (username, display_name, password_hash, created_at, updated_at)
                    VALUES (:username, :display_name, :password_hash, :created_at, :updated_at)
                    ON CONFLICT(username) DO UPDATE SET
                      display_name = excluded.display_name,
                      password_hash = excluded.password_hash,
                      updated_at = excluded.updated_at';
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(
            [
                ':username' => $username,
                ':display_name' => $displayName,
                ':password_hash' => $passwordHash,
                ':created_at' => $now,
                ':updated_at' => $now,
            ]
        );
    }

    private function getSetting(string $key): mixed
    {
        $stmt = $this->pdo->prepare('SELECT setting_value FROM app_settings WHERE setting_key = :key LIMIT 1');
        $stmt->execute([':key' => $key]);
        $raw = $stmt->fetchColumn();
        if ($raw === false) {
            return null;
        }

        $decoded = json_decode((string) $raw, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : null;
    }

    private function setSetting(string $key, array $value): void
    {
        $encoded = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($encoded === false) {
            throw new RuntimeException('Unable to encode setting');
        }

        $now = gmdate('c');
        if ($this->driver === 'pgsql') {
            $sql = 'INSERT INTO app_settings (setting_key, setting_value, updated_at)
                    VALUES (:key, :value, :updated_at)
                    ON CONFLICT (setting_key) DO UPDATE SET
                      setting_value = EXCLUDED.setting_value,
                      updated_at = EXCLUDED.updated_at';
        } else {
            $sql = 'INSERT INTO app_settings (setting_key, setting_value, updated_at)
                    VALUES (:key, :value, :updated_at)
                    ON CONFLICT(setting_key) DO UPDATE SET
                      setting_value = excluded.setting_value,
                      updated_at = excluded.updated_at';
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(
            [
                ':key' => $key,
                ':value' => $encoded,
                ':updated_at' => $now,
            ]
        );
    }

    private function loadSeedContent(): array
    {
        if (!is_file($this->seedContentFile)) {
            throw new RuntimeException('Missing config/default-site-content.json');
        }

        $raw = json_decode((string) file_get_contents($this->seedContentFile), true);
        if (!is_array($raw)) {
            throw new RuntimeException('Invalid config/default-site-content.json');
        }

        return $raw;
    }

    private function findReservation(string $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM reservations WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return is_array($row) ? $this->hydrateReservation($row) : null;
    }

    private function listSiteEvents(): array
    {
        $stmt = $this->pdo->query(
            'SELECT event_name, session_id, page_path, event_meta, created_at
             FROM site_events
             ORDER BY created_at DESC'
        );
        $rows = $stmt->fetchAll();

        return array_map(
            function (array $row): array {
                $meta = json_decode((string) ($row['event_meta'] ?? '{}'), true);
                return [
                    'event' => (string) ($row['event_name'] ?? ''),
                    'sessionId' => (string) ($row['session_id'] ?? ''),
                    'path' => (string) ($row['page_path'] ?? '/'),
                    'meta' => is_array($meta) ? $meta : [],
                    'createdAt' => (string) ($row['created_at'] ?? ''),
                ];
            },
            $rows
        );
    }

    private function hydrateReservation(array $row): array
    {
        return [
            'id' => (string) $row['id'],
            'createdAt' => (string) $row['created_at'],
            'updatedAt' => $row['updated_at'] !== null ? (string) $row['updated_at'] : null,
            'status' => (string) $row['status'],
            'adminNote' => (string) $row['admin_note'],
            'notifications' => is_array(json_decode((string) ($row['notification_log'] ?? '{}'), true))
                ? json_decode((string) ($row['notification_log'] ?? '{}'), true)
                : [],
            'wixSync' => [
                'ok' => (bool) $row['wix_sync_ok'],
                'contactId' => $row['wix_contact_id'] !== null ? (string) $row['wix_contact_id'] : null,
                'error' => $row['wix_sync_error'] !== null ? (string) $row['wix_sync_error'] : null,
            ],
            'customer' => [
                'firstName' => (string) $row['first_name'],
                'lastName' => (string) $row['last_name'],
                'email' => (string) $row['email'],
                'phone' => (string) $row['phone'],
            ],
            'request' => [
                'eventLocation' => (string) ($row['event_location'] ?? ''),
                'zipCode' => (string) ($row['zip_code'] ?? ''),
                'preferredDate' => (string) $row['preferred_date'],
                'preferredTime' => (string) $row['preferred_time'],
                'preferredContact' => normalize_preferred_contact((string) ($row['preferred_contact'] ?? 'any')),
                'guestCount' => $row['guest_count'] !== null ? (int) $row['guest_count'] : null,
                'cuisinePreference' => (string) ($row['cuisine_preference'] ?? ''),
                'allergyNotes' => (string) ($row['allergy_notes'] ?? ''),
                'notes' => (string) $row['notes'],
            ],
        ];
    }

    private function isAllowedEventName(string $eventName): bool
    {
        static $allowed = [
            'page_view' => true,
            'booking_trigger' => true,
            'reservation_submit' => true,
            'whatsapp_click' => true,
            'contact_click' => true,
            'social_click' => true,
            'nav_click' => true,
            'cuisine_open' => true,
            'service_open' => true,
        ];

        return isset($allowed[$eventName]);
    }

    private function normalizeEventMeta(mixed $meta): array
    {
        if (!is_array($meta)) {
            return [];
        }

        $allowedKeys = ['slug', 'title', 'label', 'placement', 'network', 'target', 'kind'];
        $out = [];
        foreach ($allowedKeys as $key) {
            if (!array_key_exists($key, $meta)) {
                continue;
            }
            $value = trim((string) $meta[$key]);
            if ($value === '') {
                continue;
            }
            $out[$key] = mb_substr($value, 0, 160);
        }

        return $out;
    }

    private function topSlugCounts(array $counts, array $titles): array
    {
        arsort($counts);
        $out = [];
        foreach (array_slice($counts, 0, 5, true) as $slug => $count) {
            $out[] = [
                'slug' => (string) $slug,
                'title' => (string) ($titles[$slug] ?? $slug),
                'count' => (int) $count,
            ];
        }
        return $out;
    }

    private function topLabelCounts(array $counts): array
    {
        arsort($counts);
        $out = [];
        foreach (array_slice($counts, 0, 6, true) as $label => $count) {
            $out[] = [
                'label' => (string) $label,
                'count' => (int) $count,
            ];
        }
        return $out;
    }

    private function buildOptimizationSnapshot(array $content, array $context): array
    {
        $publicHtml = @file_get_contents(dirname(__DIR__) . '/embed/index.html') ?: '';
        $adminHtml = @file_get_contents(dirname(__DIR__) . '/embed/admin.html') ?: '';

        $canonical = '';
        if (preg_match('/<link\s+rel="canonical"\s+href="([^"]+)"/i', $publicHtml, $matches)) {
            $canonical = trim((string) ($matches[1] ?? ''));
        }

        $host = trim((string) ($context['host'] ?? ''));
        $scheme = strtolower(trim((string) ($context['scheme'] ?? 'https')));
        $bookingFallback = trim((string) ($content['site']['booking']['fallbackUrl'] ?? ''));
        $isCustomDomain = (bool) preg_match('/(^|\.)silerchef\.com$/i', $host);
        $customDomainConfigured = $canonical === 'https://www.silerchef.com/';
        $hasStructuredData = str_contains($publicHtml, 'application/ld+json');
        $adminNoindex = (bool) preg_match('/meta\s+name="robots"\s+content="noindex/i', $adminHtml);
        $publicIndexable = (bool) preg_match('/meta\s+name="robots"\s+content="index,\s*follow/i', $publicHtml);
        $localSeoSource = implode(
            ' ',
            array_filter([
                (string) ($content['site']['hero']['tagline'] ?? ''),
                (string) ($content['site']['hero']['lede'] ?? ''),
                (string) ($content['site']['cta']['summary'] ?? ''),
                (string) ($content['site']['contact']['subtitle'] ?? ''),
                $publicHtml,
            ])
        );
        $hasLocalAreaSignals = preg_match('/reno/i', $localSeoSource)
            && preg_match('/tahoe/i', $localSeoSource)
            && preg_match('/bay area/i', $localSeoSource);

        return [
            'host' => $host,
            'scheme' => $scheme,
            'checks' => [
                [
                    'label' => 'Custom domain',
                    'status' => ($isCustomDomain || $customDomainConfigured) ? 'ok' : 'warn',
                    'detail' => $isCustomDomain
                        ? 'Public traffic is resolving under silerchef.com.'
                        : ($customDomainConfigured
                            ? 'Canonical targeting is already set to www.silerchef.com. Admin may still be opened from the Railway host.'
                            : ($host !== '' ? 'Current admin host is ' . $host . '. Public domain should resolve to silerchef.com.' : 'Custom domain host could not be detected.')),
                ],
                [
                    'label' => 'HTTPS delivery',
                    'status' => $scheme === 'https' ? 'ok' : 'warn',
                    'detail' => $scheme === 'https' ? 'Secure HTTPS delivery is active.' : 'HTTPS should be enforced for SEO and trust.',
                ],
                [
                    'label' => 'Canonical URL',
                    'status' => $canonical === 'https://www.silerchef.com/' ? 'ok' : 'warn',
                    'detail' => $canonical !== '' ? $canonical : 'Canonical tag missing from the public page.',
                ],
                [
                    'label' => 'Clean URLs',
                    'status' => 'ok',
                    'detail' => 'Legacy /index.html and /admin.html routes redirect to / and /admin with permanent redirects.',
                ],
                [
                    'label' => 'Structured data',
                    'status' => $hasStructuredData ? 'ok' : 'warn',
                    'detail' => $hasStructuredData ? 'Schema markup is present for WebSite, LocalBusiness, and Service.' : 'Structured data could not be detected.',
                ],
                [
                    'label' => 'Local market SEO copy',
                    'status' => $hasLocalAreaSignals ? 'ok' : 'warn',
                    'detail' => $hasLocalAreaSignals
                        ? 'Visible copy references Reno, Lake Tahoe, and the Bay Area for local search relevance.'
                        : 'Add visible service-area copy for Reno, Lake Tahoe, and the Bay Area.',
                ],
                [
                    'label' => 'Search engine controls',
                    'status' => ($publicIndexable && $adminNoindex) ? 'ok' : 'warn',
                    'detail' => ($publicIndexable && $adminNoindex)
                        ? 'Public page is indexable while the admin panel stays out of search results.'
                        : 'Review robots directives for public and admin pages.',
                ],
                [
                    'label' => 'Native reservation flow',
                    'status' => str_contains($bookingFallback, 'wa.me') || str_contains($bookingFallback, '#contact') ? 'ok' : 'warn',
                    'detail' => 'Reservations are managed in the PHP dashboard and database, with WhatsApp as the quick-contact fallback.',
                ],
            ],
        ];
    }

    private function normalizeContent(array $content): array
    {
        if (!isset($content['availability']) || !is_array($content['availability'])) {
            $content['availability'] = ['note' => '', 'blockedDates' => []];
        }
        $content['availability'] = normalize_availability($content['availability']);
        $seed = $this->loadSeedContent();
        $content['site'] = deep_merge(
            is_array($seed['site'] ?? null) ? $seed['site'] : [],
            is_array($content['site'] ?? null) ? $content['site'] : []
        );

        if (!isset($content['serviceCards']) || !is_array($content['serviceCards'])) {
            $content['serviceCards'] = [];
        }
        $serviceCardSlugs = [];
        foreach ($content['serviceCards'] as $card) {
            if (!empty($card['slug'])) {
                $serviceCardSlugs[(string) $card['slug']] = true;
            }
        }
        foreach (($seed['serviceCards'] ?? []) as $card) {
            if (!is_array($card) || empty($card['slug'])) {
                continue;
            }
            $slug = (string) $card['slug'];
            if (!isset($serviceCardSlugs[$slug])) {
                $content['serviceCards'][] = $card;
                $serviceCardSlugs[$slug] = true;
            }
        }

        if (!isset($content['services']) || !is_array($content['services'])) {
            $content['services'] = [];
        }
        foreach (($seed['services'] ?? []) as $slug => $definition) {
            if (!isset($content['services'][$slug]) || !is_array($content['services'][$slug])) {
                $content['services'][$slug] = $definition;
            }
        }

        $legacyHeroHeadline = 'Global Flavors, Happy Tables, Unforgettable Moments';
        $legacyHeroTagline = 'Reno · Private dining · Bespoke menus';
        $legacyHeroLede = 'Exquisite world cuisines in the comfort of your home - Chef Siler curates and shapes each experience for your table.';
        $legacyServicesLede = 'Corporate milestones, workshops, family tables, and intimate celebrations - open any card for experience pillars and a full image strip.';
        $legacyCtaSummary = 'Choose a time, tell us about your occasion, and we’ll follow up with menu direction.';
        $legacyBookingLede = 'Tell us about your table - we’ll confirm and shape the menu from here.';
        $legacyBookingSuccess = 'We’ll follow up shortly to confirm timing and menu direction.';
        $legacyContactSubtitle = 'Chef Siler · Reno, Nevada - call, message, or follow.';
        $hero = isset($content['site']['hero']) && is_array($content['site']['hero'])
            ? $content['site']['hero']
            : [];
        if (($hero['headline'] ?? '') === $legacyHeroHeadline) {
            $content['site']['hero']['headline'] = 'SilerChef: Global Flavors, Happy Tables, Unforgettable Moments.';
        }
        if (($hero['tagline'] ?? '') === $legacyHeroTagline) {
            $content['site']['hero']['tagline'] = 'Reno · Tahoe · Bay Area · Luxury in-home experiences';
        }
        if (($hero['lede'] ?? '') === $legacyHeroLede) {
            $content['site']['hero']['lede'] =
                'For hosts who want more than dinner, Siler Chef designs globally inspired menus, refined plating, and an effortless service flow that turns home entertaining into a true occasion.';
        }
        if (($content['site']['servicesSection']['lede'] ?? '') === $legacyServicesLede) {
            $content['site']['servicesSection']['lede'] =
                'Corporate milestones, private lessons, family tables, and intimate celebrations - open any card for planning notes, sample flow, and a full image strip.';
        }
        if (($content['site']['cta']['summary'] ?? '') === $legacyCtaSummary) {
            $content['site']['cta']['summary'] =
                'Choose a date, tell us about your occasion, and your request will land in the reservation desk for follow-up by phone or email.';
        }
        if (($content['site']['booking']['lede'] ?? '') === $legacyBookingLede) {
            $content['site']['booking']['lede'] =
                'Tell us about your table - your request goes straight into the Siler Chef reservation desk, then we follow up by phone or email.';
        }
        if (($content['site']['booking']['steps'][0]['body'] ?? '') === 'Share your event date, guest count, cuisine choice, and location.') {
            $content['site']['booking']['steps'][0]['body'] =
                'Choose a date at least 2 days out, then share your location, guest count, cuisine style, and dietary notes.';
        }
        if (($content['site']['booking']['steps'][1]['title'] ?? '') === 'We follow up') {
            $content['site']['booking']['steps'][1]['title'] = 'We review the brief';
        }
        if (($content['site']['booking']['steps'][1]['body'] ?? '') === 'Our team reaches out by phone, email, or WhatsApp to confirm the fit.') {
            $content['site']['booking']['steps'][1]['body'] =
                'Chef Siler' . "\u{2019}" . 's team reviews the request and comes back with the right next step.';
        }
        if (($content['site']['booking']['steps'][2]['title'] ?? '') === 'Menu direction') {
            $content['site']['booking']['steps'][2]['title'] = 'We shape the experience';
        }
        if (($content['site']['booking']['steps'][2]['body'] ?? '') === 'Chef Siler shapes the service flow and menu around your event.') {
            $content['site']['booking']['steps'][2]['body'] =
                'Menu direction, pacing, and service style are then tailored around your occasion.';
        }
        if (($content['site']['booking']['formSub'] ?? '') === 'Everything below goes directly to the private reservation dashboard.') {
            $content['site']['booking']['formSub'] =
                'Share the essentials below and Chef Siler' . "\u{2019}" . 's team will review your request and follow up personally.';
        }
        if (($content['site']['booking']['successText'] ?? '') === $legacyBookingSuccess) {
            $content['site']['booking']['successText'] =
                'We will be in touch with you as soon as possible.';
        }
        if (($content['site']['booking']['successTitle'] ?? '') === 'Thank you - your request is in.') {
            $content['site']['booking']['successTitle'] = 'Request received.';
        }
        if (($content['site']['contact']['subtitle'] ?? '') === $legacyContactSubtitle) {
            $content['site']['contact']['subtitle'] =
                'Chef Siler · Reno, Nevada - serving Reno, Lake Tahoe, and the Bay Area.';
        }
        if (in_array(($content['site']['contact']['facebookHref'] ?? ''), [
            'https://www.facebook.com/silerchef',
            'https://www.facebook.com/people/Siler-Chef',
        ], true)) {
            $content['site']['contact']['facebookHref'] = 'https://www.facebook.com/share/1Eea7fQpfV/?mibextid=wwXIfr';
        }
        $gbpMapsHref =
            'https://www.google.com/maps/place/Siler+Chef+LLC/@39.543334371593346,-119.82424082388114,17z/data=!4m6!3m5!1s0xa180e099e5f7d05b:0x5f23cef288df732e!8m2!3d39.543334371593346!4d-119.82424082388114!16s%2Fg%2F11z80y9ty7';
        $gbpMapsEmbed =
            'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3076.721583400254!2d-119.82424082388114!3d39.543334371593346!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xa180e099e5f7d05b%3A0x5f23cef288df732e!2sSiler%20Chef%20LLC!5e0!3m2!1str!2str!4v1780082158534!5m2!1str!2str';
        $mapsHref = trim((string) ($content['site']['contact']['googleMapsHref'] ?? ''));
        if (
            $mapsHref === ''
            || preg_match('#/place/@|/place//@|maps\.google\.com/maps\?#i', $mapsHref)
            || str_contains($mapsHref, 'output=embed')
        ) {
            $content['site']['contact']['googleMapsHref'] = $gbpMapsHref;
        }
        $legacyStreetLocations = [
            'Reno, Nevada, USA',
            'Reno, Nevada',
            '1555 N Sierra St, Reno, NV 89503',
        ];
        if (in_array(trim((string) ($content['site']['contact']['location'] ?? '')), $legacyStreetLocations, true)) {
            $content['site']['contact']['location'] = 'Reno · Lake Tahoe · Truckee · Incline Village';
        }
        if (trim((string) ($content['site']['contact']['streetAddress'] ?? '')) === '1555 N Sierra St') {
            $content['site']['contact']['streetAddress'] = '';
            $content['site']['contact']['postalCode'] = '';
        }
        if (trim((string) ($content['site']['contact']['addressLocality'] ?? '')) === '') {
            $content['site']['contact']['addressLocality'] = 'Reno';
            $content['site']['contact']['addressRegion'] = 'NV';
        }
        $instagramHref = trim((string) ($content['site']['contact']['instagramHref'] ?? ''));
        if (
            $instagramHref === ''
            || preg_match('#instagram\.com/(silerchef)/?$#i', $instagramHref)
        ) {
            $content['site']['contact']['instagramHref'] = 'https://www.instagram.com/fikretsilerr';
        }
        $mapsEmbed = trim((string) ($content['site']['contact']['googleMapsEmbedSrc'] ?? ''));
        if (
            $mapsEmbed === ''
            || str_contains($mapsEmbed, 'maps.google.com/maps?q=')
            || str_contains($mapsEmbed, 'output=embed')
        ) {
            $content['site']['contact']['googleMapsEmbedSrc'] = $gbpMapsEmbed;
        }

        $occasionStat = (string) ($content['site']['stats']['occasionArchetypes'] ?? '');
        if ($occasionStat === '' || $occasionStat === '5') {
            $content['site']['stats']['occasionArchetypes'] = (string) count($content['serviceCards']);
        }

        $fallbackUrl = trim((string) ($content['site']['booking']['fallbackUrl'] ?? ''));
        $phoneHref = trim((string) ($content['site']['contact']['phoneHref'] ?? ''));
        $whatsAppUrl = trim((string) ($content['site']['contact']['whatsappHref'] ?? ''));
        if (
            $fallbackUrl === ''
            || str_contains($fallbackUrl, '/book-online')
            || str_contains($fallbackUrl, 'wa.me')
        ) {
            $content['site']['booking']['fallbackUrl'] = $phoneHref !== '' ? $phoneHref : '#contact';
        }
        if (trim((string) ($content['site']['booking']['notificationEmail'] ?? '')) === '') {
            $content['site']['booking']['notificationEmail'] = trim((string) ($content['site']['contact']['email'] ?? ''));
        }
        if (str_contains(trim((string) ($content['site']['booking']['teamWhatsAppHref'] ?? '')), 'wa.me')) {
            $content['site']['booking']['teamWhatsAppHref'] = '';
        }
        if (str_contains($whatsAppUrl, 'wa.me')) {
            $content['site']['contact']['whatsappHref'] = '';
        }
        $content['site']['booking']['notificationWebhookUrl'] = trim((string) ($content['site']['booking']['notificationWebhookUrl'] ?? ''));

        return $content;
    }

    private function uuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        return vsprintf(
            '%s%s-%s-%s-%s-%s%s%s',
            str_split(bin2hex($bytes), 4)
        );
    }
}
