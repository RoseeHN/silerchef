<?php

declare(strict_types=1);

require_once __DIR__ . '/app/Support.php';
require_once __DIR__ . '/app/Database.php';
require_once __DIR__ . '/app/Repository.php';
require_once __DIR__ . '/app/AdminAuth.php';

$database = new Database();
$repository = new Repository($database);
$repository->ensureReady();
$auth = new AdminAuth();

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$requestPath = rawurldecode(parse_url($requestUri, PHP_URL_PATH) ?: '/');
$requestMethod = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$embedDir = realpath(__DIR__ . '/embed');

header_remove('X-Powered-By');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Content-Security-Policy: ' . build_frame_ancestors_csp());

apply_cors();

if ($requestMethod === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($requestPath === '/health') {
    json_response(
        [
            'ok' => true,
            'service' => 'silerchef-php',
            'database' => $database->storageLabel(),
        ]
    );
}

if (str_starts_with($requestPath, '/api/')) {
    route_api($requestPath, $requestMethod, $repository, $auth);
}

redirect_legacy_embed_paths($requestPath, $requestUri, $requestMethod);
serve_embed_file($requestPath, $embedDir);

function route_api(string $path, string $method, Repository $repository, AdminAuth $auth): void
{
    if ($path === '/api/site-content' && $method === 'GET') {
        json_response($repository->getContent());
    }

    if ($path === '/api/availability' && $method === 'GET') {
        json_response($repository->getAvailability());
    }

    if ($path === '/api/booking' && $method === 'GET') {
        $content = $repository->getContent();
        $booking = $content['site']['booking'] ?? [];
        $cta = $content['site']['cta'] ?? [];
        json_response(
            [
                'url' => $booking['fallbackUrl'] ?? (($content['site']['contact']['whatsappHref'] ?? '') ?: '#contact'),
                'headline' => $cta['headline'] ?? ($booking['title'] ?? 'Reserve your date'),
                'summary' => $cta['summary'] ?? ($booking['lede'] ?? 'Tell us about your table and we will confirm from our reservation desk.'),
            ]
        );
    }

    if ($path === '/api/analytics/events' && $method === 'POST') {
        $repository->trackSiteEvent(json_input());
        json_response(['ok' => true]);
    }

    if ($path === '/api/reservations' && $method === 'POST') {
        $payload = json_input();
        $firstName = trim((string) ($payload['firstName'] ?? ''));
        $lastName = trim((string) ($payload['lastName'] ?? ''));
        $email = trim((string) ($payload['email'] ?? ''));
        if ($firstName === '' || $lastName === '' || $email === '' || !valid_email($email)) {
            json_response(['error' => 'validation', 'detail' => 'name_email_required'], 400);
        }

        $availability = $repository->getAvailability();
        $preferredDate = trim((string) ($payload['preferredDate'] ?? ''));
        foreach ($availability['blockedDates'] as $row) {
            if (($row['date'] ?? '') === $preferredDate) {
                json_response(
                    [
                        'error' => 'date_unavailable',
                        'detail' => !empty($row['label'])
                            ? 'This date is currently unavailable: ' . $row['label']
                            : 'This date is currently unavailable.',
                    ],
                    409
                );
            }
        }

        $reservation = $repository->createReservation(
            [
                'firstName' => $firstName,
                'lastName' => $lastName,
                'email' => $email,
                'phone' => trim((string) ($payload['phone'] ?? '')),
                'zipCode' => normalize_zip_code((string) ($payload['zipCode'] ?? '')),
                'preferredDate' => $preferredDate,
                'preferredTime' => trim((string) ($payload['preferredTime'] ?? '')),
                'preferredContact' => normalize_preferred_contact((string) ($payload['preferredContact'] ?? '')),
                'guestCount' => is_numeric($payload['guestCount'] ?? null) ? (int) $payload['guestCount'] : null,
                'notes' => trim((string) ($payload['notes'] ?? '')),
            ]
        );
        $alerts = $repository->dispatchReservationNotifications($reservation);

        json_response(
            [
                'ok' => true,
                'reservationId' => $reservation['id'],
                'status' => 'pending',
                'alerts' => $alerts,
            ]
        );
    }

    if ($path === '/api/admin/login' && $method === 'POST') {
        $payload = json_input();
        $username = trim((string) ($payload['username'] ?? ''));
        $password = trim((string) ($payload['password'] ?? ''));
        if (!$repository->validateAdminCredentials($username, $password)) {
            json_response(['error' => 'invalid_credentials'], 401);
        }

        $token = $auth->createToken($username);
        if ($token === null) {
            json_response(['error' => 'server_misconfigured', 'detail' => 'Set ADMIN_SECRET on Railway.'], 503);
        }

        json_response(['ok' => true, 'token' => $token, 'username' => $username]);
    }

    if ($path === '/api/admin/bootstrap' && $method === 'GET') {
        require_admin($auth);
        json_response(
            [
                'ok' => true,
                'content' => $repository->getContent(),
                'availability' => $repository->getAvailability(),
                'reservations' => $repository->listReservations(),
                'metrics' => $repository->analyticsSnapshot(current_request_context()),
            ]
        );
    }

    if ($path === '/api/admin/content' && $method === 'PUT') {
        require_admin($auth);
        $payload = json_input();
        if ($payload === []) {
            json_response(['error' => 'invalid_body'], 400);
        }
        json_response(['ok' => true, 'content' => $repository->saveContent($payload)]);
    }

    if ($path === '/api/admin/availability' && $method === 'PUT') {
        require_admin($auth);
        json_response(['ok' => true, 'availability' => $repository->saveAvailability(json_input())]);
    }

    if (preg_match('#^/api/admin/reservations/([^/]+)$#', $path, $matches) && $method === 'PATCH') {
        require_admin($auth);
        $id = trim((string) ($matches[1] ?? ''));
        if ($id === '') {
            json_response(['error' => 'missing_id'], 400);
        }
        $updated = $repository->updateReservation($id, json_input());
        if ($updated === null) {
            json_response(['error' => 'not_found'], 404);
        }
        json_response(['ok' => true, 'reservation' => $updated]);
    }

    json_response(['error' => 'not_found'], 404);
}

function require_admin(AdminAuth $auth): array
{
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = '';
    if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
        $token = trim((string) ($matches[1] ?? ''));
    }

    $session = $auth->verifyToken($token);
    if ($session === null) {
        json_response(['error' => 'unauthorized'], 401);
    }

    return $session;
}

