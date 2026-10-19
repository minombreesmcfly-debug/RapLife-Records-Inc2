// Sanitize invalid or placeholder environment variables before other modules load
if (typeof process !== 'undefined' && process.env) {
  if (process.env.CLOUDINARY_URL) {
    const cUrl = process.env.CLOUDINARY_URL.trim();
    if (
      !cUrl.startsWith('cloudinary://') ||
      cUrl.includes('<your_api_key>') ||
      cUrl.includes('<your_api_secret>')
    ) {
      delete process.env.CLOUDINARY_URL;
    }
  }

  if (process.env.CLOUDINARY_API_KEY) {
    const key = process.env.CLOUDINARY_API_KEY.trim();
    if (key.includes('<your_api_key>') || key.startsWith('CLOUDINARY_URL=')) {
      delete process.env.CLOUDINARY_API_KEY;
    }
  }
}

export {};
