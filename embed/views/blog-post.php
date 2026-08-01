<?php
$ogImage = Blog::siteOrigin() . '/' . ltrim((string) $post['image'], '/');
require __DIR__ . '/blog-layout-head.php';
$slug = (string) $post['slug'];
$published = (string) $post['published'];
$tags = is_array($post['tags']) ? $post['tags'] : [];
?>
    <main class="blog-main blog-main--article">
      <article class="blog-article blog-shell">
        <nav class="blog-article__crumb" aria-label="Breadcrumb">
          <a href="/blog">Journal</a>
          <span aria-hidden="true">/</span>
          <span><?= htmlspecialchars((string) $post['title'], ENT_QUOTES, 'UTF-8') ?></span>
        </nav>
        <header class="blog-article__header">
          <?php if ($published !== ''): ?>
            <time class="blog-article__date" datetime="<?= htmlspecialchars($published, ENT_QUOTES, 'UTF-8') ?>">
              <?= htmlspecialchars(date('F j, Y', strtotime($published) ?: time()), ENT_QUOTES, 'UTF-8') ?>
            </time>
          <?php endif; ?>
          <h1 class="blog-article__title gold-text"><?= htmlspecialchars((string) $post['title'], ENT_QUOTES, 'UTF-8') ?></h1>
          <?php if (!empty($tags)): ?>
            <ul class="blog-article__tags">
              <?php foreach ($tags as $tag): ?>
                <li><?= htmlspecialchars((string) $tag, ENT_QUOTES, 'UTF-8') ?></li>
              <?php endforeach; ?>
            </ul>
          <?php endif; ?>
        </header>
        <figure class="blog-article__hero">
          <img
            src="/<?= htmlspecialchars(ltrim((string) $post['image'], '/'), ENT_QUOTES, 'UTF-8') ?>"
            alt="<?= htmlspecialchars(Blog::coverAlt($post), ENT_QUOTES, 'UTF-8') ?>"
            width="1200"
            height="800"
            loading="eager"
            decoding="async"
          />
        </figure>
        <div class="blog-article__content">
          <?= (string) $post['bodyHtml'] ?>
        </div>
        <footer class="blog-article__footer">
          <p>Planning a private table in Reno, Lake Tahoe, or the Bay Area?</p>
          <div class="blog-article__actions">
            <a class="btn btn-primary" href="/#contact">Reserve your date</a>
            <a class="btn btn-ghost" href="/#cuisines">Explore sample menus</a>
          </div>
        </footer>
      </article>
    </main>
    <script type="application/ld+json">
      <?= json_encode(
          [
              '@context' => 'https://schema.org',
              '@graph' => [
                  [
                      '@type' => 'BreadcrumbList',
                      '@id' => $canonical . '#breadcrumb',
                      'itemListElement' => [
                          [
                              '@type' => 'ListItem',
                              'position' => 1,
                              'name' => 'Home',
                              'item' => Blog::siteOrigin() . '/',
                          ],
                          [
                              '@type' => 'ListItem',
                              'position' => 2,
                              'name' => 'Journal',
                              'item' => Blog::siteOrigin() . '/blog',
                          ],
                          [
                              '@type' => 'ListItem',
                              'position' => 3,
                              'name' => (string) $post['title'],
                              'item' => $canonical,
                          ],
                      ],
                  ],
                  [
                      '@type' => 'BlogPosting',
                      '@id' => $canonical . '#article',
                      'headline' => (string) $post['title'],
                      'description' => (string) ($post['description'] ?: Blog::excerpt((string) $post['bodyHtml'], 160)),
                      'datePublished' => $published !== '' ? $published : null,
                      'dateModified' => (string) ($post['updated'] ?: $published) ?: null,
                      'author' => [
                          '@type' => 'Person',
                          '@id' => Blog::siteOrigin() . '/#chef',
                          'name' => 'Fikret Siler',
                      ],
                      'publisher' => [
                          '@type' => 'Organization',
                          'name' => 'Siler Chef',
                          'logo' => [
                              '@type' => 'ImageObject',
                              'url' => Blog::siteOrigin() . '/images/brand/silerchef-logo.png',
                          ],
                      ],
                      'image' => [
                          '@type' => 'ImageObject',
                          'url' => $ogImage,
                          'caption' => Blog::coverAlt($post),
                      ],
                      'mainEntityOfPage' => [
                          '@type' => 'WebPage',
                          '@id' => $canonical,
                      ],
                      'inLanguage' => 'en-US',
                  ],
              ],
          ],
          JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
      ) ?>
    </script>
<?php
require __DIR__ . '/blog-layout-foot.php';
