import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey?: string;
  apiSecret?: string;
  uploadPreset?: string;
}

export const DEFAULT_CLOUDINARY_CONFIG: CloudinaryConfig = {
  cloudName: 'rmyvnech',
  apiKey: '',
  apiSecret: 'XDWRGIqsyiQYfs4qCwCQaHJ12po',
  uploadPreset: ''
};

// Cached config in memory
let cachedConfig: CloudinaryConfig | null = null;

// SHA-1 helper using native browser Web Crypto API
async function computeSha1(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Resolves current Cloudinary configuration from Firestore, env vars, and defaults
 */
export async function getCloudinaryConfig(): Promise<CloudinaryConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  // 1. Start with hardcoded defaults
  const resolved: CloudinaryConfig = { ...DEFAULT_CLOUDINARY_CONFIG };

  // 2. Override with Vite env vars if present
  try {
    const metaEnv = (import.meta as any).env || {};
    if (metaEnv.VITE_CLOUDINARY_CLOUD_NAME) resolved.cloudName = metaEnv.VITE_CLOUDINARY_CLOUD_NAME;
    if (metaEnv.VITE_CLOUDINARY_API_KEY) resolved.apiKey = metaEnv.VITE_CLOUDINARY_API_KEY;
    if (metaEnv.VITE_CLOUDINARY_API_SECRET) resolved.apiSecret = metaEnv.VITE_CLOUDINARY_API_SECRET;
    if (metaEnv.VITE_CLOUDINARY_UPLOAD_PRESET) resolved.uploadPreset = metaEnv.VITE_CLOUDINARY_UPLOAD_PRESET;
  } catch (_) {}

  // 3. Override with Firestore config document if available
  try {
    const docSnap = await getDoc(doc(db, 'config', 'cloudinary'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.cloudName) resolved.cloudName = data.cloudName.trim();
      if (data.apiKey) resolved.apiKey = data.apiKey.trim();
      if (data.apiSecret) resolved.apiSecret = data.apiSecret.trim();
      if (data.uploadPreset) resolved.uploadPreset = data.uploadPreset.trim();
    }
  } catch (err) {
    console.warn('[CLOUDINARY] Could not fetch config from Firestore, using env/defaults:', err);
  }

  cachedConfig = resolved;
  return resolved;
}

/**
 * Saves updated Cloudinary configuration to Firestore
 */
export async function saveCloudinaryConfig(cfg: Partial<CloudinaryConfig>): Promise<void> {
  const current = await getCloudinaryConfig();
  const updated: CloudinaryConfig = {
    cloudName: (cfg.cloudName || current.cloudName || DEFAULT_CLOUDINARY_CONFIG.cloudName).trim(),
    apiKey: (cfg.apiKey !== undefined ? cfg.apiKey : current.apiKey || '').trim(),
    apiSecret: (cfg.apiSecret !== undefined ? cfg.apiSecret : current.apiSecret || DEFAULT_CLOUDINARY_CONFIG.apiSecret).trim(),
    uploadPreset: (cfg.uploadPreset !== undefined ? cfg.uploadPreset : current.uploadPreset || '').trim()
  };

  await setDoc(doc(db, 'config', 'cloudinary'), {
    ...updated,
    updatedAt: serverTimestamp()
  }, { merge: true });

  cachedConfig = updated;
}

export interface UploadOptions {
  folder?: string;
  resourceType?: 'auto' | 'video' | 'image' | 'raw';
  onProgress?: (percent: number) => void;
  tags?: string[];
}

export interface CloudinaryUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  format?: string;
  duration?: number;
  bytes?: number;
  resource_type?: string;
}

/**
 * Uploads a file (audio, image, video) to Cloudinary.
 * Strategy:
 * 1. Try server-side endpoint `/api/cloudinary-upload` first (if backend is active)
 * 2. If client-side (e.g. deployed on Vercel):
 *    a) If uploadPreset is defined, perform direct unsigned upload
 *    b) If apiKey & apiSecret are defined, perform direct client signed upload with SHA-1
 */
export async function uploadToCloudinary(
  file: File | Blob, 
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const resourceType = options.resourceType || 'auto';
  const folder = options.folder || 'raplife_records';

  // 1. Try server endpoint first if available
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('resourceType', resourceType);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const serverRes = await fetch('/api/cloudinary-upload', {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (serverRes.ok) {
      const ct = serverRes.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const result = await serverRes.json();
        if (result && result.secure_url) {
          console.log('[CLOUDINARY] Upload succeeded via server proxy:', result.secure_url);
          if (options.onProgress) options.onProgress(100);
          return result;
        }
      }
    }
  } catch (serverErr) {
    console.warn('[CLOUDINARY] Server upload route unavailable or failed, falling back to direct upload:', serverErr);
  }

  // 2. Direct client-side upload to Cloudinary CDN
  const config = await getCloudinaryConfig();
  const cloudName = config.cloudName || DEFAULT_CLOUDINARY_CONFIG.cloudName;
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  console.log(`[CLOUDINARY] Attempting direct client upload to cloud: ${cloudName} (${resourceType})...`);

  // Direct upload option A: Unsigned with upload_preset
  if (config.uploadPreset && config.uploadPreset.trim() !== '') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', config.uploadPreset.trim());
    if (folder) formData.append('folder', folder);

    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      console.log('[CLOUDINARY] Direct unsigned upload succeeded:', data.secure_url);
      if (options.onProgress) options.onProgress(100);
      return data;
    } else {
      const errData = await res.json().catch(() => ({}));
      console.warn('[CLOUDINARY] Unsigned upload failed:', errData);
      // Fall through to signed attempt
    }
  }

  // Direct upload option B: Signed with apiKey + apiSecret
  if (config.apiKey && config.apiSecret && config.apiKey.trim() !== '' && config.apiSecret.trim() !== '') {
    const timestamp = Math.round(Date.now() / 1000);
    
    // Sort parameters alphabetically to calculate Cloudinary signature
    // folder=${folder}&timestamp=${timestamp}${apiSecret}
    let paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = await computeSha1(paramsToSign + config.apiSecret.trim());

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', config.apiKey.trim());
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', folder);

    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      console.log('[CLOUDINARY] Direct signed client upload succeeded:', data.secure_url);
      if (options.onProgress) options.onProgress(100);
      return data;
    } else {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Error de subida a Cloudinary (${res.status})`);
    }
  }

  // If no apiKey was supplied, attempt standard presets or guide user
  const fallbackPresets = ['raplife_unsigned', 'ml_default', 'unsigned'];
  for (const preset of fallbackPresets) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', preset);
      if (folder) formData.append('folder', folder);

      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[CLOUDINARY] Direct upload succeeded using preset "${preset}":`, data.secure_url);
        if (options.onProgress) options.onProgress(100);
        return data;
      }
    } catch (_) {}
  }

  throw new Error(
    'Falta configurar la API Key de Cloudinary o un Upload Preset en el Panel de Administración > Cloudinary para permitir subidas directas desde Vercel.'
  );
}

/**
 * Diagnostic test for Cloudinary credentials
 */
export async function testCloudinaryConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const config = await getCloudinaryConfig();

    // Create a tiny 1x1 transparent GIF blob for testing
    const testBlob = new Blob(
      [new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b])],
      { type: 'image/gif' }
    );

    const result = await uploadToCloudinary(testBlob, {
      folder: 'raplife_test',
      resourceType: 'image'
    });

    return {
      success: true,
      message: `¡Conexión a Cloudinary exitosa! Nube: "${config.cloudName}". Archivo de prueba verificado.`,
      details: result
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error al conectar con Cloudinary.'
    };
  }
}
