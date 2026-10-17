/**
 * Generate display-quality images for non-gallery usage (cards, hero sections, detail pages).
 *
 * Scans `src/campaigns/{campaign}/images/` recursively for image files (png, jpg, jpeg, webp)
 * and creates compressed display versions in a `display/` subfolder next to each source.
 *
 * Display images are optimized for on-screen viewing at card/hero sizes:
 * - Profiles (800x600): resized to max 800px width
 * - Portraits (1024x1536): resized to max 1024px width
 * - Other images: resized to max 1024px width
 * - All PNGs are converted to JPG for smaller file sizes
 * - Target: every display image under 700KB
 *
 * Incremental: only regenerates when the source file is newer than the existing
 * display version (compares mtime). Skips `thumbs/` and `display/` directories.
 *
 * Usage: node scripts/generate-display-images.cjs
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const CAMPAIGNS_ROOT = path.join(__dirname, '..', 'src', 'campaigns');
const DISPLAY_DIR_NAME = 'display';
const SKIP_DIRS = new Set(['thumbs', 'display', 'placeholders']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const JPEG_QUALITY = 75;
const WEBP_QUALITY = 75;
const MAX_FILE_SIZE_BYTES = 700 * 1024;
const MAX_WIDTH_DEFAULT = 1024;

/**
 * Recursively collects all image file paths under the given directory,
 * skipping `thumbs/`, `display/`, and `placeholders/` subdirectories.
 * @param {string} dir - Directory to scan.
 * @returns {string[]} Array of absolute image file paths.
 */
function collectImagePaths(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...collectImagePaths(fullPath));
    } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Determines the output filename for a display image.
 * PNGs are converted to JPG, other formats keep their extension.
 * @param {string} sourceFileName - Original file name.
 * @returns {string} Display file name.
 */
function toDisplayFileName(sourceFileName) {
  const ext = path.extname(sourceFileName).toLowerCase();
  if (ext === '.png') {
    return sourceFileName.replace(/\.png$/i, '.jpg');
  }
  return sourceFileName;
}

/**
 * Checks whether the display image needs to be regenerated.
 * Returns true if the display file doesn't exist or the source is newer.
 * @param {string} sourcePath - Absolute path to the source image.
 * @param {string} displayPath - Absolute path to the display image.
 * @returns {boolean}
 */
function needsRegeneration(sourcePath, displayPath) {
  if (!fs.existsSync(displayPath)) {
    return true;
  }

  const sourceStat = fs.statSync(sourcePath);
  const displayStat = fs.statSync(displayPath);
  return sourceStat.mtimeMs > displayStat.mtimeMs;
}

/**
 * Generates a display-quality image from a source file.
 * Resizes to max width and compresses. PNGs are converted to JPG.
 * If the result exceeds the size limit, retries with lower quality.
 * @param {string} sourcePath - Absolute path to the source image.
 * @param {string} displayPath - Absolute path to write the display image.
 * @returns {Promise<void>}
 */
async function generateDisplayImage(sourcePath, displayPath) {
  const ext = path.extname(sourcePath).toLowerCase();
  const isPng = ext === '.png';

  let pipeline = sharp(sourcePath).resize({
    width: MAX_WIDTH_DEFAULT,
    withoutEnlargement: true,
  });

  if (isPng || ext === '.jpg' || ext === '.jpeg') {
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
  } else if (ext === '.webp') {
    pipeline = pipeline.webp({ quality: WEBP_QUALITY });
  }

  await pipeline.toFile(displayPath);

  // If still over the size limit, retry with progressively lower quality
  const stat = fs.statSync(displayPath);
  if (stat.size > MAX_FILE_SIZE_BYTES) {
    let quality = JPEG_QUALITY - 10;
    while (quality >= 40 && stat.size > MAX_FILE_SIZE_BYTES) {
      pipeline = sharp(sourcePath).resize({
        width: MAX_WIDTH_DEFAULT,
        withoutEnlargement: true,
      });

      if (isPng || ext === '.jpg' || ext === '.jpeg') {
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      } else if (ext === '.webp') {
        pipeline = pipeline.webp({ quality });
      }

      await pipeline.toFile(displayPath);
      const newStat = fs.statSync(displayPath);
      if (newStat.size <= MAX_FILE_SIZE_BYTES) {
        break;
      }
      quality -= 10;
    }
  }
}

async function main() {
  const campaignDirs = fs
    .readdirSync(CAMPAIGNS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(CAMPAIGNS_ROOT, d.name, 'images'))
    .filter((p) => fs.existsSync(p));

  let totalGenerated = 0;
  let totalSkipped = 0;

  for (const imagesRoot of campaignDirs) {
    console.log('Scanning for images in', imagesRoot);
    const imagePaths = collectImagePaths(imagesRoot);
    console.log(`Found ${imagePaths.length} image(s).`);

    for (const sourcePath of imagePaths) {
      const sourceDir = path.dirname(sourcePath);
      const fileName = path.basename(sourcePath);
      const displayDir = path.join(sourceDir, DISPLAY_DIR_NAME);
      const displayFileName = toDisplayFileName(fileName);
      const displayPath = path.join(displayDir, displayFileName);

      if (!needsRegeneration(sourcePath, displayPath)) {
        totalSkipped++;
        continue;
      }

      if (!fs.existsSync(displayDir)) {
        fs.mkdirSync(displayDir, { recursive: true });
      }

      const relativePath = path.relative(imagesRoot, displayPath);
      console.log(`  Generating: ${relativePath}`);
      await generateDisplayImage(sourcePath, displayPath);

      const finalSize = fs.statSync(displayPath);
      const sizeKB = Math.round(finalSize.size / 1024);
      console.log(`    → ${sizeKB} KB`);
      totalGenerated++;
    }
  }

  console.log(`\nDone. Generated: ${totalGenerated}, Skipped (up-to-date): ${totalSkipped}`);
}

main().catch((err) => {
  console.error('Display image generation failed:', err);
  process.exit(1);
});
