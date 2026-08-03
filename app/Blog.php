<?php

declare(strict_types=1);

final class Blog
{
    private const SITE_ORIGIN = 'https://www.silerchef.com';
    private const ASSET_VERSION = 'sc-20260803t7';

    /** @var list<array<string, mixed>>|null */
    private static ?array $posts = null;

    public static function assetVersion(): string
    {
        return self::ASSET_VERSION;
    }

    public static function siteOrigin(): string
    {
        return self::SITE_ORIGIN;
    }

    /** @return list<array<string, mixed>> */
    public static function posts(): array
    {
        if (self::$posts !== null) {
            return self::$posts;
        }

        $path = dirname(__DIR__) . '/embed/data/blog-posts.json';
        if (!is_file($path)) {
            self::$posts = [];

            return self::$posts;
        }

        $raw = file_get_contents($path);
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        $rows = is_array($decoded['posts'] ?? null) ? $decoded['posts'] : [];
        $out = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $slug = trim((string) ($row['slug'] ?? ''));
            $title = trim((string) ($row['title'] ?? ''));
            if ($slug === '' || $title === '') {
                continue;
            }
            $out[] = [
                'slug' => $slug,
                'title' => $title,
                'description' => trim((string) ($row['description'] ?? '')),
                'published' => trim((string) ($row['published'] ?? '')),
                'updated' => trim((string) ($row['updated'] ?? $row['published'] ?? '')),
                'image' => trim((string) ($row['image'] ?? 'images/homepage/hero-01.jpg')),
                'imageAlt' => trim((string) ($row['imageAlt'] ?? '')),
                'tags' => is_array($row['tags'] ?? null) ? array_values(array_filter($row['tags'], 'is_string')) : [],
                'bodyHtml' => (string) ($row['bodyHtml'] ?? ''),
            ];
        }

        usort(
            $out,
            static fn (array $a, array $b): int => strcmp((string) ($b['published'] ?? ''), (string) ($a['published'] ?? ''))
        );

        self::$posts = $out;

