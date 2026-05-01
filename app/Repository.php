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

    private function normalizeContent(array $content): array
    {
        if (!isset($content['availability']) || !is_array($content['availability'])) {
            $content['availability'] = ['note' => '', 'blockedDates' => []];
        }
        $content['availability'] = normalize_availability($content['availability']);

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
