<?php

declare(strict_types=1);

require_once __DIR__ . '/Support.php';

final class Database
{
    private \PDO $pdo;
    private string $driver;
    private string $storageLabel;

    public function __construct()
    {
        $dataDir = env_string('DATA_DIR', dirname(__DIR__) . '/.runtime-data');
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0775, true);
        }

        $databaseUrl = env_string('DATABASE_URL', '');
        if ($databaseUrl !== '') {
            $parts = parse_url($databaseUrl);
            if (!is_array($parts)) {
                throw new RuntimeException('Invalid DATABASE_URL');
            }

            $scheme = strtolower((string) ($parts['scheme'] ?? ''));
            if (!in_array($scheme, ['postgres', 'postgresql', 'pgsql'], true)) {
                throw new RuntimeException('Unsupported DATABASE_URL scheme');
            }

            $host = (string) ($parts['host'] ?? '127.0.0.1');
            $port = (int) ($parts['port'] ?? 5432);
            $path = ltrim((string) ($parts['path'] ?? ''), '/');
            $user = rawurldecode((string) ($parts['user'] ?? ''));
            $pass = rawurldecode((string) ($parts['pass'] ?? ''));
            $query = [];
            if (!empty($parts['query'])) {
                parse_str((string) $parts['query'], $query);
            }
            $sslMode = (string) ($query['sslmode'] ?? env_string('PGSSLMODE', 'require'));
            $dsn = sprintf(
                'pgsql:host=%s;port=%d;dbname=%s;sslmode=%s',
                $host,
                $port,
                $path,
                $sslMode !== '' ? $sslMode : 'require'
            );
            $this->pdo = new PDO(
                $dsn,
                $user,
                $pass,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]
            );
            $this->driver = 'pgsql';
            $this->storageLabel = sprintf('postgres://%s:%d/%s', $host, $port, $path);
            return;
        }

        $sqliteFile = $dataDir . '/silerchef.sqlite';
        $this->pdo = new PDO(
            'sqlite:' . $sqliteFile,
            null,
            null,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
        $this->driver = 'sqlite';
        $this->storageLabel = $sqliteFile;
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }

    public function driver(): string
    {
        return $this->driver;
    }

    public function storageLabel(): string
    {
        return $this->storageLabel;
    }
}
