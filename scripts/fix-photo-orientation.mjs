/**
 * Rebuild site derivatives for source photos whose EXIF orientation tag is wrong.
 *
 * Some phone shots come back tagged as portrait even though the frame was
 * captured in landscape. Browsers honour the tag, so the plate ends up on its
 * side. Sharp's `.rotate()` honours it too, which is why the bad angle survived
 * every earlier resize pass. Reading with `failOn: 'none'` and skipping
 * `.rotate()` keeps the sensor frame, then each target is cropped around the
 * subject instead of being rotated into portrait.
 *
 *   node scripts/fix-photo-orientation.mjs
 */
import fs from 'fs';
import path from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const JPEG_QUALITY = 82;
const WEBP_QUALITY = 78;

const NEW_IMAGES = path.join(homedir(), 'Downloads', 'silerchef new imaged');

const FIXES = [
  {
    label: 'short rib on saffron risotto',
    source: path.join(NEW_IMAGES, 'IMG_4738.jpeg'),
    /** Horizontal centre of the plate within the true landscape frame. */
    focusX: 0.622,
    targets: [
      'embed/images/pack-20260807/short-rib.jpg',
      'embed/images/pack-20260807/short-rib.webp',
      'embed/images/pack-20260807/short-rib-900.jpg',
      'embed/images/pack-20260807/short-rib-900.webp',
      'embed/images/pack-20260807/short-rib-640.jpg',
      'embed/images/pack-20260807/short-rib-640.webp',
      'embed/images/services-and-occasions/family-dinners/thumb.jpg',
      'embed/images/services-and-occasions/family-dinners/thumb.webp',
      'embed/images/services-and-occasions/family-dinners/thumb-560.jpg',
      'embed/images/services-and-occasions/family-dinners/thumb-560.webp',
      'embed/images/services-and-occasions/family-dinners/thumb-400.jpg',
      'embed/images/services-and-occasions/family-dinners/thumb-400.webp',
      'embed/images/gallery-curated/photos/07-short-rib.jpg',
      'embed/images/gallery-curated/photos/07-short-rib.webp',
      'embed/images/gallery-curated/photos/07-short-rib-900.jpg',
      'embed/images/gallery-curated/photos/07-short-rib-900.webp',
      'embed/images/gallery-curated/photos/07-short-rib-640.jpg',
      'embed/images/gallery-curated/photos/07-short-rib-640.webp',
    ],
  },
];

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('Install sharp (npm install) then rerun.');
    process.exit(1);
  }

  let written = 0;
  let skipped = 0;

  for (const fix of FIXES) {
    if (!fs.existsSync(fix.source)) {
      console.warn(`Skip ${fix.label}: source missing (${fix.source})`);
      skipped += fix.targets.length;
      continue;
    }

    const frame = sharp(fix.source, { failOn: 'none' });
    const { width: srcW, height: srcH } = await frame.metadata();

    for (const rel of fix.targets) {
      const abs = path.join(ROOT, rel);
      if (!fs.existsSync(abs)) {
        console.warn('Skip missing target', rel);
        skipped += 1;
        continue;
      }

      const { width, height } = await sharp(abs).metadata();
      const cropW = Math.min(srcW, Math.round(srcH * (width / height)));
      const cropH = Math.min(srcH, Math.round(cropW * (height / width)));
      const left = Math.max(0, Math.min(srcW - cropW, Math.round(srcW * fix.focusX - cropW / 2)));
      const top = Math.max(0, Math.min(srcH - cropH, Math.round((srcH - cropH) / 2)));

      let pipeline = sharp(fix.source, { failOn: 'none' })
        .extract({ left, top, width: cropW, height: cropH })
        .resize(width, height, { fit: 'cover' });

      pipeline = rel.endsWith('.webp')
        ? pipeline.webp({ quality: WEBP_QUALITY })
        : pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });

      const tmp = `${abs}.orient.tmp`;
      await pipeline.toFile(tmp);
      fs.renameSync(tmp, abs);
      console.log(`${rel} → ${width}x${height}`);
      written += 1;
    }
  }

  console.log(`Done: ${written} file(s) rebuilt, ${skipped} skipped.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
