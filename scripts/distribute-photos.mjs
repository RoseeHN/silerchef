/**
 * 1) Filename-based migration: misplaced images → correct cuisine / service gallery.
 * 2) Append new media from cuisine folders (default: ~/Downloads/website pictures and videos /,
 *    or SILERCHEF_WEBSITE_MEDIA, else repo "website pictures and videos /").
 * 3) "homepage pictures /" → hero (chef-education), reel MP4, craft split visual, Moments strip,
 *    then patch embed/index.html for craft + Moments photo URLs when outputs exist.
 *
 * Run from repo root: npm run photos
 *
 * Writes embed/images/gallery-manifest.json: titles derived from source filenames
 * (humanized) for gallery images/videos, homepage hero/moments, and reel.
 */
import fs from 'fs';
import path from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const EMBED_ROOT = path.join(ROOT, 'embed');

/**
 * Source folders: american cuisine, french cuisine, … under one root.
 * Priority: SILERCHEF_WEBSITE_MEDIA → ~/Downloads/website pictures and videos  → repo copy.
 */
function resolveWebsiteMediaRoot() {
  const env = process.env.SILERCHEF_WEBSITE_MEDIA;
  if (env && String(env).trim()) {
    const p = path.resolve(String(env).trim());
    if (fs.existsSync(p)) return p;
    console.warn('SILERCHEF_WEBSITE_MEDIA path missing, falling back:', p);
  }
  const downloads = path.join(homedir(), 'Downloads', 'website pictures and videos ');
  if (fs.existsSync(downloads)) return downloads;
  return path.join(ROOT, 'website pictures and videos ');
}

const WEBSITE_MEDIA = resolveWebsiteMediaRoot();
console.log('Website media root:', WEBSITE_MEDIA);
const DEST = path.join(ROOT, 'embed/images');
const MANIFEST_PATH = path.join(DEST, 'gallery-manifest.json');

const FOLDER_TO_REL = {
  'american cuisine': 'cuisines/american-cuisine',
  'french cuisine': 'cuisines/french-cuisine',
  'italian cuisine': 'cuisines/italian-cuisine',
  'greek cuisine': 'cuisines/greek-cuisine',
  'turkish cuisine': 'cuisines/turkish-cuisine',
  'international cuisine': 'cuisines/middle-eastern-cuisine',
};

const SKIP_TOP = new Set(['homepage pictures']);

const CUISINE_TARGETS = [
  'cuisines/american-cuisine',
  'cuisines/french-cuisine',
  'cuisines/greek-cuisine',
  'cuisines/italian-cuisine',
  'cuisines/middle-eastern-cuisine',
  'cuisines/turkish-cuisine',
];

const SERVICE_TARGETS = [
  'services-and-occasions/anniversary-celebrations',
  'services-and-occasions/birthday-events',
  'services-and-occasions/family-dinners',
  'services-and-occasions/special-events',
  'services-and-occasions/special-occasion-dining',
];

/** All folders that contain a standard numbered gallery */
const ALL_GALLERY_TARGETS = [...CUISINE_TARGETS, ...SERVICE_TARGETS];

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const VIDEO_EXT = /\.(mp4|mov|webm|m4v)$/i;

function isVideoOptSidecar(name) {
  return /\.opt\.(mp4|mov|webm|m4v)$/i.test(name);
}

/** Numbered video clips only (excludes e.g. 01.opt.mp4 sidecars). */
function listBaseVideos(vdir) {
  if (!fs.existsSync(vdir)) return [];
  return fs.readdirSync(vdir).filter((f) => VIDEO_EXT.test(f) && !isVideoOptSidecar(f));
}

function optSidecarForVideo(name) {
  const ext = path.extname(name);
  const base = name.slice(0, -ext.length);
  return `${base}.opt${ext}`;
}

function loadManifestFile() {
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const j = JSON.parse(raw);
    return {
      version: typeof j.version === 'number' ? j.version : 1,
      images: j.images && typeof j.images === 'object' ? { ...j.images } : {},
      videos: j.videos && typeof j.videos === 'object' ? { ...j.videos } : {},
    };
  } catch {
    return { version: 1, images: {}, videos: {} };
  }
}

