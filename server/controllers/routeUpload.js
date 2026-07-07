import express from "express";
import upload from "../middleware/multer.js";
import cloudinary from "../utils/cloudinary.js";
import { verifyAdminSession } from "../middleware/sessionAuth.js";

const CloudinaryRouter = express.Router();

// Upload — use buffer instead of file path
CloudinaryRouter.post("/upload", verifyAdminSession, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Use upload_stream with buffer for serverless compatibility
    const uploadPromise = new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "auto" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const result = await uploadPromise;

    res.status(200).json({
      success: true,
      message: "Uploaded!",
      data: {
        url: result.secure_url,
        public_id: result.public_id,
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

const extractPublicIdFromCloudinaryUrl = (input) => {
  if (!input || typeof input !== "string") return null;

  // If it's already not a URL, keep as-is
  if (!/^https?:\/\//i.test(input)) return input;

  // Example Cloudinary image URL patterns:
  // https://res.cloudinary.com/<cloud>/image/upload/v<version>/<public_id>.<format>
  // https://res.cloudinary.com/<cloud>/image/upload/<public_id>.<format>
  // Also might include transformations: /image/upload/w_300,h_300,.../<public_id>.<format>
  try {
    const url = new URL(input);
    const parts = url.pathname.split("/").filter(Boolean);

    // Find the index of "upload" (or "auto_upload")
    const uploadIdx = parts.lastIndexOf("upload");
    if (uploadIdx === -1) return null;

    // Everything after "upload" — includes version (v123456), folders, and filename
    const afterUpload = parts.slice(uploadIdx + 1);

    // Remove the version segment (e.g., v123456) if present
    const versionRegex = /^v\d+$/;
    const publicIdParts = afterUpload.filter(p => !versionRegex.test(p));

    // Reconstruct the full path and strip the file extension
    const fullPath = publicIdParts.join("/");
    const lastDot = fullPath.lastIndexOf(".");
    return lastDot > 0 ? fullPath.substring(0, lastDot) : fullPath;
  } catch {
    return null;
  }
};

// Delete
CloudinaryRouter.delete("/delete/:publicId", verifyAdminSession, async (req, res) => {
  try {
    const raw = req.params.publicId;
    const publicId = extractPublicIdFromCloudinaryUrl(raw);

    if (!publicId) {
      return res.status(400).json({ success: false, error: "Missing public_id" });
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default CloudinaryRouter;

