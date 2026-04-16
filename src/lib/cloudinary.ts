/**
 * Cloudinary Utility — Direct upload from frontend
 *
 * Users upload images directly to Cloudinary, bypassing the backend.
 * Backend only receives the secure_url for storage.
 */

const CLOUDINARY_CLOUD_NAME = "dzqtdl5aa";
const CLOUDINARY_UPLOAD_PRESET = "cars-g-uploads";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

/**
 * Upload an image file directly to Cloudinary
 * @param file - The File object to upload
 * @returns Promise with secure_url or error
 */
export async function uploadToCloudinary(
  file: File
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "Only image files are allowed" };
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: "File size must be less than 10MB" };
    }

    // Create FormData for unsigned upload
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "bantay-reports");

    // Optional: respect image quality and format optimization
    formData.append("quality", "auto");
    formData.append("fetch_format", "auto");

    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Upload failed" }));
      return { success: false, error: error.error?.message || "Upload failed" };
    }

    const data: CloudinaryUploadResponse = await response.json();

    // Validate response
    if (!data.secure_url) {
      return { success: false, error: "No URL returned from Cloudinary" };
    }

    console.log("[Cloudinary] Upload successful:", data.public_id);
    return { success: true, url: data.secure_url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Cloudinary] Upload error:", err);
    return { success: false, error: `Upload error: ${msg}` };
  }
}

/**
 * Validate that a URL is from Cloudinary (basic check)
 * @param url - The URL to validate
 * @returns true if URL appears to be from Cloudinary
 */
export function isCloudinaryUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes("cloudinary.com") || urlObj.hostname.includes("res.cloudinary.com");
  } catch {
    return false;
  }
}
