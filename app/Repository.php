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
                id, first_name, last_name, email, phone, preferred_date, preferred_time, guest_count, notes,
                status, admin_note, wix_sync_ok, wix_contact_id, wix_sync_error, created_at, updated_at
            ) VALUES (
                :id, :first_name, :last_name, :email, :phone, :preferred_date, :preferred_time, :guest_count, :notes,
                :status, :admin_note, :wix_sync_ok, :wix_contact_id, :wix_sync_error, :created_at, :updated_at
            )'
        );
        $stmt->execute(
            [
                ':id' => $id,
                ':first_name' => $payload['firstName'],
                ':last_name' => $payload['lastName'],
                ':email' => $payload['email'],
                ':phone' => $payload['phone'] ?? '',
                ':preferred_date' => $payload['preferredDate'] ?? '',
                ':preferred_time' => $payload['preferredTime'] ?? '',
                ':guest_count' => $payload['guestCount'],
                ':notes' => $payload['notes'] ?? '',
                ':status' => 'pending',
                ':admin_note' => '',
                ':wix_sync_ok' => 0,
                ':wix_contact_id' => null,
                ':wix_sync_error' => null,
                ':created_at' => $createdAt,
                ':updated_at' => null,
            ]
        );

        return $this->findReservation($id) ?? [];
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
                preferred_date TEXT NOT NULL,
                preferred_time TEXT NOT NULL,
                guest_count INTEGER NULL,
                notes TEXT NOT NULL,
                status TEXT NOT NULL,
                admin_note TEXT NOT NULL,
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
                    id, first_name, last_name, email, phone, preferred_date, preferred_time, guest_count, notes,
                    status, admin_note, wix_sync_ok, wix_contact_id, wix_sync_error, created_at, updated_at
                ) VALUES (
                    :id, :first_name, :last_name, :email, :phone, :preferred_date, :preferred_time, :guest_count, :notes,
                    :status, :admin_note, :wix_sync_ok, :wix_contact_id, :wix_sync_error, :created_at, :updated_at
                )'
            );
            $stmt->execute(
                [
                    ':id' => (string) $reservation['id'],
                    ':first_name' => (string) ($reservation['customer']['firstName'] ?? ''),
                    ':last_name' => (string) ($reservation['customer']['lastName'] ?? ''),
                    ':email' => (string) ($reservation['customer']['email'] ?? ''),
                    ':phone' => (string) ($reservation['customer']['phone'] ?? ''),
                    ':preferred_date' => (string) ($reservation['request']['preferredDate'] ?? ''),
                    ':preferred_time' => (string) ($reservation['request']['preferredTime'] ?? ''),
                    ':guest_count' => $reservation['request']['guestCount'] ?? null,
                    ':notes' => (string) ($reservation['request']['notes'] ?? ''),
                    ':status' => normalize_reservation_status((string) ($reservation['status'] ?? 'pending')),
                    ':admin_note' => (string) ($reservation['adminNote'] ?? ''),
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
                'preferredDate' => (string) $row['preferred_date'],
                'preferredTime' => (string) $row['preferred_time'],
                'guestCount' => $row['guest_count'] !== null ? (int) $row['guest_count'] : null,
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

        $legacyHeroHeadline = 'Global Flavors, Happy Tables, Unforgettable Moments';
        $legacyHeroTagline = 'Reno · Private dining · Bespoke menus';
        $legacyHeroLede = 'Exquisite world cuisines in the comfort of your home - Chef Siler curates and shapes each experience for your table.';
        $hero = isset($content['site']['hero']) && is_array($content['site']['hero'])
            ? $content['site']['hero']
            : [];
        if (($hero['headline'] ?? '') === $legacyHeroHeadline) {
            $content['site']['hero']['headline'] = 'Private Chef Dining That Feels Like the Best Table in the City';
        }
        if (($hero['tagline'] ?? '') === $legacyHeroTagline) {
            $content['site']['hero']['tagline'] = 'Reno · Tahoe · Bay Area · Luxury in-home experiences';
        }
        if (($hero['lede'] ?? '') === $legacyHeroLede) {
            $content['site']['hero']['lede'] =
                'For hosts who want more than dinner, Siler Chef designs globally inspired menus, refined plating, and an effortless service flow that turns home entertaining into a true occasion.';
        }

        $fallbackUrl = trim((string) ($content['site']['booking']['fallbackUrl'] ?? ''));
        $whatsAppUrl = trim((string) ($content['site']['contact']['whatsappHref'] ?? ''));
        if ($fallbackUrl === '' || str_contains($fallbackUrl, '/book-online')) {
            $content['site']['booking']['fallbackUrl'] = $whatsAppUrl !== '' ? $whatsAppUrl : '#contact';
        }

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
