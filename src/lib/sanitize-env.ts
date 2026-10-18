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

// Clean CLOUDINARY_API_KEY if it contains placeholder or URL string
if (process.env.CLOUDINARY_API_KEY) {
  const k = process.env.CLOUDINARY_API_KEY.trim();
  if (k.includes('<your_api_key>') || k.startsWith('CLOUDINARY_URL=') || k.includes('cloudinary://')) {
    console.warn('[ENV] Cleaned invalid/placeholder CLOUDINARY_API_KEY from environment');
    delete process.env.CLOUDINARY_API_KEY;
  }
}

if (process.env.VITE_CLOUDINARY_API_KEY) {
  const k = process.env.VITE_CLOUDINARY_API_KEY.trim();
  if (k.includes('<your_api_key>') || k.startsWith('CLOUDINARY_URL=') || k.includes('cloudinary://')) {
    delete process.env.VITE_CLOUDINARY_API_KEY;
  }
}

export {};