let manifest = loadManifestFile();

/** Turn "smoke_briskets-1.jpeg" into a short display title (filename-led). */
function humanizeSourceFilename(basename) {
  const stem = basename.replace(/\.[^.]+$/i, '');
  if (!stem.trim()) return 'Media';
  const cleaned = stem
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned
    .split(' ')
    .map((w) => {
      if (!w) return '';
      if (/^\d+$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(' ');
}

function manifestKeyFromDestAbs(absPathUnderEmbedImages) {
  const rel = path.relative(EMBED_ROOT, absPathUnderEmbedImages).replace(/\\/g, '/');
  return rel;
}

function setManifestImage(relKey, sourceAbsPath) {
  const base = path.basename(sourceAbsPath);
  manifest.images[relKey] = {
    title: humanizeSourceFilename(base),
    source: base,
  };
}

function setManifestVideo(relKey, sourceAbsPath) {
  const base = path.basename(sourceAbsPath);
  manifest.videos[relKey] = {
    title: humanizeSourceFilename(base),
    source: base,
  };
}

/**
 * Fill manifest entries for files already on disk when no title exists yet.
 * Skips purely numeric stems (e.g. 01.jpg). Strips leading NN- on curated names.
 */
function inferMissingManifestTitles() {
  function inferFromBasename(basename) {
    const stem = basename.replace(/\.[^.]+$/i, '');
    if (!/[^\d]/.test(stem)) return null;
    let rest = stem;
    const m = rest.match(/^\d{1,2}[-_](.+)$/);
    if (m && m[1] && /[a-zA-Z]/.test(m[1])) rest = m[1];
    if (!/[a-zA-Z]/.test(rest)) return null;
    return humanizeSourceFilename(rest + path.extname(basename));
  }

  function walkFilesRecursive(dir, pred, fn) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walkFilesRecursive(full, pred, fn);
      else if (pred(ent.name)) fn(full, ent.name);
    }
  }

  walkFilesRecursive(
    DEST,
    (n) => /\.(jpe?g|png|webp)$/i.test(n),
    (full) => {
      const key = manifestKeyFromDestAbs(full);
      if (manifest.images[key]) return;
      const title = inferFromBasename(path.basename(full));
      if (title) manifest.images[key] = { title, source: path.basename(full) };
    }
  );

  walkFilesRecursive(
    DEST,
    (n) => VIDEO_EXT.test(n) && !isVideoOptSidecar(n),
    (full) => {
      const key = manifestKeyFromDestAbs(full);
      if (manifest.videos[key]) return;
      const title = inferFromBasename(path.basename(full));
      if (title) manifest.videos[key] = { title, source: path.basename(full) };
    }
  );
}

function writeGalleryManifest() {
  inferMissingManifestTitles();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log('Wrote', path.relative(ROOT, MANIFEST_PATH));
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function normalizeSeg(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** Fixes stray digits on folder names (e.g. "turkish cuisine6" → turkish cuisine). */
function canonicalTopFolderKey(key) {
  const k = normalizeSeg(key);
  if (/^turkish\s+cuisine\s*\d+$/.test(k)) return 'turkish cuisine';
  return k;
}

/** Same rules as the original silerchef pipeline — destination under embed/images */
function classify(filePathOrName) {
  const n = path.basename(filePathOrName).toLowerCase();

  if (/spaghetti|penne|red sauce penne|pasta(?!\s+cake)|pizza|chicken spinach|garden pizza/i.test(n)) {
    return 'cuisines/italian-cuisine';
  }
  if (/donut|buttermilk|cinnamon twist/i.test(n)) {
    return 'cuisines/american-cuisine';
  }
  if (/smoked|brisket|tri tip|pork butt|kung pao|slow smooked/i.test(n)) {
    return 'cuisines/american-cuisine';
  }
  if (/scallop/i.test(n)) {
    return 'cuisines/greek-cuisine';
  }
  if (/birthday/i.test(n)) {
    return 'services-and-occasions/birthday-events';
  }
  if (/wedding/i.test(n)) {
    return 'services-and-occasions/special-occasion-dining';
  }
  if (/fathers day|father'?s day/i.test(n)) {
    return 'services-and-occasions/family-dinners';
  }
  if (/anniversary/i.test(n)) {
    return 'services-and-occasions/anniversary-celebrations';
  }
  if (
    /fraiser|fraisier|opera|buche|bûche|noel|noël|croissant|madeleine|flan|millefeuille|galette|honore|honoré|eclair|éclair|framboise|entremet|petit|cruller|tarte|macaroon|macaron|meringue|merenque|saint|french |fraiser/i.test(
      n
    )
  ) {
    return 'cuisines/french-cuisine';
  }
  if (/pistachio|raspberry macar|rose raspberry|turkish|kebab|lahmacun|baklava/i.test(n)) {
    return 'cuisines/turkish-cuisine';
  }
  if (/coconut|mezze|falafel|hummus|harissa|zaatar|za'atar|middle|tahini|dates/i.test(n)) {
    return 'cuisines/middle-eastern-cuisine';
  }

  if (
    /cake|cheesecake|chocolate|vanilla|strawberry|mango|lemon|coffee|caramel|rainbow|assorted|mirror|glaze|glazed|trio|individual|dark chocolate|mousse|torte|nutella|blueberry|lichi|liche/i.test(
      n
    )
  ) {
    return 'cuisines/french-cuisine';
  }

  return 'services-and-occasions/special-events';
}

function targetRelForWebsiteFile(absPath) {
  const rel = path.relative(WEBSITE_MEDIA, absPath);
  const first = rel.split(path.sep)[0];
  const key = canonicalTopFolderKey(first);
  if (!key || SKIP_TOP.has(key)) return null;
  const mapped = FOLDER_TO_REL[key];
  if (mapped) return mapped;
  console.warn('Skip (unknown top folder):', first, '→', path.basename(absPath));
  return null;
}

function copyImage(src, destNoExt) {
  const ext = path.extname(src).toLowerCase();
  const dest = destNoExt + (ext === '.png' ? '.png' : '.jpg');
  fs.copyFileSync(src, dest);
}

function copyVideoNumbered(src, destDir, index1Based) {
  const pad = String(index1Based).padStart(2, '0');
  const ext = path.extname(src).toLowerCase();
  const allowed = ['.mp4', '.mov', '.webm', '.m4v'];
  const useExt = allowed.includes(ext) ? ext : '.mp4';
  const dest = path.join(destDir, `${pad}${useExt}`);
  fs.copyFileSync(src, dest);
}

function listGalleryImages(gdir) {
  if (!fs.existsSync(gdir)) return [];
  return fs.readdirSync(gdir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
}

function sortNumeric(names) {
  return [...names].sort((a, b) => {
    const na = parseInt(String(a).replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(String(b).replace(/\D/g, ''), 10) || 0;
    return na - nb;
  });
}

/** Same-size duplicate clips → keep lowest numeric stem; remove extras and matching *.opt.* */
function dedupeVideosBySize(vdir) {
  if (!fs.existsSync(vdir)) return 0;
  const files = listBaseVideos(vdir);
  const bySize = new Map();
  for (const f of files) {
    const sz = fs.statSync(path.join(vdir, f)).size;
    if (!bySize.has(sz)) bySize.set(sz, []);
    bySize.get(sz).push(f);
  }
  let removed = 0;
  for (const group of bySize.values()) {
    if (group.length < 2) continue;
    const sorted = sortNumeric(group);
    for (let i = 1; i < sorted.length; i++) {
      const f = sorted[i];
      fs.unlinkSync(path.join(vdir, f));
      const opt = path.join(vdir, optSidecarForVideo(f));
      if (fs.existsSync(opt)) fs.unlinkSync(opt);
      removed += 1;
    }
  }
  return removed;
}

/** Normalize clips to 01.ext … NN.ext (+ 01.opt.ext when present). */
function renumberVideoFolder(vdir) {
  if (!fs.existsSync(vdir)) return;
  const files = sortNumeric(listBaseVideos(vdir));
  if (files.length === 0) return;
  const tmp = path.join(vdir, '__vtmp');
  ensureDir(tmp);
  const meta = files.map((f) => {
    const ext = path.extname(f);
    return {
      ext,
      hasOpt: fs.existsSync(path.join(vdir, optSidecarForVideo(f))),
    };
  });
  files.forEach((f, i) => {
    fs.renameSync(path.join(vdir, f), path.join(tmp, `b${i}${meta[i].ext}`));
    if (meta[i].hasOpt) {
      fs.renameSync(path.join(vdir, optSidecarForVideo(f)), path.join(tmp, `o${i}${meta[i].ext}`));
    }
  });
  meta.forEach((m, i) => {
    const num = String(i + 1).padStart(2, '0');
    fs.renameSync(path.join(tmp, `b${i}${m.ext}`), path.join(vdir, `${num}${m.ext}`));
    const oSrc = path.join(tmp, `o${i}${m.ext}`);
    if (fs.existsSync(oSrc)) {
      fs.renameSync(oSrc, path.join(vdir, `${num}.opt${m.ext}`));
    }
  });
  fs.rmdirSync(tmp);
}

function sortBasenames(paths) {
  return [...paths].sort((a, b) =>
    path.basename(a).localeCompare(path.basename(b), undefined, { sensitivity: 'base', numeric: true })
  );
}

/** Normalize gallery files to 01.ext, 02.ext … (jpeg → .jpg) */
function renumberGallery(relPath) {
  const gdir = path.join(DEST, relPath, 'gallery');
  if (!fs.existsSync(gdir)) return;
  const files = sortNumeric(listGalleryImages(gdir));
  if (files.length === 0) return;
  const tmp = path.join(gdir, '__r');
  ensureDir(tmp);
  files.forEach((f, i) => {
    fs.renameSync(path.join(gdir, f), path.join(tmp, `x${i}${path.extname(f)}`));
  });
  files.forEach((f, i) => {
    let ext = path.extname(f).toLowerCase();
    if (ext === '.jpeg') ext = '.jpg';
    if (ext !== '.png' && ext !== '.webp') ext = '.jpg';
    fs.renameSync(path.join(tmp, `x${i}${path.extname(f)}`), path.join(gdir, `${String(i + 1).padStart(2, '0')}${ext}`));
  });
  fs.rmdirSync(tmp);
}

function refreshHeroThumbs() {
  for (const rel of CUISINE_TARGETS) {
    const first = path.join(DEST, rel, 'gallery', '01.jpg');
    if (fs.existsSync(first)) {
      fs.copyFileSync(first, path.join(DEST, rel, 'hero.jpg'));
      fs.copyFileSync(first, path.join(DEST, rel, 'thumb.jpg'));
    }
  }
}

function maxNumberedIndex(gdir, baseNames) {
  let max = 0;
  for (const f of baseNames) {
    const n = parseInt(String(f).replace(/\D/g, ''), 10) || 0;
    if (n > max) max = n;
  }
  return max;
}

function galleryBasenamesSet(gdir) {
  const s = new Set();
  if (!fs.existsSync(gdir)) return s;
  for (const f of listGalleryImages(gdir)) {
    s.add(f.toLowerCase());
  }
  return s;
}

const HOMEPAGE_DIR = path.join(WEBSITE_MEDIA, 'homepage pictures');
const INDEX_HTML = path.join(ROOT, 'embed/index.html');

function normalizeBasename(filePath) {
  return path
    .basename(filePath)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fixed trio for Chef Fikret Siler hero rotator (order: madeleine → mango glaze → meringue). */
function resolveHeroTrioSources(images) {
  const slots = [
    { slot: 1, test: (n) => /madeleine/.test(n) },
    { slot: 2, test: (n) => /mango/.test(n) && /cheesecake/.test(n) },
    { slot: 3, test: (n) => /merenque|meringue/.test(n) },
  ];
  const usedPaths = new Set();
  const out = [];
  for (const { slot, test } of slots) {
    let hit = null;
    for (const p of sortBasenames(images)) {
      if (usedPaths.has(p)) continue;
      const n = normalizeBasename(p);
      if (test(n)) {
        hit = p;
        break;
      }
    }
    if (hit) {
      usedPaths.add(hit);
      out.push({ slot, src: hit });
    }
  }
  return out;
}

function pickCraftImage(images, used) {
  const avail = sortBasenames(images.filter((p) => !used.has(p)));
  if (!avail.length) return null;
  const kw = avail.filter((p) =>
    /mango|cheesecake|merenque|meringue|pastry|craft|cake|churn|ferment|pipe/i.test(path.basename(p))
  );
  return kw.length ? kw[0] : avail[0];
}

function pickReelMp4(videos) {
  const mp4s = videos.filter((v) => /\.mp4$/i.test(v));
  if (!mp4s.length) return null;
  const preferred = mp4s.find((v) => /glaze|glazing|reel|chef|pass|mango/i.test(path.basename(v)));
  if (preferred) return preferred;
  return [...mp4s].sort((a, b) => fs.statSync(a).size - fs.statSync(b).size)[0];
}

/**
 * Homepage folder → hero trio (homepage/hero-0N.jpg), OG/reel still (chef-education/hero.jpg),
 * craft split, reel mp4, moments; patch index for craft/moments when applicable.
 */
function distributeHomepageFolder() {
  if (!fs.existsSync(HOMEPAGE_DIR)) {
    console.log('Homepage media: folder missing, skip.');
    return;
  }

  const files = walkFiles(HOMEPAGE_DIR);
  const images = files.filter((f) => IMAGE_EXT.test(path.basename(f)));
  const videos = files.filter((f) => VIDEO_EXT.test(path.basename(f)));

  const used = new Set();
  let momentCount = 0;
  let wroteCraft = false;

  const trio = resolveHeroTrioSources(images);
  if (trio.length) {
    ensureDir(path.join(DEST, 'homepage'));
    for (const { slot, src } of trio) {
      const destBase = path.join(DEST, 'homepage', `hero-0${slot}`);
      copyImage(src, destBase);
      used.add(src);
      const ext = path.extname(src).toLowerCase();
      const heroName = ext === '.png' ? `hero-0${slot}.png` : `hero-0${slot}.jpg`;
      setManifestImage(`images/homepage/${heroName}`, src);
      console.log(`Homepage hero rotator hero-0${slot}.jpg ←`, path.basename(src));
    }
    const first = trio.find((t) => t.slot === 1) || trio[0];
    if (first) {
      const heroDestDir = path.join(DEST, 'services-and-occasions/chef-education');
      ensureDir(heroDestDir);
      copyImage(first.src, path.join(heroDestDir, 'hero'));
      setManifestImage('images/services-and-occasions/chef-education/hero.jpg', first.src);
      console.log('Homepage hero (SEO / reel still) → chef-education/hero.jpg ←', path.basename(first.src));
    }
  }

  const craftSrc = pickCraftImage(images, used);
  if (craftSrc) {
    ensureDir(path.join(DEST, 'homepage'));
    copyImage(craftSrc, path.join(DEST, 'homepage/craft-split'));
    used.add(craftSrc);
    wroteCraft = true;
    const craftExt = path.extname(craftSrc).toLowerCase();
    const craftFile = craftExt === '.png' ? 'craft-split.png' : 'craft-split.jpg';
    setManifestImage(`images/homepage/${craftFile}`, craftSrc);
    console.log('Homepage craft split → homepage/craft-split.jpg ←', path.basename(craftSrc));
  }

  const reelSrc = pickReelMp4(sortBasenames(videos));
  if (reelSrc) {
    ensureDir(path.join(DEST, 'video'));
    fs.copyFileSync(reelSrc, path.join(DEST, 'video/chef-reel.mp4'));
    setManifestVideo('images/video/chef-reel.mp4', reelSrc);
    console.log('Homepage reel → video/chef-reel.mp4 ←', path.basename(reelSrc));
  } else {
    const movOnly = videos.filter((v) => /\.mov$/i.test(path.basename(v)));
    if (movOnly.length) {
      console.log(
        'Homepage reel: no MP4 found; .MOV files need conversion to MP4 for chef-reel.mp4 (skipped).'
      );
    }
  }

  const momentDir = path.join(DEST, 'gallery-curated/photos');
  ensureDir(momentDir);
  let mi = 1;
  for (const src of sortBasenames(images.filter((p) => !used.has(p)))) {
    const momentBase = path.join(momentDir, `homepage-moment-${String(mi).padStart(2, '0')}`);
    copyImage(src, momentBase);
    const ext = path.extname(src).toLowerCase();
    const fn = ext === '.png' ? `homepage-moment-${String(mi).padStart(2, '0')}.png` : `homepage-moment-${String(mi).padStart(2, '0')}.jpg`;
    setManifestImage(`images/gallery-curated/photos/${fn}`, src);
    mi += 1;
    momentCount += 1;
  }
  if (momentCount) {
    console.log('Homepage moments → gallery-curated/photos/homepage-moment-*.jpg ×', momentCount);
  }

  patchIndexHtml({ wroteCraft, momentCount });
}

function patchIndexHtml({ wroteCraft, momentCount }) {
  if (!fs.existsSync(INDEX_HTML)) return;
  let html = fs.readFileSync(INDEX_HTML, 'utf8');

  if (wroteCraft && fs.existsSync(path.join(DEST, 'homepage/craft-split.jpg'))) {
    html = html.replace(
      /src="images\/cuisines\/turkish-cuisine\/hero\.jpg"/,
      'src="images/homepage/craft-split.jpg"'
    );
  }

  if (momentCount > 0) {
    const start = html.indexOf('<section id="moments"');
    const end = html.indexOf('<section class="module module--stats', start);
    if (start !== -1 && end !== -1) {
      const head = html.slice(0, start);
      let mid = html.slice(start, end);
      const tail = html.slice(end);
      let idx = 1;
      mid = mid.replace(/src="images\/gallery-curated\/photos\/[^"]+"/g, (match) => {
        const fn = `homepage-moment-${String(idx).padStart(2, '0')}.jpg`;
        const p = path.join(DEST, 'gallery-curated/photos', fn);
        if (idx <= momentCount && fs.existsSync(p)) {
          idx += 1;
          return `src="images/gallery-curated/photos/${fn}"`;
        }
        return match;
      });
      html = head + mid + tail;
    }
  }

  fs.writeFileSync(INDEX_HTML, html);
  if (wroteCraft || momentCount) {
    console.log('Patched embed/index.html (craft module and/or Moments photos).');
  }
}

/** Move misplaced images based on filename; then renumber touched galleries */
function migrateMisplacedByFilename() {
  const moves = [];
  for (const rel of ALL_GALLERY_TARGETS) {
    // Cuisine folders follow the website media folder ("american cuisine", …). Do not
    // re-route by filename — keywords like "cheesecake" or "cruller" would steal assets.
    if (rel.startsWith('cuisines/')) continue;
    const gdir = path.join(DEST, rel, 'gallery');
    if (!fs.existsSync(gdir)) continue;
    for (const f of listGalleryImages(gdir)) {
      const correct = classify(f);
      if (correct !== rel) {
        moves.push({
          from: path.join(gdir, f),
          name: f,
          fromRel: rel,
          toRel: correct,
        });
      }
    }
  }
  if (!moves.length) {
    console.log('Filename migration: no misplaced images.');
    return;
  }
  let n = 0;
  for (const m of moves) {
    const toDir = path.join(DEST, m.toRel, 'gallery');
    ensureDir(toDir);
    const ext = path.extname(m.name);
    const staging = path.join(toDir, `_mv_${Date.now()}_${n}${ext}`);
    fs.renameSync(m.from, staging);
    n += 1;
  }
  const affected = new Set();
  moves.forEach((m) => {
    affected.add(m.fromRel);
    affected.add(m.toRel);
  });
  for (const rel of affected) {
    renumberGallery(rel);
  }
  console.log('Filename migration: moved', moves.length, 'image(s).');
}

function appendFromWebsite() {
  if (!fs.existsSync(WEBSITE_MEDIA)) {
    console.log('Optional source missing (skip append):', WEBSITE_MEDIA);
    return;
  }

  const allFiles = walkFiles(WEBSITE_MEDIA);
  const imageBuckets = {};
  const videoBuckets = {};

  for (const fp of allFiles) {
    const targetRel = targetRelForWebsiteFile(fp);
    if (!targetRel) continue;
    const base = path.basename(fp);
    if (IMAGE_EXT.test(base)) {
      if (!imageBuckets[targetRel]) imageBuckets[targetRel] = [];
      imageBuckets[targetRel].push(fp);
    } else if (VIDEO_EXT.test(base)) {
      if (!videoBuckets[targetRel]) videoBuckets[targetRel] = [];
      videoBuckets[targetRel].push(fp);
    }
  }

  let imgAdded = 0;
  let vidAdded = 0;

  for (const rel of CUISINE_TARGETS) {
    const paths = sortBasenames(imageBuckets[rel] || []);
    const galleryDir = path.join(DEST, rel, 'gallery');
    ensureDir(galleryDir);
    const existingNames = galleryBasenamesSet(galleryDir);
    let idx = maxNumberedIndex(galleryDir, listGalleryImages(galleryDir));
    const copiedSrcs = [];

    for (const src of paths) {
      const bn = path.basename(src).toLowerCase();
      if (existingNames.has(bn)) {
        console.log('Skip duplicate basename:', rel, bn);
        continue;
      }
      idx += 1;
      const n = String(idx).padStart(2, '0');
      copyImage(src, path.join(galleryDir, n));
      existingNames.add(bn);
      copiedSrcs.push(src);
      imgAdded += 1;
    }
    if (paths.length) renumberGallery(rel);
    if (copiedSrcs.length) {
      const files = sortNumeric(listGalleryImages(galleryDir));
      const newCount = copiedSrcs.length;
      for (let i = 0; i < newCount; i++) {
        const fname = files[files.length - newCount + i];
        const key = `images/${rel}/gallery/${fname}`;
        const src = copiedSrcs[i];
        manifest.images[key] = {
          title: humanizeSourceFilename(path.basename(src)),
          source: path.basename(src),
        };
      }
    }

    const vpaths = sortBasenames(videoBuckets[rel] || []);
    if (!vpaths.length) continue;
    const vdir = path.join(DEST, rel, 'videos');
    ensureDir(vdir);
    const vExisting = fs.existsSync(vdir) ? listBaseVideos(vdir) : [];
    let vidx = maxNumberedIndex(vdir, vExisting);
    const seenVidBasenames = new Set();
    const copiedVids = [];
    for (const src of vpaths) {
      const bn = path.basename(src).toLowerCase();
      if (seenVidBasenames.has(bn)) continue;
      seenVidBasenames.add(bn);
      vidx += 1;
      copyVideoNumbered(src, vdir, vidx);
      copiedVids.push(src);
      vidAdded += 1;
    }
    if (copiedVids.length) {
      const allV = sortNumeric(listBaseVideos(vdir));
      const nc = copiedVids.length;
      for (let i = 0; i < nc; i++) {
        const fname = allV[allV.length - nc + i];
        const key = `images/${rel}/videos/${fname}`;
        const src = copiedVids[i];
        manifest.videos[key] = {
          title: humanizeSourceFilename(path.basename(src)),
          source: path.basename(src),
        };
      }
    }
  }

  for (const rel of CUISINE_TARGETS) {
    const vdir = path.join(DEST, rel, 'videos');
    const removed = dedupeVideosBySize(vdir);
    renumberVideoFolder(vdir);
    if (removed > 0) {
      console.log('Video dedupe:', rel, 'removed', removed, 'duplicate(s)');
    }
  }

  console.log('Appended from website folder:', imgAdded, 'image(s),', vidAdded, 'video(s).');
}

const BRAND = path.join(ROOT, 'WhatsApp Image 2026-04-27 at 21.29.33.jpeg');
if (fs.existsSync(BRAND)) {
  ensureDir(path.join(DEST, 'brand'));
  const ext = path.extname(BRAND).toLowerCase();
  const destBase = path.join(DEST, 'brand', 'business-card');
  const dest = destBase + (ext === '.png' ? '.png' : '.jpg');
  fs.copyFileSync(BRAND, dest);
  console.log('brand/business-card');
}

migrateMisplacedByFilename();
appendFromWebsite();
distributeHomepageFolder();

refreshHeroThumbs();

for (const rel of CUISINE_TARGETS) {
  const g = path.join(DEST, rel, 'gallery');
  const n = fs.existsSync(g)
    ? fs.readdirSync(g).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).length
    : 0;
  if (n === 0) console.warn('Still empty:', rel);
}

writeGalleryManifest();
