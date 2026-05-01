<?php

declare(strict_types=1);

require_once __DIR__ . '/Support.php';

final class AdminAuth
{
    private string $secret;

    public function __construct()
    {
        $this->secret = env_string('ADMIN_SECRET', '');
    }

    public function hasSecret(): bool
    {
        return $this->secret !== '';
    }

    public function createToken(string $username): ?string
    {
        if (!$this->hasSecret()) {
            return null;
        }

        $payload = json_encode(
            [
                'u' => $username,
                'exp' => (int) round(microtime(true) * 1000) + (7 * 24 * 60 * 60 * 1000),
            ],
            JSON_UNESCAPED_SLASHES
        );
        if ($payload === false) {
            return null;
        }

        $encoded = base64url_encode_php($payload);
        $signature = hash_hmac('sha256', $encoded, $this->secret, true);
        return $encoded . '.' . base64url_encode_php($signature);
    }

    public function verifyToken(string $token): ?array
    {
        if (!$this->hasSecret() || $token === '') {
            return null;
        }

        $parts = explode('.', $token);
        if (count($parts) !== 2) {
            return null;
        }

        [$encoded, $sig] = $parts;
        $expected = base64url_encode_php(hash_hmac('sha256', $encoded, $this->secret, true));
        if (!hash_equals($expected, $sig)) {
            return null;
        }

        $decoded = base64url_decode_php($encoded);
        if ($decoded === false) {
            return null;
        }

        $payload = json_decode($decoded, true);
        if (!is_array($payload) || empty($payload['u']) || empty($payload['exp'])) {
            return null;
        }

        if ((int) $payload['exp'] < (int) round(microtime(true) * 1000)) {
            return null;
        }

        return $payload;
    }
}
