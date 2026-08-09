<?php

declare(strict_types=1);

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$requestPath = rawurldecode(parse_url($requestUri, PHP_URL_PATH) ?: '/');
$requestMethod = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$embedDir = realpath(__DIR__ . '/embed');

/**
 * Serve /llms.txt before any app bootstrap.
 * PageSpeed Agentic Browsing times out when this waits on Blog/DB includes.
 */
if (in_array($requestMethod, ['GET', 'HEAD'], true) && $requestPath === '/llms.txt') {
    $llms = ($embedDir !== false ? $embedDir : (__DIR__ . '/embed')) . '/llms.txt';
    if (!is_file($llms)) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo "not found\n";
        exit;
    }
    http_response_code(200);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: public, max-age=86400');
    header('X-Content-Type-Options: nosniff');
    if ($requestMethod === 'HEAD') {
        header('Content-Length: ' . (string) filesize($llms));
        exit;
    }
    readfile($llms);
    exit;
}

require_once __DIR__ . '/app/Support.php';
require_once __DIR__ . '/app/Blog.php';

/** Prefer www for SEO (single canonical host). Only applies when traffic reaches this app. */
if (in_array($requestMethod, ['GET', 'HEAD'], true)) {
    $host = strtolower(preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));
    if ($host === 'silerchef.com') {
        $query = parse_url($requestUri, PHP_URL_QUERY);
        $location = 'https://www.silerchef.com' . $requestPath . ($query !== null && $query !== '' ? '?' . $query : '');
        header('Location: ' . $location, true, 301);
        exit;
    }
}

header_remove('X-Powered-By');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Content-Security-Policy: ' . build_frame_ancestors_csp());

apply_cors();

