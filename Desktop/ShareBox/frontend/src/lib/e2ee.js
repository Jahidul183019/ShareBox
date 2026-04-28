const KEY_CACHE = new Map();
const KDF_ITERATIONS = 210000;
const KDF_HASH = 'SHA-256';
const KEY_LENGTH_BITS = 256;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64Url(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(input) {
  if (!input || typeof input !== 'string') return null;
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  try {
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  } catch {
    return null;
  }
}

function randomIv() {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv;
}

export function normalizeRoomSecret(input) {
  if (!input || typeof input !== 'string') return '';
  let value = input.trim();
  if (!value) return '';
  if (value.startsWith('#')) value = value.slice(1);
  if (value.startsWith('k=')) value = value.slice(2);
  value = decodeURIComponent(value).trim();
  return value;
}

export function generateRoomSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export function extractRoomSecretFromHash(hash) {
  const raw = (hash || '').replace(/^#/, '').trim();
  if (!raw) return '';
  const params = new URLSearchParams(raw);
  const fromParam = normalizeRoomSecret(params.get('k') || '');
  if (fromParam) return fromParam;
  return normalizeRoomSecret(raw);
}

export function buildRoomHash(secret) {
  const normalized = normalizeRoomSecret(secret);
  return normalized ? `#k=${encodeURIComponent(normalized)}` : '';
}

async function getAesKey(roomCode, roomSecret) {
  const normalized = normalizeRoomSecret(roomSecret);
  if (!normalized) throw new Error('Missing encryption secret');
  const cacheKey = `${roomCode}:${normalized}`;
  if (KEY_CACHE.has(cacheKey)) return KEY_CACHE.get(cacheKey);

  const secretBytes = textEncoder.encode(normalized);
  const saltBytes = textEncoder.encode(`sharebox-room:${String(roomCode || '').toUpperCase()}`);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: KDF_ITERATIONS,
      hash: KDF_HASH,
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt']
  );

  KEY_CACHE.set(cacheKey, aesKey);
  return aesKey;
}

async function encryptBytes(bytes, roomCode, roomSecret) {
  const key = await getAesKey(roomCode, roomSecret);
  const iv = randomIv();
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  return {
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(encrypted)),
  };
}

async function decryptBytes(ciphertextB64, ivB64, roomCode, roomSecret) {
  const key = await getAesKey(roomCode, roomSecret);
  const iv = base64UrlToBytes(ivB64);
  const ciphertext = base64UrlToBytes(ciphertextB64);
  if (!iv || !ciphertext || iv.length !== 12) throw new Error('Bad encrypted payload');
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new Uint8Array(clear);
}

export async function encryptTextPayload(text, roomCode, roomSecret) {
  const encrypted = await encryptBytes(textEncoder.encode(String(text || '')), roomCode, roomSecret);
  return JSON.stringify({
    v: 1,
    kind: 'e2ee_text',
    iv: encrypted.iv,
    ct: encrypted.ciphertext,
  });
}

export async function decryptTextPayload(payload, roomCode, roomSecret) {
  let envelope;
  try {
    envelope = JSON.parse(payload);
  } catch {
    // Backward-compatibility for old non-encrypted messages.
    return payload;
  }

  if (!envelope || envelope.kind !== 'e2ee_text' || envelope.v !== 1) {
    return payload;
  }

  const clearBytes = await decryptBytes(envelope.ct, envelope.iv, roomCode, roomSecret);
  return textDecoder.decode(clearBytes);
}

export async function encryptFileForUpload(file, roomCode, roomSecret) {
  const plainBytes = new Uint8Array(await file.arrayBuffer());
  const encryptedFile = await encryptBytes(plainBytes, roomCode, roomSecret);
  const metadata = {
    filename: file.name || 'file',
    mime: file.type || 'application/octet-stream',
    size: file.size || plainBytes.byteLength,
  };
  const encryptedMeta = await encryptBytes(
    textEncoder.encode(JSON.stringify(metadata)),
    roomCode,
    roomSecret
  );

  const encryptedFileBytes = base64UrlToBytes(encryptedFile.ciphertext);
  const uploadFile = new File(
    [encryptedFileBytes],
    `${(file.name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_')}.sbx`,
    { type: 'application/octet-stream' }
  );

  return {
    uploadFile,
    fileIv: encryptedFile.iv,
    metaIv: encryptedMeta.iv,
    metaCt: encryptedMeta.ciphertext,
  };
}

export function buildEncryptedMediaEnvelope(url, fileIv, metaIv, metaCt) {
  return JSON.stringify({
    v: 1,
    kind: 'e2ee_media',
    url,
    file_iv: fileIv,
    meta_iv: metaIv,
    meta_ct: metaCt,
  });
}

export async function decryptMediaEnvelope(payload, roomCode, roomSecret) {
  let envelope;
  try {
    envelope = JSON.parse(payload);
  } catch {
    return null;
  }

  if (!envelope || envelope.kind !== 'e2ee_media' || envelope.v !== 1) return null;
  const metaBytes = await decryptBytes(envelope.meta_ct, envelope.meta_iv, roomCode, roomSecret);

  let metadata;
  try {
    metadata = JSON.parse(textDecoder.decode(metaBytes));
  } catch {
    metadata = null;
  }

  if (!metadata || typeof metadata !== 'object') throw new Error('Invalid media metadata');

  return {
    url: envelope.url,
    fileIv: envelope.file_iv,
    filename: metadata.filename || 'file',
    mime: metadata.mime || 'application/octet-stream',
    size: Number(metadata.size) || 0,
  };
}

export async function decryptMediaFile(arrayBuffer, fileIv, roomCode, roomSecret, mime) {
  const encryptedBytes = new Uint8Array(arrayBuffer);
  const clear = await decryptBytes(bytesToBase64Url(encryptedBytes), fileIv, roomCode, roomSecret);
  return new Blob([clear], { type: mime || 'application/octet-stream' });
}
