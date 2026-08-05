import express from "express";
import upload from "../middleware/multer.js";
import { uploadImage, deleteImage, publicUrl } from "../utils/r2.js";
import { verifyAdminSession } from "../middleware/sessionAuth.js";

const CloudinaryRouter = express.Router();

const r2Origin = new URL(publicUrl).origin;

const extractLegacyCloudinaryPublicId = (url) => {
  // Legacy Cloudinary URL patterns:
  // https://res.cloudinary.com/<cloud>/image/upload/v<version>/<public_id>.<format>
  // https://res.cloudinary.com/<cloud>/image/upload/<public_id>.<format>
  // May include transformations: /image/upload/w_300,h_300,.../<public_id>.<format>
  const parts = url.pathname.split("/").filter(Boolean);

  const uploadIdx = parts.lastIndexOf("upload");
  if (uploadIdx === -1) return null;

  const afterUpload = parts.slice(uploadIdx + 1);
  const publicIdParts = afterUpload.filter((p) => !/^v\d+$/.test(p));

  const fullPath = publicIdParts.join("/");
  const lastDot = fullPath.lastIndexOf(".");
  return lastDot > 0 ? fullPath.substring(0, lastDot) : fullPath;
};

const extractKeyFromInput = (input) => {
  if (!input || typeof input !== "string") return null;

  // Already a raw object key (no scheme)
  if (!/^https?:\/\//i.test(input)) return input;

  try {
    const url = new URL(input);

    // R2 public URL: https://<domain>/uploads/xxx.jpg -> key = pathname without leading slash
    if (url.origin === r2Origin) {
      return url.pathname.slice(1);
    }

    // Legacy Cloudinary URL: fall back to old parsing (delete will no-op on R2)
    return extractLegacyCloudinaryPublicId(url);
  } catch {
    return null;
  }
};

// Upload — buffer is streamed straight to R2 (serverless-friendly)
CloudinaryRouter.post("/upload", verifyAdminSession, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { key, url } = await uploadImage(req.file.buffer, req.file.mimetype, req.file.originalname);

    res.status(200).json({
      success: true,
      message: "Uploaded!",
      data: {
        url,
        public_id: key,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Upload failed",
      error: err.message,
    });
  }
});

// Delete
CloudinaryRouter.delete("/delete/:publicId", verifyAdminSession, async (req, res) => {
  try {
    const key = extractKeyFromInput(decodeURIComponent(req.params.publicId));

    if (!key) {
      return res.status(400).json({ success: false, error: "Missing object key" });
    }

    try {
      await deleteImage(key);
    } catch (err) {
      if (err.name === "NoSuchKey") {
        console.log(`R2 object not found (possibly a legacy Cloudinary asset): ${key}`);
        return res.status(404).json({ success: false, error: "Object not found" });
      }
      throw err;
    }

    return res.json({ success: true, message: "Deleted!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default CloudinaryRouter;
