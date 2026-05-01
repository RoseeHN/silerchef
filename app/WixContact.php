<?php

declare(strict_types=1);

final class WixContact
{
    private const CONTACTS_URL = 'https://www.wixapis.com/contacts/v4/contacts';

    public static function buildReservationNote(array $payload): string
    {
        $lines = [
            'Siler Chef — website reservation request',
            'Preferred date: ' . ($payload['preferredDate'] !== '' ? $payload['preferredDate'] : '—'),
            'Preferred time: ' . ($payload['preferredTime'] !== '' ? $payload['preferredTime'] : '—'),
            'Guests: ' . ($payload['guestCount'] !== null ? (string) $payload['guestCount'] : '—'),
        ];

        if ($payload['notes'] !== '') {
            $lines[] = 'Notes: ' . $payload['notes'];
        }

        return implode("\n", $lines);
    }

    public static function createFromReservation(array $raw): array
    {
        $apiKey = env_string('WIX_API_KEY', '');
        $siteId = env_string('WIX_META_SITE_ID', '');
        if ($apiKey === '' || $siteId === '') {
            return ['ok' => false, 'code' => 'missing_wix_config'];
        }

        $payload = [
            'firstName' => mb_substr(trim((string) ($raw['firstName'] ?? '')), 0, 80),
            'lastName' => mb_substr(trim((string) ($raw['lastName'] ?? '')), 0, 80),
            'email' => mb_substr(trim((string) ($raw['email'] ?? '')), 0, 320),
            'phone' => mb_substr(trim((string) ($raw['phone'] ?? '')), 0, 40),
            'preferredDate' => mb_substr(trim((string) ($raw['preferredDate'] ?? '')), 0, 32),
            'preferredTime' => mb_substr(trim((string) ($raw['preferredTime'] ?? '')), 0, 16),
            'guestCount' => is_numeric($raw['guestCount'] ?? null)
                ? max(1, min(999, (int) $raw['guestCount']))
                : null,
            'notes' => mb_substr(trim((string) ($raw['notes'] ?? '')), 0, 2000),
        ];

        $note = self::buildReservationNote($payload);
        $company = mb_strlen($note) > 1800 ? mb_substr($note, 0, 1770) . '…' : $note;

        $body = [
            'allowDuplicates' => true,
            'info' => [
                'name' => [
                    'first' => $payload['firstName'],
                    'last' => $payload['lastName'],
                ],
                'emails' => [
                    'items' => [
                        [
                            'tag' => 'MAIN',
                            'email' => $payload['email'],
                            'primary' => true,
                        ],
                    ],
                ],
                'jobTitle' => 'Private chef — reservation (embed)',
                'company' => $company,
                'locale' => 'en-US',
            ],
        ];

        if ($payload['phone'] !== '') {
            $body['info']['phones'] = [
                'items' => [
                    [
                        'tag' => 'MOBILE',
                        'countryCode' => 'US',
                        'phone' => $payload['phone'],
                        'primary' => true,
                    ],
                ],
            ];
        }

        $ch = curl_init(self::CONTACTS_URL);
        if ($ch === false) {
            return ['ok' => false, 'code' => 'curl_init_failed'];
        }

        curl_setopt_array(
            $ch,
            [
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Authorization: ' . $apiKey,
                    'wix-site-id: ' . $siteId,
                ],
                CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                CURLOPT_TIMEOUT => 20,
            ]
        );

        $response = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            return ['ok' => false, 'code' => 'wix_transport_error', 'detail' => $error !== '' ? $error : 'curl_failed'];
        }

        if ($status < 200 || $status >= 300) {
            return [
                'ok' => false,
                'code' => 'wix_rejected',
                'status' => $status,
                'detail' => mb_substr($response, 0, 800),
            ];
        }

        $decoded = json_decode($response, true);
        return [
            'ok' => true,
            'contactId' => $decoded['contact']['id'] ?? null,
        ];
    }
}