        return self::$posts;
    }

    public static function findBySlug(string $slug): ?array
    {
        foreach (self::posts() as $post) {
            if ($post['slug'] === $slug) {
                return $post;
            }
        }

        return null;
    }

    /**
     * Related journal posts for internal linking (shared tags first, then recency).
     *
     * @param array<string, mixed> $post
     * @return list<array<string, mixed>>
     */
    public static function relatedPosts(array $post, int $limit = 3): array
    {
        $slug = (string) ($post['slug'] ?? '');
        $tags = array_map('strval', is_array($post['tags'] ?? null) ? $post['tags'] : []);
        $tagSet = array_fill_keys(array_map('strtolower', $tags), true);
        $scored = [];

        foreach (self::posts() as $candidate) {
            if ((string) $candidate['slug'] === $slug) {
                continue;
            }
            $score = 0;
            foreach ($candidate['tags'] as $tag) {
                if (isset($tagSet[strtolower((string) $tag)])) {
                    $score += 3;
                }
            }
            // Soft boost for same service-area keywords in title/slug.
            $hay = strtolower((string) $candidate['slug'] . ' ' . (string) $candidate['title']);
            foreach (['reno', 'tahoe', 'bay-area', 'bay area'] as $place) {
                if (str_contains($hay, $place) && str_contains(strtolower($slug . ' ' . (string) ($post['title'] ?? '')), $place)) {
                    $score += 1;
                }
            }
            $scored[] = ['score' => $score, 'published' => (string) $candidate['published'], 'post' => $candidate];
        }

        usort(
            $scored,
            static function (array $a, array $b): int {
                if ($a['score'] !== $b['score']) {
                    return $b['score'] <=> $a['score'];
                }

                return strcmp($b['published'], $a['published']);
            }
        );

        $out = [];
        foreach ($scored as $row) {
            $out[] = $row['post'];
            if (count($out) >= $limit) {
                break;
            }
        }

        return $out;
    }

    public static function urlForPost(string $slug): string
    {
        return self::SITE_ORIGIN . '/blog/' . rawurlencode($slug);
    }

    public static function renderRobotsTxt(): never
    {
        $lines = [
            '# Siler Chef — private chef · Reno · Lake Tahoe · Bay Area',
            '# Canonical site: https://www.silerchef.com',
            '',
            'User-agent: *',
            'Allow: /',
            'Allow: /blog',
            'Allow: /blog/',
            'Allow: /gallery',
            '',
            'Disallow: /admin',
            'Disallow: /admin/',
            'Disallow: /api/',
            '',
            'User-agent: Googlebot',
            'Allow: /',
            'Allow: /blog/',
            'Allow: /gallery',
            'Disallow: /admin',
            'Disallow: /api/',
            '',
            'User-agent: Googlebot-Image',
            'Allow: /images/',
            '',
            'Sitemap: ' . self::SITE_ORIGIN . '/sitemap.xml',
            '',
        ];

        header('Cache-Control: public, max-age=86400');
        text_response(implode("\n", $lines), 'text/plain; charset=utf-8');
    }

    public static function renderSitemap(): never
    {
        $hubLastmod = gmdate('Y-m-d');
        $latestPostMod = '';
        foreach (self::posts() as $post) {
            $candidate = self::formatLastmod((string) ($post['updated'] ?: $post['published']));
            if ($candidate !== '' && ($latestPostMod === '' || $candidate > $latestPostMod)) {
                $latestPostMod = $candidate;
            }
        }
        if ($latestPostMod !== '') {
            $hubLastmod = $latestPostMod;
        }

        $urls = [
            ['loc' => self::SITE_ORIGIN . '/', 'priority' => '1.0', 'changefreq' => 'weekly', 'lastmod' => $hubLastmod],
            ['loc' => self::SITE_ORIGIN . '/gallery', 'priority' => '0.8', 'changefreq' => 'weekly', 'lastmod' => $hubLastmod],
            ['loc' => self::SITE_ORIGIN . '/blog', 'priority' => '0.85', 'changefreq' => 'weekly', 'lastmod' => $hubLastmod],
        ];

        foreach (self::posts() as $post) {
            $urls[] = [
                'loc' => self::urlForPost((string) $post['slug']),
                'priority' => '0.7',
                'changefreq' => 'monthly',
                'lastmod' => self::formatLastmod((string) ($post['updated'] ?: $post['published'])),
            ];
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        foreach ($urls as $row) {
            $xml .= "  <url>\n";
            $xml .= '    <loc>' . htmlspecialchars($row['loc'], ENT_XML1) . "</loc>\n";
            if (!empty($row['lastmod'])) {
                $xml .= '    <lastmod>' . htmlspecialchars($row['lastmod'], ENT_XML1) . "</lastmod>\n";
            }
            $xml .= '    <changefreq>' . htmlspecialchars($row['changefreq'], ENT_XML1) . "</changefreq>\n";
            $xml .= '    <priority>' . htmlspecialchars($row['priority'], ENT_XML1) . "</priority>\n";
            $xml .= "  </url>\n";
        }
        $xml .= "</urlset>\n";

        header('Cache-Control: public, max-age=3600');
        text_response($xml, 'application/xml; charset=utf-8');
    }

    public static function renderRoute(string $requestPath): bool
    {
        if ($requestPath === '/blog' || $requestPath === '/blog/') {
            self::renderList();
        }

        if (preg_match('#^/blog/([a-z0-9-]+)\z#', $requestPath, $m) === 1) {
            $post = self::findBySlug($m[1]);
            if ($post === null) {
                return false;
            }
            self::renderPost($post);
        }

        return false;
    }

    private static function formatLastmod(string $date): string
    {
        if ($date === '') {
            return '';
        }
        $ts = strtotime($date);

        return $ts !== false ? gmdate('Y-m-d', $ts) : '';
    }

    private static function renderList(): never
    {
        $posts = self::posts();
        $pageTitle = 'Private Chef Journal | Siler Chef — Reno, Tahoe & Bay Area';
        $pageDescription =
            'Guides on private chef dining, in-home entertaining, and menu planning for Reno, Lake Tahoe, and the San Francisco Bay Area.';
        $canonical = self::SITE_ORIGIN . '/blog';
        $activeNav = 'blog';
        $ogType = 'website';
        $extraHeadHtml = '<script type="application/ld+json">' . json_encode(
            [
                '@context' => 'https://schema.org',
                '@type' => 'CollectionPage',
                '@id' => self::SITE_ORIGIN . '/blog#page',
                'url' => $canonical,
                'name' => $pageTitle,
                'description' => $pageDescription,
                'isPartOf' => ['@id' => self::SITE_ORIGIN . '/#website'],
                'about' => ['@id' => self::SITE_ORIGIN . '/#business'],
                'inLanguage' => 'en-US',
            ],
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
        ) . '</script>';

        require dirname(__DIR__) . '/embed/views/blog-list.php';
        exit;
    }

    /** @param array<string, mixed> $post */
    private static function renderPost(array $post): never
    {
        $pageTitle = (string) $post['title'] . ' | Siler Chef';
        $pageDescription = (string) ($post['description'] ?: $post['title']);
        $canonical = self::urlForPost((string) $post['slug']);
        $activeNav = 'blog';
        $ogType = 'article';
        $articlePublished = (string) ($post['published'] ?? '');
        $articleModified = (string) (($post['updated'] ?? '') ?: $articlePublished);

        require dirname(__DIR__) . '/embed/views/blog-post.php';
        exit;
    }

    /** @param array<string, mixed> $post */
    public static function coverAlt(array $post): string
    {
        $alt = trim((string) ($post['imageAlt'] ?? ''));

        return $alt !== '' ? $alt : (string) ($post['title'] ?? 'Siler Chef journal');
    }

    public static function excerpt(string $html, int $maxLen = 160): string
    {
        $text = trim(preg_replace('/\s+/', ' ', strip_tags($html)) ?: '');

        if (strlen($text) <= $maxLen) {
            return $text;
        }

        return rtrim(substr($text, 0, $maxLen - 1)) . '…';
    }
}

function serve_blog_routes(string $requestPath): void
{
    if ($requestPath === '/robots.txt') {
        Blog::renderRobotsTxt();
    }

    if ($requestPath === '/sitemap.xml') {
        Blog::renderSitemap();
    }

    if ($requestPath === '/blog' || $requestPath === '/blog/' || preg_match('#^/blog/[a-z0-9-]+\z#', $requestPath) === 1) {
        if (!Blog::renderRoute($requestPath)) {
            json_response(['error' => 'not_found'], 404);
        }
    }
}
