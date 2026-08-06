export const R2_PUBLIC_URL = (
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://media.la-maison-dor.store"
).replace(/\/$/, "");

const R2_ORIGIN = new URL(R2_PUBLIC_URL).origin;

const THUMBNAIL_PARAMS = "width=800,height=800,fit=cover,quality=auto,format=webp";

// Cloudinary-style thumbnail via Cloudflare Image Resizing:
// https://<domain>/cdn-cgi/image/width=800,height=800,.../<key>
export const getThumbnailUrl = (url) => {
  if (!url) return "";
  // Idempotent: already-transformed URLs (e.g. legacy thumbnails stored in DB) pass through
  if (url.includes("/cdn-cgi/image/")) return url;
  if (url.startsWith(R2_PUBLIC_URL)) {
    return `${R2_PUBLIC_URL}/cdn-cgi/image/${THUMBNAIL_PARAMS}${url.slice(R2_PUBLIC_URL.length)}`;
  }
  return url;
};

// WebP transform for product page images via Cloudflare Image Resizing:
// https://<domain>/cdn-cgi/image/format=webp,quality=75/<key>
// quality=75 is required: Cloudflare skips WebP conversion when the WebP output
// would be larger than the original (default quality makes flat-graphic PNGs bigger).
// Non-Cloudflare URLs (e.g. legacy Cloudinary) pass through unchanged.
export const getWebpUrl = (url) => {
  if (!url) return "";
  if (url.includes("/cdn-cgi/image/")) return url;
  if (url.startsWith(R2_PUBLIC_URL)) {
    return `${R2_PUBLIC_URL}/cdn-cgi/image/format=webp,quality=75${url.slice(R2_PUBLIC_URL.length)}`;
  }
  return url;
};

// R2 URL -> object key (https://<domain>/uploads/x.jpg -> uploads/x.jpg)
// Handles transformed URLs: https://<domain>/cdn-cgi/image/<params>/uploads/x.jpg -> uploads/x.jpg
// Falls back to legacy Cloudinary public_id parsing for pre-migration records.
export const extractKeyFromUrl = (url) => {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.origin === R2_ORIGIN) {
      let path = parsed.pathname.slice(1);
      const cdnMarker = "cdn-cgi/image/";
      if (path.startsWith(cdnMarker)) {
        const afterMarker = path.slice(cdnMarker.length);
        const paramsEnd = afterMarker.indexOf("/");
        path = paramsEnd !== -1 ? afterMarker.slice(paramsEnd + 1) : "";
      }
      return path;
    }

    const uploadIdx = url.indexOf("/upload/");
    if (uploadIdx === -1) return null;
    let afterUpload = url.slice(uploadIdx + 8);
    afterUpload = afterUpload.replace(/^v\d+\//, "");
    const lastDot = afterUpload.lastIndexOf(".");
    return lastDot !== -1 ? afterUpload.slice(0, lastDot) : afterUpload;
  } catch {
    return null;
  }
};
