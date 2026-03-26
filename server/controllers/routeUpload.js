import express from "express";
import upload from "../middleware/multer.js";
import cloudinary from "../utils/cloudinary.js";
import { verifyAdminSession } from "../middleware/sessionAuth.js";

const CloudinaryRouter = express.Router();

// All cloudinary operations require admin authentication
CloudinaryRouter.post("/upload", verifyAdminSession, upload.single("image"), function (req, res) {
  cloudinary.uploader.upload(req.file.path, function (err, result) {
    if (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: "Error",
      });
    }
    const resonseData = {
      url: result.secure_url,
      public_id: result.public_id,
    };
    res.status(200).json({
      success: true,
      message: "Uploaded!",
      data: resonseData,
    });
  });
});

CloudinaryRouter.delete("/delete/:publicId", verifyAdminSession, async (req, res) => {
  try {
    const result = await cloudinary.uploader.destroy(req.params.publicId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default CloudinaryRouter;
