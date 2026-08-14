import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImageBuffer = (buffer: Buffer): Promise<string> =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: "arenax/avatars", resource_type: "image" }, (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve(result.secure_url);
      })
      .end(buffer);
  });
