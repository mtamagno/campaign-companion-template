/**
 * Generate thumbnail images for the gallery.
 *
 * Scans `src/campaigns/{campaign}/images/` recursively for image files (png, jpg, jpeg, webp)
 * and creates 300px-wide thumbnails in a `thumbs/` subfolder next to each source.
 *
 * Incremental: only regenerates a thumbnail when the source file is newer
 * than the existing thumbnail (compares mtime). Skips non-image files and
 * existing `thumbs/` directories during the scan.
 *
 * Usage: node scripts/generate-thumbnails.cjs
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const CAMPAIGNS_ROOT = path.join(__dirname, '..', 'src', 'campaigns');
const THUMB_DIR_NAME = 'thumbs';
const THUMB_WIDTH = 300;
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;
const PNG_COMPRESSION = 6;
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

/**
 * Recursively collects all image file paths under the given directory,
 * skipping `thumbs/` subdirectories.
 * @param {string} dir - Directory to scan.
 * @returns {string[]} Array of absolute image file paths.
 */
function collectImagePaths(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === THUMB_DIR_NAME) {
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
 * Checks whether the thumbnail needs to be regenerated.
 * Returns true if the thumb doesn't exist or the source is newer.
 * @param {string} sourcePath - Absolute path to the source image.
 * @param {string} thumbPath - Absolute path to the thumbnail.
 * @returns {boolean}
 */
function needsRegeneration(sourcePath, thumbPath) {
  if (!fs.existsSync(thumbPath)) {
    return true;
  }

  const sourceStat = fs.statSync(sourcePath);
  const thumbStat = fs.statSync(thumbPath);
  return sourceStat.mtimeMs > thumbStat.mtimeMs;
}

/**
 * Generates a thumbnail for a single image file.
 * @param {string} sourcePath - Absolute path to the source image.
 * @param {string} thumbPath - Absolute path to write the thumbnail.
 * @returns {Promise<void>}
 */
async function generateThumbnail(sourcePath, thumbPath) {
  const ext = path.extname(sourcePath).toLowerCase();
  let pipeline = sharp(sourcePath).resize({ width: THUMB_WIDTH, withoutEnlargement: true });

  if (ext === '.jpg' || ext === '.jpeg') {
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY });
  } else if (ext === '.webp') {
    pipeline = pipeline.webp({ quality: WEBP_QUALITY });
  } else if (ext === '.png') {
    pipeline = pipeline.png({ compressionLevel: PNG_COMPRESSION });
  }

  await pipeline.toFile(thumbPath);
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
      const thumbDir = path.join(sourceDir, THUMB_DIR_NAME);
      const thumbPath = path.join(thumbDir, fileName);

      if (!needsRegeneration(sourcePath, thumbPath)) {
        totalSkipped++;
        continue;
      }

      if (!fs.existsSync(thumbDir)) {
        fs.mkdirSync(thumbDir, { recursive: true });
      }

      console.log(`  Generating: ${path.relative(imagesRoot, thumbPath)}`);
      await generateThumbnail(sourcePath, thumbPath);
      totalGenerated++;
    }
  }

  console.log(`Done. Generated: ${totalGenerated}, Skipped (up-to-date): ${totalSkipped}`);
}

main().catch((err) => {
  console.error('Thumbnail generation failed:', err);
  process.exit(1);
});