function env_header(string $key): string
{
    return trim((string) ($_SERVER[$key] ?? ''));
}

function apply_cors(): void
{
    $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin === '') {
        return;
    }

    $allowed = (bool) preg_match('/^https:\/\/(www\.)?silerchef\.com$/i', $origin)
        || (bool) preg_match('/^https:\/\/[a-z0-9][a-z0-9-]*\.up\.railway\.app$/i', $origin);
    $allowed = $allowed
        || (bool) preg_match('/^http:\/\/localhost(?::\d+)?$/i', $origin)
        || (bool) preg_match('/^http:\/\/127\.0\.0\.1(?::\d+)?$/i', $origin);

    $extra = array_filter(
        array_map('trim', explode(',', env_string('ALLOWED_ORIGINS', '')))
    );
    if ($allowed || in_array($origin, $extra, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, OPTIONS');
    }
}

function build_frame_ancestors_csp(): string
{
    $parts = [
        "'self'",
        'https://silerchef.com',
        'https://www.silerchef.com',
        'https://*.up.railway.app',
    ];

    $extra = array_filter(array_map('trim', explode(',', env_string('FRAME_ANCESTORS_EXTRA', ''))));
    foreach ($extra as $origin) {
        $parts[] = $origin;
    }

    return 'frame-ancestors ' . implode(' ', $parts);
}

function current_request_context(): array
{
    $host = trim((string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? ''));
    $host = preg_replace('/:\d+$/', '', $host) ?: '';

    $scheme = trim((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));
    if ($scheme === '') {
        $https = $_SERVER['HTTPS'] ?? '';
        $scheme = (!empty($https) && strtolower((string) $https) !== 'off') ? 'https' : 'http';
    }

    return [
        'host' => strtolower($host),
        'scheme' => strtolower($scheme),
    ];
}

function redirect_legacy_embed_paths(string $requestPath, string $requestUri, string $requestMethod): void
{
    if (!in_array($requestMethod, ['GET', 'HEAD'], true)) {
        return;
    }

    $normalizedPath = match ($requestPath) {
        '/index.html', '/index', '/index/' => '/',
        '/admin.html', '/admin/' => '/admin',
        default => null,
    };

    if ($normalizedPath === null || $normalizedPath === $requestPath) {
        return;
    }

    $query = parse_url($requestUri, PHP_URL_QUERY);
    $location = $normalizedPath . ($query !== null && $query !== '' ? '?' . $query : '');
    header('Location: ' . $location, true, 301);
    exit;
}

function serve_embed_file(string $requestPath, string|false $embedDir): never
{
    if ($embedDir === false) {
        json_response(['error' => 'server_misconfigured', 'detail' => 'embed directory missing'], 500);
    }

    $path = $requestPath === '/' ? '/index.html' : $requestPath;
    if ($path === '/admin') {
        $path = '/admin.html';
    }

    $candidate = realpath($embedDir . $path);
    if ($candidate === false || !str_starts_with($candidate, $embedDir) || !is_file($candidate)) {
        if ($requestPath === '/' || $requestPath === '') {
            $candidate = realpath($embedDir . '/index.html');
        }
    }

    if ($candidate === false || !is_file($candidate)) {
        json_response(['error' => 'not_found'], 404);
    }

    $mime = detect_mime_type($candidate);
    if (str_ends_with($candidate, '/admin.html')) {
        header('X-Robots-Tag: noindex, nofollow');
    }
    if (preg_match('/\.(css|js|png|jpg|jpeg|svg|webp|gif|xml|txt|html)$/i', $candidate)) {
        header('Cache-Control: public, max-age=' . (str_ends_with($candidate, '.html') ? '0, must-revalidate' : '3600'));
    }

    http_response_code(200);
    header('Content-Type: ' . $mime);
    readfile($candidate);
    exit;
}

function detect_mime_type(string $filePath): string
{
    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    $map = [
        'css' => 'text/css; charset=utf-8',
        'js' => 'application/javascript; charset=utf-8',
        'json' => 'application/json; charset=utf-8',
        'html' => 'text/html; charset=utf-8',
        'xml' => 'application/xml; charset=utf-8',
        'txt' => 'text/plain; charset=utf-8',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
    ];

    return $map[$ext] ?? (mime_content_type($filePath) ?: 'application/octet-stream');
}
