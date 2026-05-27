<?php
require __DIR__ . '/blog-layout-head.php';
?>
    <main class="blog-main">
      <section class="blog-hero blog-shell">
        <p class="blog-hero__eyebrow">Journal</p>
        <h1 class="blog-hero__title gold-text">Private chef guides for Reno, Tahoe &amp; the Bay Area</h1>
        <p class="blog-hero__lede">
          Practical notes on hosting, menu direction, and what to expect when you bring restaurant-level dining home — written for hosts planning their next table.
        </p>
      </section>
      <section class="blog-grid-section blog-shell" aria-label="Articles">
        <ul class="blog-grid">
          <?php foreach ($posts as $post): ?>
            <?php
              $slug = (string) $post['slug'];
              $href = '/blog/' . htmlspecialchars($slug, ENT_QUOTES, 'UTF-8');
              $img = '/' . ltrim((string) $post['image'], '/');
              $date = (string) $post['published'];
              $excerpt = Blog::excerpt((string) $post['bodyHtml'], 200);
            ?>
            <li>
              <article class="blog-card">
                <a class="blog-card__media" href="<?= $href ?>">
                  <img src="<?= htmlspecialchars($img, ENT_QUOTES, 'UTF-8') ?>" alt="<?= htmlspecialchars(Blog::coverAlt($post), ENT_QUOTES, 'UTF-8') ?>" loading="lazy" decoding="async" width="640" height="480" />
                </a>
                <div class="blog-card__body">
                  <?php if ($date !== ''): ?>
                    <time class="blog-card__date" datetime="<?= htmlspecialchars($date, ENT_QUOTES, 'UTF-8') ?>">
                      <?= htmlspecialchars(date('F j, Y', strtotime($date) ?: time()), ENT_QUOTES, 'UTF-8') ?>
                    </time>
                  <?php endif; ?>
                  <h2 class="blog-card__title">
                    <a href="<?= $href ?>"><?= htmlspecialchars((string) $post['title'], ENT_QUOTES, 'UTF-8') ?></a>
                  </h2>
                  <p class="blog-card__excerpt"><?= htmlspecialchars($excerpt, ENT_QUOTES, 'UTF-8') ?></p>
                  <a class="blog-card__more" href="<?= $href ?>">Read article</a>
                </div>
              </article>
            </li>
          <?php endforeach; ?>
        </ul>
      </section>
    </main>
<?php
require __DIR__ . '/blog-layout-foot.php';
