/**
 * Copy photos from "silerchef.com pictures /" → embed/images/
 * Run from repo root: node scripts/distribute-photos.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'silerchef.com pictures ');
const DEST = path.join(ROOT, 'embed/images');

const ALL_TARGETS = [
  'cuisines/american-cuisine',
  'cuisines/french-cuisine',
  'cuisines/greek-cuisine',
  'cuisines/italian-cuisine',
  'cuisines/middle-eastern-cuisine',
  'cuisines/turkish-cuisine',
  'services-and-occasions/anniversary-celebrations',
  'services-and-occasions/birthday-events',
  'services-and-occasions/family-dinners',
  'services-and-occasions/special-events',
  'services-and-occasions/special-occasion-dining',
];

function listFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.error('Missing source:', dir);
    process.exit(1);
  }
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((f) => path.join(dir, f));
}

/** Returns folder path under embed/images/ e.g. cuisines/french-cuisine */
function classify(filePath) {
  const n = path.basename(filePath).toLowerCase();

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
  if (/fraiser|fraisier|opera|buche|bûche|noel|noël|croissant|madeleine|flan|millefeuille|galette|honore|honoré|eclair|éclair|framboise|entremet|petit|cruller|tarte|macaroon|macaron|meringue|merenque|saint|french |fraiser/i.test(n)) {
    return 'cuisines/french-cuisine';
  }
  if (/pistachio|raspberry macar|rose raspberry|turkish|kebab|lahmacun|baklava/i.test(n)) {
    return 'cuisines/turkish-cuisine';
  }
  if (/coconut|mezze|falafel|hummus|harissa|zaatar|za'atar|middle|tahini|dates/i.test(n)) {
    return 'cuisines/middle-eastern-cuisine';
  }

  if (/cake|cheesecake|chocolate|vanilla|strawberry|mango|lemon|coffee|caramel|rainbow|assorted|mirror|glaze|glazed|trio|individual|dark chocolate|mousse|torte|nutella|blueberry|lichi|liche/i.test(n)) {
    return 'cuisines/french-cuisine';
  }

  return 'services-and-occasions/special-events';
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function copyDest(src, destNoExt) {
  const ext = path.extname(src).toLowerCase();
  const dest = destNoExt + (ext === '.png' ? '.png' : '.jpg');
  fs.copyFileSync(src, dest);
}

function listJpg(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f));
}

function sortNumeric(names) {
  return [...names].sort((a, b) => {
    const na = parseInt(String(a).replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(String(b).replace(/\D/g, ''), 10) || 0;
    return na - nb;
  });
}

function renumberGallery(relPath) {
  const gdir = path.join(DEST, relPath, 'gallery');
  if (!fs.existsSync(gdir)) return;
  const files = sortNumeric(listJpg(gdir));
  if (files.length === 0) return;
  const tmp = path.join(gdir, '__r');
  ensureDir(tmp);
  files.forEach((f, i) => {
    fs.renameSync(path.join(gdir, f), path.join(tmp, `x${i}.jpg`));
  });
  files.forEach((_, i) => {
    fs.renameSync(path.join(tmp, `x${i}.jpg`), path.join(gdir, `${String(i + 1).padStart(2, '0')}.jpg`));
  });
  fs.rmdirSync(tmp);
}

/** Move last `count` files from donor gallery into target gallery; renumber both. */
function stripFromDonor(donorRel, targetRel, count) {
  const dg = path.join(DEST, donorRel, 'gallery');
  const tg = path.join(DEST, targetRel, 'gallery');
  ensureDir(tg);
  const donorFiles = sortNumeric(listJpg(dg));
  if (donorFiles.length <= count + 12) return;
  const tail = donorFiles.slice(-count);
  const tmp = path.join(DEST, '__xfer');
  ensureDir(tmp);
  tail.forEach((f, i) => {
    fs.renameSync(path.join(dg, f), path.join(tmp, `t${i}.jpg`));
  });
  const existing = listJpg(tg).length;
  tail.forEach((_, i) => {
    fs.renameSync(path.join(tmp, `t${i}.jpg`), path.join(tg, `${String(existing + i + 1).padStart(2, '0')}.jpg`));
  });
  fs.rmdirSync(tmp);
  renumberGallery(donorRel);
  renumberGallery(targetRel);
}

function refreshHeroThumbs() {
  for (const rel of ALL_TARGETS) {
    const first = path.join(DEST, rel, 'gallery', '01.jpg');
    if (fs.existsSync(first)) {
      fs.copyFileSync(first, path.join(DEST, rel, 'hero.jpg'));
      fs.copyFileSync(first, path.join(DEST, rel, 'thumb.jpg'));
    }
  }
}

const buckets = {};

function addBucket(relPath, filePath) {
  if (!buckets[relPath]) buckets[relPath] = [];
  buckets[relPath].push(filePath);
}

const files = listFiles(SRC);
for (const fp of files) {
  addBucket(classify(fp), fp);
}

const BRAND = path.join(ROOT, 'WhatsApp Image 2026-04-27 at 21.29.33.jpeg');
if (fs.existsSync(BRAND)) {
  ensureDir(path.join(DEST, 'brand'));
  copyDest(BRAND, path.join(DEST, 'brand', 'business-card'));
  console.log('brand/business-card');
}

for (const rel of ALL_TARGETS) {
  const dir = path.join(DEST, rel, 'gallery');
  if (!fs.existsSync(dir)) ensureDir(dir);
  const prev = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f !== '.gitkeep' && /\.(jpe?g|png)$/i.test(f))
    : [];
  for (const f of prev) {
    fs.unlinkSync(path.join(dir, f));
  }
}

for (const [relPath, paths] of Object.entries(buckets)) {
  const galleryDir = path.join(DEST, relPath, 'gallery');
  ensureDir(galleryDir);
  paths.forEach((src, i) => {
    const n = String(i + 1).padStart(2, '0');
    copyDest(src, path.join(galleryDir, n));
  });
  console.log(relPath, '→', paths.length);
}

stripFromDonor('cuisines/french-cuisine', 'services-and-occasions/anniversary-celebrations', 12);
stripFromDonor('cuisines/french-cuisine', 'cuisines/turkish-cuisine', 10);
stripFromDonor('cuisines/french-cuisine', 'cuisines/middle-eastern-cuisine', 10);

refreshHeroThumbs();

for (const rel of ALL_TARGETS) {
  const g = path.join(DEST, rel, 'gallery');
  const n = fs.existsSync(g)
    ? fs.readdirSync(g).filter((f) => /\.(jpe?g|png)$/i.test(f)).length
    : 0;
  if (n === 0) console.warn('Still empty:', rel);
}

console.log('Source files:', files.length);
