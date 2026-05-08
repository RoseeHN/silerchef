/**
 * Resize cuisine/service hub card thumbnails (thumb.jpg) for faster grid loads.
 * Hub visuals display ~460px CSS wide — cap longest edge so files stay small.
 *
 *   npm run optimize-hub-thumbs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** ~2× typical card width on desktop */
const MAX_EDGE = 920;
const JPEG_QUALITY = 80;

const BASES = [
  path.join(ROOT, 'embed/images/cuisines'),
  path.join(ROOT, 'embed/images/services-and-occasions'),
];

function walkThumbs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkThumbs(full, out);
    else if (ent.name.toLowerCase() === 'thumb.jpg') out.push(full);
  }
  return out;
}

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('Install sharp (npm install) then rerun.');
    process.exit(1);
  }

  const files = BASES.flatMap((b) => walkThumbs(b));
  let ok = 0;

  for (const abs of files) {
    const tmp = `${abs}.hub-opt.tmp`;
    const before = fs.statSync(abs).size;
    try {
      await sharp(abs)
        .rotate()
        .resize({
          width: MAX_EDGE,
          height: MAX_EDGE,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toFile(tmp);

      const after = fs.statSync(tmp).size;
      fs.renameSync(abs, `${abs}.bak`);
      fs.renameSync(tmp, abs);
      fs.unlinkSync(`${abs}.bak`);
      console.log(
        path.relative(ROOT, abs),
        `${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB`
      );
      ok += 1;
    } catch (e) {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      console.warn('Skip', path.relative(ROOT, abs), String(e.message || e));
    }
  }

  console.log(`Done: ${ok} thumbnail(s) optimized.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
