<?php

declare(strict_types=1);

function env_string(string $key, string $default = ''): string
{
    $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
    if ($value === false || $value === null) {
        return $default;
    }

    return trim((string) $value);
}

function json_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function text_response(string $body, string $contentType, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: ' . $contentType);
    echo $body;
    exit;
}

function base64url_encode_php(string $input): string
{
    return rtrim(strtr(base64_encode($input), '+/', '-_'), '=');
}

function base64url_decode_php(string $input): string|false
{
    $remainder = strlen($input) % 4;
    if ($remainder !== 0) {
        $input .= str_repeat('=', 4 - $remainder);
    }

    return base64_decode(strtr($input, '-_', '+/'), true);
}

function deep_merge(array $base, array $override): array
{
    $out = $base;
    foreach ($override as $key => $value) {
        if (is_array($value) && array_is_list($value)) {
            $out[$key] = $value;
            continue;
        }

        if (
            is_array($value) &&
            isset($out[$key]) &&
            is_array($out[$key]) &&
            !array_is_list($value) &&
            !array_is_list($out[$key])
        ) {
            $out[$key] = deep_merge($out[$key], $value);
            continue;
        }

        $out[$key] = $value;
    }

    return $out;
}

function normalize_blocked_dates(mixed $rawDates): array
{
    $out = [];
    $seen = [];
    $rows = is_array($rawDates) ? $rawDates : [];
    foreach ($rows as $row) {
        $date = is_string($row) ? trim($row) : trim((string) ($row['date'] ?? ''));
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || isset($seen[$date])) {
            continue;
        }

        $label = is_string($row) ? '' : mb_substr(trim((string) ($row['label'] ?? '')), 0, 160);
        $seen[$date] = true;
        $out[] = [
            'date' => $date,
            'label' => $label,
        ];
    }

    usort(
        $out,
        static fn (array $a, array $b): int => strcmp($a['date'], $b['date'])
    );

    return $out;
}

function normalize_availability(mixed $raw): array
{
    return [
        'note' => mb_substr(trim((string) (($raw['note'] ?? ''))), 0, 500),
        'blockedDates' => normalize_blocked_dates($raw['blockedDates'] ?? []),
    ];
}

function normalize_reservation_status(string $status): string
{
    $allowed = [
        'pending' => true,
        'confirmed' => true,
        'completed' => true,
        'cancelled' => true,
        'blocked' => true,
    ];

    return isset($allowed[$status]) ? $status : 'pending';
}

function valid_email(string $email): bool
{
    return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

function normalize_zip_code(string $zipCode): string
{
    $value = strtoupper(trim($zipCode));
    $value = preg_replace('/[^A-Z0-9 -]/', '', $value) ?? '';
    return mb_substr(trim($value), 0, 20);
}

function normalize_preferred_contact(string $preferredContact): string
{
    $value = strtolower(trim($preferredContact));
    $allowed = [
        'any' => true,
        'phone' => true,
        'email' => true,
        'whatsapp' => true,
        'text' => true,
    ];

    return isset($allowed[$value]) ? $value : 'any';
}
