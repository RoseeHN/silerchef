<?php
/** @var string $pageTitle */
/** @var string $pageDescription */
/** @var string $canonical */
/** @var string $activeNav */
/** @var string|null $ogImage */
/** @var string $ogType */
/** @var string|null $articlePublished */
/** @var string|null $articleModified */
/** @var string|null $extraHeadHtml */
$v = Blog::assetVersion();
$ogImage = $ogImage ?? Blog::siteOrigin() . '/images/homepage/hero-01.jpg';
$ogType = $ogType ?? 'website';
$articlePublished = $articlePublished ?? null;
$articleModified = $articleModified ?? null;
$extraHeadHtml = $extraHeadHtml ?? null;
?>
<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#141214" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></title>
    <meta name="description" content="<?= htmlspecialchars($pageDescription, ENT_QUOTES, 'UTF-8') ?>" />
    <link rel="canonical" href="<?= htmlspecialchars($canonical, ENT_QUOTES, 'UTF-8') ?>" />
    <link rel="sitemap" type="application/xml" title="Sitemap" href="<?= htmlspecialchars(Blog::siteOrigin(), ENT_QUOTES, 'UTF-8') ?>/sitemap.xml" />
    <meta property="og:type" content="<?= htmlspecialchars($ogType, ENT_QUOTES, 'UTF-8') ?>" />
    <meta property="og:site_name" content="Siler Chef" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="<?= htmlspecialchars($canonical, ENT_QUOTES, 'UTF-8') ?>" />
    <meta property="og:title" content="<?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?>" />
    <meta property="og:description" content="<?= htmlspecialchars($pageDescription, ENT_QUOTES, 'UTF-8') ?>" />
    <meta property="og:image" content="<?= htmlspecialchars($ogImage, ENT_QUOTES, 'UTF-8') ?>" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="<?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?>" />
    <meta name="twitter:description" content="<?= htmlspecialchars($pageDescription, ENT_QUOTES, 'UTF-8') ?>" />
    <meta name="twitter:image" content="<?= htmlspecialchars($ogImage, ENT_QUOTES, 'UTF-8') ?>" />
    <?php if (is_string($articlePublished) && $articlePublished !== ''): ?>
      <meta property="article:published_time" content="<?= htmlspecialchars($articlePublished, ENT_QUOTES, 'UTF-8') ?>" />
    <?php endif; ?>
    <?php if (is_string($articleModified) && $articleModified !== ''): ?>
      <meta property="article:modified_time" content="<?= htmlspecialchars($articleModified, ENT_QUOTES, 'UTF-8') ?>" />
    <?php endif; ?>
    <link rel="icon" type="image/png" href="/images/brand/silerchef-logo.png" />
    <link rel="stylesheet" href="/fonts.css?v=<?= htmlspecialchars($v, ENT_QUOTES, 'UTF-8') ?>" />
    <link rel="stylesheet" href="/styles.css?v=<?= htmlspecialchars($v, ENT_QUOTES, 'UTF-8') ?>" />
    <link rel="stylesheet" href="/blog.css?v=<?= htmlspecialchars($v, ENT_QUOTES, 'UTF-8') ?>" />
    <?php if (is_string($extraHeadHtml) && $extraHeadHtml !== ''): ?>
      <?= $extraHeadHtml ?>
    <?php endif; ?>
  </head>
  <body class="blog-page">
    <div class="bg-texture" aria-hidden="true"></div>
    <div class="bg-vignette" aria-hidden="true"></div>
    <header class="site-header">
      <div class="header-inner">
        <a class="brand-lockup" href="/">
          <span class="brand-lockup__shell">
            <span class="brand-mark" aria-hidden="true">
              <img class="brand-logo brand-logo--header" src="/images/brand/silerchef-logo.png" width="48" height="48" alt="" decoding="async" />
            </span>
            <span class="brand-text">
              <strong>Siler Chef</strong>
              <small>Personal Chef &amp; Culinary Artist</small>
            </span>
          </span>
        </a>
        <nav id="site-nav" class="site-nav" aria-label="Primary">
          <ul>
            <li><a href="/"<?= $activeNav === 'home' ? ' aria-current="page"' : '' ?>>Home</a></li>
            <li><a href="/#cuisines">Cuisines</a></li>
            <li><a href="/gallery"<?= $activeNav === 'gallery' ? ' aria-current="page"' : '' ?>>Gallery</a></li>
            <li><a href="/blog"<?= $activeNav === 'blog' ? ' aria-current="page"' : '' ?>>Journal</a></li>
            <li><a href="/#services">Services</a></li>
            <li><a href="/#contact">Contact</a></li>
            <li class="site-nav__cta-mobile">
              <a class="header-cta" href="/#contact">Reserve your date</a>
            </li>
          </ul>
        </nav>
        <a class="header-cta header-cta--bar" href="/#contact">Reserve your date</a>
        <button type="button" class="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="site-nav">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>
    <div class="page">
