/**
 * Shrink heavy embed assets for faster loads (run locally before deploy).
 *
 * Images (default): requires `sharp`. Downscales images larger than MAX_EDGE on the
 * longest side; JPEG ~quality 82; PNG/WebP recompressed. Skips files under MIN_BYTES.
 *
 * Video (--video): requires ffmpeg. Re-encodes .mp4 (H.264, CRF 26, max width 1280,
 * +faststart). Drops audio for smaller files (clips are shown muted on site). Writes
 * *.opt.mp4 next to the original — review, then replace if acceptable.
 *
 *   npm run optimize-media                 # images only
 *   npm run optimize-media -- --video      # images then videos (needs ffmpeg)
 *   npm run optimize-media -- --video-only # videos only (after images already done)
 *   npm run optimize-video                 # same as --video-only
 *   npm run optimize-video -- --force      # rebuild *.opt.mp4 even if they already exist
 *
 * Shell tip (zsh): `ls *.opt.mp4` errors if none exist — use:
 *   find embed/images -name '*.opt.mp4'
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const EMBED_IMAGES = path.join(ROOT, 'embed/images');

const ARGS = process.argv.slice(2);
const SKIP_IMAGES = ARGS.includes('--video-only');
const DO_VIDEO = ARGS.includes('--video') || SKIP_IMAGES;
const FORCE_VIDEO_REENCODE = ARGS.includes('--force');

const MAX_EDGE = 1920;
const JPEG_QUALITY = 82;
const MIN_BYTES = 80 * 1024;

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

/** Works when GUI Terminal has brew in PATH and Cursor/agent shell does not. */
function resolveFfmpegBin() {
  const envPath = process.env.FFMPEG_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;
  const candidates = ['ffmpeg', '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
  for (const bin of candidates) {
    try {
      execFileSync(bin, ['-hide_banner', '-version'], { stdio: 'ignore' });
      return bin;
    } catch {
      /* try next */
    }
  }
  return null;
}

function ffmpegAvailable() {
  return resolveFfmpegBin() !== null;
}

async function optimizeImages(sharp) {
  const files = walkFiles(EMBED_IMAGES).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  let ok = 0;
  let skip = 0;

  for (const abs of files) {
    const before = fs.statSync(abs).size;
    if (before < MIN_BYTES) {
      skip += 1;
      continue;
    }
    const tmp = abs + '.tmp-opt';
    const ext = path.extname(abs).toLowerCase();

    try {
      let pipeline = sharp(abs).rotate();
      const meta = await pipeline.metadata();
      const w = meta.width || 0;
      const h = meta.height || 0;
      const big = w > MAX_EDGE || h > MAX_EDGE;
      if (big) {
        pipeline = pipeline.resize({
          width: MAX_EDGE,
          height: MAX_EDGE,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      if (ext === '.png') {
        await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(tmp);
      } else if (ext === '.webp') {
        await pipeline.webp({ quality: 80, effort: 4 }).toFile(tmp);
      } else {
        await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(tmp);
      }

      const after = fs.statSync(tmp).size;
      if (after < before || big) {
        fs.renameSync(abs, abs + '.bak');
        fs.renameSync(tmp, abs);
        try {
          fs.unlinkSync(abs + '.bak');
        } catch {
          /* keep .bak if needed */
        }
        ok += 1;
        console.log(
          path.relative(ROOT, abs),
          `${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB`
        );
      } else {
        fs.unlinkSync(tmp);
        skip += 1;
      }
    } catch (e) {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      console.warn('Skip', path.relative(ROOT, abs), String(e.message || e));
      skip += 1;
    }
  }

  console.log(`Images done: ${ok} optimized, ${skip} skipped.`);
}

function optimizeVideos() {
  if (!DO_VIDEO) return;
  if (!ffmpegAvailable()) {
    console.log(`
Video: ffmpeg not installed — no *.opt.mp4 files will be created.

  macOS (Homebrew):  brew install ffmpeg
  Then run again:    npm run optimize-video

Without ffmpeg, browser/video clips stay as-is; only image optimization works.
`);
    return;
  }
  const ff = resolveFfmpegBin();
  if (!ff) return;

  const files = walkFiles(EMBED_IMAGES).filter((f) => /\.mp4$/i.test(f) && !/\.opt\.mp4$/i.test(f));
  let n = 0;
  let skippedExisting = 0;
  let skippedSmall = 0;
  for (const abs of files) {
    const st = fs.statSync(abs).size;
    if (st < 200 * 1024) {
      skippedSmall += 1;
      continue;
    }
    const out = abs.replace(/\.mp4$/i, '.opt.mp4');
    if (fs.existsSync(out) && !FORCE_VIDEO_REENCODE) {
      skippedExisting += 1;
      continue;
    }
    try {
      execFileSync(
        ff,
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-y',
          '-i',
          abs,
          '-an',
          '-c:v',
          'libx264',
          '-crf',
          '26',
          '-preset',
          'medium',
          '-movflags',
          '+faststart',
          '-vf',
          "scale='min(1280,iw)':-2",
          out,
        ],
        { stdio: 'inherit' }
      );
      const st2 = fs.statSync(out).size;
      console.log(path.relative(ROOT, abs), `→ .opt.mp4 (${(st / 1e6).toFixed(1)}MB → ${(st2 / 1e6).toFixed(1)}MB)`);
      n += 1;
    } catch {
      if (fs.existsSync(out)) fs.unlinkSync(out);
      console.warn('ffmpeg failed:', path.relative(ROOT, abs));
    }
  }
  if (n > 0) {
    console.log(`Video: wrote ${n} *.opt.mp4 — review, then replace originals if quality is OK.`);
  } else {
    console.log(
      `Video: wrote 0 new *.opt.mp4 (${skippedExisting} already on disk — use --force to rebuild; ${skippedSmall} mp4 under 200KB skipped).`
    );
  }
}

async function main() {
  if (!SKIP_IMAGES) {
    let sharp;
    try {
      sharp = (await import('sharp')).default;
    } catch {
      console.error('Install sharp for image optimization: npm install');
      process.exit(1);
    }
    await optimizeImages(sharp);
  } else {
    console.log('Images: skipped (--video-only).');
  }
  if (DO_VIDEO) {
    optimizeVideos();
  } else if (!SKIP_IMAGES) {
    console.log(
      'Video: skipped (images-only run). Next: npm run optimize-video   or   npm run optimize-media -- --video   (ffmpeg; mp4 over 200KB → *.opt.mp4). List outputs: find embed/images -name "*.opt.mp4"'
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