if ($requestMethod === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * Serve crawler discovery files before DB bootstrap.
 * PageSpeed / Googlebot sometimes time out when every robots/sitemap hit waits on Postgres.
 */
if (in_array($requestMethod, ['GET', 'HEAD'], true)) {
    if ($requestPath === '/robots.txt') {
        Blog::renderRobotsTxt();
    }
    if ($requestPath === '/sitemap.xml') {
        Blog::renderSitemap();
    }
    serve_google_verification_file($requestPath);
    redirect_seo_landing_paths($requestPath, $requestUri, $requestMethod);
}

require_once __DIR__ . '/app/Database.php';
require_once __DIR__ . '/app/Repository.php';
require_once __DIR__ . '/app/AdminAuth.php';

$database = new Database();
$repository = new Repository($database);
$repository->ensureReady();
$auth = new AdminAuth();

if ($requestPath === '/health') {
    $build = [
        'commit' => trim((string) (getenv('RAILWAY_GIT_COMMIT_SHA') ?: '')),
        'branch' => trim((string) (getenv('RAILWAY_GIT_BRANCH') ?: '')),
        'deployId' => trim((string) (getenv('RAILWAY_DEPLOYMENT_ID') ?: '')),
    ];
    $build = array_filter($build, static fn (string $v): bool => $v !== '');

    json_response(
        [
            'ok' => true,
            'service' => 'silerchef-php',
            'database' => $database->storageLabel(),
            'features' => [
                'blog' => class_exists('Blog', false),
                'dynamicSitemap' => class_exists('Blog', false),
            ],
            'seo' => [
                'canonicalOrigin' => 'https://www.silerchef.com',
                'sitemap' => 'https://www.silerchef.com/sitemap.xml',
                'robots' => 'https://www.silerchef.com/robots.txt',
                'googleSiteVerificationEnv' => trim(env_string('GOOGLE_SITE_VERIFICATION', '')) !== '',
            ],
            'build' => $build !== [] ? $build : null,
        ]
    );
}

if (str_starts_with($requestPath, '/api/')) {
    route_api($requestPath, $requestMethod, $repository, $auth);
}

serve_blog_routes($requestPath);

redirect_legacy_embed_paths($requestPath, $requestUri, $requestMethod);
serve_embed_file($requestPath, $embedDir, $requestMethod);

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
                'url' => $booking['fallbackUrl'] ?? (($content['site']['contact']['phoneHref'] ?? '') ?: '#contact'),
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
        $phone = trim((string) ($payload['phone'] ?? ''));
        $eventLocation = trim((string) ($payload['eventLocation'] ?? ''));
        $preferredDate = trim((string) ($payload['preferredDate'] ?? ''));
        $preferredTime = trim((string) ($payload['preferredTime'] ?? ''));
        $cuisinePreference = trim((string) ($payload['cuisinePreference'] ?? ''));
        $guestCount = is_numeric($payload['guestCount'] ?? null) ? (int) $payload['guestCount'] : null;
        if ($firstName === '' || $lastName === '' || $phone === '') {
            json_response(['error' => 'validation', 'detail' => 'Please add your first name, last name, and phone number.'], 400);
        }
        if ($email !== '' && !valid_email($email)) {
            json_response(['error' => 'validation', 'detail' => 'Please enter a valid email address or leave the email field blank.'], 400);
        }
        if ($eventLocation === '' || $preferredDate === '' || $cuisinePreference === '' || $guestCount === null || $guestCount < 1) {
            json_response(['error' => 'validation', 'detail' => 'Please add the event location, date, guest count, and preferred cuisine.'], 400);
        }
        $pacific = new DateTimeZone('America/Los_Angeles');
        $minDate = (new DateTimeImmutable('today', $pacific))->modify('+3 days')->format('Y-m-d');
        if ($preferredDate < $minDate) {
            json_response(['error' => 'validation', 'detail' => 'Please choose a date at least 3 days from today.'], 400);
        }

        $availability = $repository->getAvailability();
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
                'phone' => $phone,
                'eventLocation' => $eventLocation,
                'zipCode' => normalize_zip_code((string) ($payload['zipCode'] ?? '')),
                'preferredDate' => $preferredDate,
                'preferredTime' => $preferredTime,
                'preferredContact' => normalize_preferred_contact((string) ($payload['preferredContact'] ?? '')),
                'guestCount' => $guestCount,
                'cuisinePreference' => $cuisinePreference,
                'allergyNotes' => trim((string) ($payload['allergyNotes'] ?? '')),
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

    if (preg_match('#^/api/admin/reservations/([^/]+)\z#', $path, $matches) && $method === 'PATCH') {
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

    if (preg_match('#^/api/admin/reservations/([^/]+)\z#', $path, $matches) && $method === 'DELETE') {
        require_admin($auth);
        $id = trim((string) ($matches[1] ?? ''));
        if ($id === '') {
            json_response(['error' => 'missing_id'], 400);
        }
        $deleted = $repository->deleteReservation($id);
        if (!$deleted) {
            json_response(['error' => 'not_found'], 404);
        }
        json_response(['ok' => true, 'deletedId' => $id]);
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

function serve_google_verification_file(string $requestPath): void
{
    if (!preg_match('#^/google[0-9a-f]+\.html$#', $requestPath)) {
        return;
    }

    $safeName = basename($requestPath);
    $file = __DIR__ . '/embed/verification/' . $safeName;
    if (!is_file($file)) {
        return;
    }

    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=300');
    readfile($file);
    exit;
}

function serve_llms_txt(string|false $embedDir): never
{
    $llms = ($embedDir !== false ? $embedDir : (__DIR__ . '/embed')) . '/llms.txt';
    if (!is_file($llms)) {
        json_response(['error' => 'not_found'], 404);
    }
    http_response_code(200);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: public, max-age=3600');
    $body = (string) file_get_contents($llms);
    if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'HEAD') {
        header('Content-Length: ' . (string) strlen($body));
        exit;
    }
    respond_possibly_gzipped($body, 'text/plain; charset=utf-8');
}

/** Permanent SEO-friendly URLs → Journal articles or homepage. */
function redirect_seo_landing_paths(string $requestPath, string $requestUri, string $requestMethod): void
{
    if (!in_array($requestMethod, ['GET', 'HEAD'], true)) {
        return;
    }

    $target = match ($requestPath) {
        '/private-chef-reno', '/personal-chef-reno', '/reno-private-chef' => '/blog/private-chef-reno-guide',
        '/private-chef-tahoe', '/lake-tahoe-private-chef', '/tahoe-private-chef' => '/blog/lake-tahoe-private-dining',
        '/private-chef-bay-area', '/bay-area-private-chef', '/personal-chef-bay-area' => '/blog/bay-area-in-home-chef',
        '/hire-private-chef', '/how-to-hire-a-private-chef' => '/blog/how-to-hire-private-chef',
        '/private-chef-vs-catering', '/chef-vs-catering' => '/blog/private-chef-vs-catering',
        '/private-chef-cost', '/private-chef-pricing' => '/blog/private-chef-cost-factors',
        '/anniversary-private-chef', '/anniversary-dinner-chef' => '/blog/anniversary-dinner-private-chef',
        '/birthday-private-chef', '/birthday-party-chef' => '/blog/birthday-party-private-chef',
        '/corporate-private-chef', '/corporate-dinner-chef' => '/blog/corporate-dinner-chef-home',
        '/french-private-chef', '/french-private-dinner' => '/blog/french-cuisine-private-dinner',
        '/italian-private-chef', '/italian-private-dinner' => '/blog/italian-private-chef-menu',
        '/turkish-private-chef' => '/blog/turkish-cuisine-private-chef',
        '/greek-private-chef', '/mediterranean-private-chef' => '/blog/greek-mediterranean-dinner-party',
        '/holiday-private-chef' => '/blog/holiday-private-chef-dinner',
        '/private-chef', '/personal-chef' => '/',
        '/silerchef' => '/',
        default => null,
    };

    if ($target === null) {
        return;
    }

    $query = parse_url($requestUri, PHP_URL_QUERY);
    $location = $target . ($query !== null && $query !== '' ? '?' . $query : '');
    header('Location: ' . $location, true, 301);
    exit;
}

function redirect_legacy_embed_paths(string $requestPath, string $requestUri, string $requestMethod): void
{
    if (!in_array($requestMethod, ['GET', 'HEAD'], true)) {
        return;
    }

    $normalizedPath = match ($requestPath) {
        '/index.html', '/index', '/index/' => '/',
        '/admin.html', '/admin/' => '/admin',
        '/gallery.html', '/gallery/' => '/gallery',
        '/blog.html', '/blog/' => '/blog',
        '/blogs', '/blogs/' => '/blog',
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

function serve_embed_file(string $requestPath, string|false $embedDir, string $requestMethod = 'GET'): never
{
    if ($embedDir === false) {
        json_response(['error' => 'server_misconfigured', 'detail' => 'embed directory missing'], 500);
    }

    if ($requestPath === '/robots.txt') {
        Blog::renderRobotsTxt();
    }

    /** Never serve stale static sitemap.xml — dynamic list includes /blog and all articles. */
    if ($requestPath === '/sitemap.xml') {
        Blog::renderSitemap();
    }

    $path = $requestPath === '/' ? '/index.html' : $requestPath;
    if ($path === '/admin') {
        $path = '/admin.html';
    } elseif ($path === '/gallery') {
        $path = '/gallery.html';
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
    if (preg_match('/\.html$/i', $candidate)) {
        header('Cache-Control: public, max-age=0, must-revalidate');
    } elseif (preg_match('/\.(css|js)$/i', $candidate)) {
        // Fingerprinted via ?v= query in HTML — long cache is safe for repeat visits.
        header('Cache-Control: public, max-age=31536000, immutable');
    } elseif (preg_match('/\.(png|jpg|jpeg|svg|webp|gif|mp4|webm|mov|woff2?|xml|txt)$/i', $candidate)) {
        header('Cache-Control: public, max-age=31536000, immutable');
    }

    $method = strtoupper($requestMethod);

    if ($method === 'HEAD') {
        http_response_code(200);
        header('Content-Type: ' . $mime);
        if (str_ends_with($candidate, '/index.html')) {
            $bodyLen = strlen(inject_google_site_verification((string) file_get_contents($candidate)));
            header('Content-Length: ' . $bodyLen);
        } else {
            header('Content-Length: ' . (string) filesize($candidate));
            if (embed_media_supports_range_requests($candidate)) {
                header('Accept-Ranges: bytes');
            }
        }
        exit;
    }

    if (str_ends_with($candidate, '/index.html')) {
        http_response_code(200);
        header('Content-Type: ' . $mime);
        header('Link: <https://www.silerchef.com/sitemap.xml>; rel="sitemap"', false);
        respond_possibly_gzipped(inject_google_site_verification((string) file_get_contents($candidate)), $mime);
    }

    if (embed_media_supports_range_requests($candidate)) {
        serve_embed_binary_with_ranges($candidate, $mime);
    }

    http_response_code(200);
    header('Content-Type: ' . $mime);
    if (preg_match('/\.(css|js|svg|xml|txt|json)$/i', $candidate)) {
        respond_possibly_gzipped((string) file_get_contents($candidate), $mime);
    }
    readfile($candidate);
    exit;
}

/** Gzip text responses when the client accepts it (PageSpeed text-compression). */
function respond_possibly_gzipped(string $body, string $mime): never
{
    $accept = (string) ($_SERVER['HTTP_ACCEPT_ENCODING'] ?? '');
    if (
        function_exists('gzencode')
        && $body !== ''
        && stripos($accept, 'gzip') !== false
        && preg_match('#^(text/|application/(javascript|json|xml)|image/svg\+xml)#i', $mime)
    ) {
        $gz = gzencode($body, 6);
        if ($gz !== false && strlen($gz) < strlen($body)) {
            header('Content-Encoding: gzip');
            header('Vary: Accept-Encoding');
            header('Content-Length: ' . (string) strlen($gz));
            echo $gz;
            exit;
        }
    }
    header('Content-Length: ' . (string) strlen($body));
    echo $body;
    exit;
}

function embed_media_supports_range_requests(string $candidate): bool
{
    $ext = strtolower(pathinfo($candidate, PATHINFO_EXTENSION));

    return in_array($ext, ['mp4', 'webm', 'mov', 'ogv', 'ogg', 'mp3', 'm4a', 'wav'], true);
}

/**
 * HTML5 video/audio usually sends Range requests; plain 200 + full body fails on many browsers without 206 support.
 */
function serve_embed_binary_with_ranges(string $candidate, string $mime): never
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    $size = filesize($candidate);
    if ($size === false) {
        json_response(['error' => 'not_found'], 404);
    }

    header('Accept-Ranges: bytes');

    $rangeHeader = isset($_SERVER['HTTP_RANGE']) ? trim((string) $_SERVER['HTTP_RANGE']) : '';

    if ($rangeHeader !== '' && preg_match('/^bytes=/i', $rangeHeader)) {
        $firstRange = trim(explode(',', $rangeHeader, 2)[0]);
        $rangeSpec = substr($firstRange, 6);

        if (preg_match('/^(\d*)-(\d*)$/', $rangeSpec, $m)) {
            $startStr = $m[1];
            $endStr = $m[2];
            $start = 0;
            $end = $size - 1;

            if ($startStr !== '' && $endStr !== '') {
                $start = (int) $startStr;
                $end = (int) $endStr;
            } elseif ($startStr !== '' && $endStr === '') {
                $start = (int) $startStr;
                $end = $size - 1;
            } elseif ($startStr === '' && $endStr !== '') {
                $suffix = (int) $endStr;
                if ($suffix <= 0) {
                    http_response_code(416);
                    header('Content-Range: bytes */' . $size);
                    exit;
                }
                $start = max(0, $size - $suffix);
                $end = $size - 1;
            }

            if ($start >= $size || $start > $end) {
                http_response_code(416);
                header('Content-Range: bytes */' . $size);
                exit;
            }

            $end = min($end, $size - 1);
            $length = $end - $start + 1;

            http_response_code(206);
            header('Content-Type: ' . $mime);
            header('Content-Length: ' . $length);
            header(sprintf('Content-Range: bytes %d-%d/%d', $start, $end, $size));

            $fp = fopen($candidate, 'rb');
            if ($fp === false) {
                http_response_code(500);
                exit;
            }
            if ($start > 0 && fseek($fp, $start) !== 0) {
                fclose($fp);
                http_response_code(500);
                exit;
            }
            $remaining = $length;
            while ($remaining > 0) {
                $chunk = fread($fp, min(65536, $remaining));
                if ($chunk === false || $chunk === '') {
                    break;
                }
                echo $chunk;
                $remaining -= strlen($chunk);
            }
            fclose($fp);
            exit;
        }
    }

    header('Content-Type: ' . $mime);
    header('Content-Length: ' . $size);
    http_response_code(200);
    readfile($candidate);
    exit;
}

function inject_google_site_verification(string $html): string
{
    $token = trim(env_string('GOOGLE_SITE_VERIFICATION', ''));
    if ($token === '' || !str_contains($html, '</head>')) {
        return $html;
    }

    $meta = '    <meta name="google-site-verification" content="' . htmlspecialchars($token, ENT_QUOTES, 'UTF-8') . "\" />\n";
    return str_replace('</head>', $meta . '  </head>', $html);
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
        'mov' => 'video/quicktime',
        'webm' => 'video/webm',
        'mp4' => 'video/mp4',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
    ];

    return $map[$ext] ?? (mime_content_type($filePath) ?: 'application/octet-stream');
}
