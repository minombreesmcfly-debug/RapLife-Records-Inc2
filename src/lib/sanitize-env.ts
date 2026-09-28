// Sanitize invalid or placeholder environment variables before other modules load
if (process.env.CLOUDINARY_URL) {
  const cUrl = process.env.CLOUDINARY_URL.trim();
  if (
    !cUrl.startsWith('cloudinary://') ||
    cUrl.includes('<your_api_key>') ||
    cUrl.includes('<your_api_secret>')
  ) {
    console.warn('[ENV] Cleaned invalid/placeholder CLOUDINARY_URL from environment:', cUrl);
    delete process.env.CLOUDINARY_URL;
  }
}

export {};
