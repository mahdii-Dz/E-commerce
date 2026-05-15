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

// Delete — unchanged, should work fine
CloudinaryRouter.delete("/delete/:publicId", verifyAdminSession, async (req, res) => {
  try {
    const result = await cloudinary.uploader.destroy(req.params.publicId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default CloudinaryRouter;