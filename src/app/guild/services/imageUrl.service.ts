/**
 * Utility functions for resolving image URLs to different quality tiers.
 * Used across components to map original image paths to their
 * display (compressed) or thumbnail variants.
 */

/**
 * Computes the thumbnail URL from a full-size image URL.
 * Inserts `/thumbs/` before the filename.
 * @param fullUrl - The original image URL.
 * @returns The corresponding thumbnail URL.
 * @example
 * toThumbUrl('assets/images/kaelen/profile-800x600.jpg')
 * // → 'assets/images/kaelen/thumbs/profile-800x600.jpg'
 */
export function toThumbUrl(fullUrl: string): string {
  const lastSlash = fullUrl.lastIndexOf('/');
  if (lastSlash === -1) {
    return `thumbs/${fullUrl}`;
  }
  return `${fullUrl.substring(0, lastSlash)}/thumbs${fullUrl.substring(lastSlash)}`;
}

/**
 * Computes the display-quality URL from a full-size image URL.
 * Inserts `/display/` before the filename. PNGs are mapped to JPG
 * since the display generation script converts PNGs to JPG.
 * @param fullUrl - The original image URL.
 * @returns The corresponding display-quality URL.
 * @example
 * toDisplayUrl('assets/images/kaelen/profile-800x600.jpg')
 * // → 'assets/images/kaelen/display/profile-800x600.jpg'
 * toDisplayUrl('assets/images/group/allStanding.jpg')
 * // → 'assets/images/group/display/allStanding.jpg'
 */
export function toDisplayUrl(fullUrl: string): string {
  const lastSlash = fullUrl.lastIndexOf('/');
  const prefix = lastSlash === -1 ? '' : fullUrl.substring(0, lastSlash);
  const fileName = lastSlash === -1 ? fullUrl : fullUrl.substring(lastSlash + 1);
  const displayFileName = fileName.replace(/\.png$/i, '.jpg');
  const separator = prefix === '' ? '' : '/';
  return `${prefix}${separator}display/${displayFileName}`;
}
