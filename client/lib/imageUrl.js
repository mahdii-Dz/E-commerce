export const R2_PUBLIC_URL = (
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://media.la-maison-dor.store"
).replace(/\/$/, "");

const R2_ORIGIN = new URL(R2_PUBLIC_URL).origin;

const THUMBNAIL_PARAMS = "width=800,height=800,fit=cover,quality=auto,format=auto";

// Cloudinary-style thumbnail via Cloudflare Image Resizing:
// https://<domain>/cdn-cgi/image/width=800,height=800,.../<key>
export const getThumbnailUrl = (url) => {
  if (!url) return "";
  if (url.startsWith(R2_PUBLIC_URL)) {
    return `${R2_PUBLIC_URL}/cdn-cgi/image/${THUMBNAIL_PARAMS}${url.slice(R2_PUBLIC_URL.length)}`;
  }
  return url;
};

// R2 URL -> object key (https://<domain>/uploads/x.jpg -> uploads/x.jpg)
// Falls back to legacy Cloudinary public_id parsing for pre-migration records.
export const extractKeyFromUrl = (url) => {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.origin === R2_ORIGIN) return parsed.pathname.slice(1);

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
