import crypto from 'node:crypto';

/**
 * AES-256-GCM Encryption Utility
 * Format: v1:key_id:iv:ciphertext:tag
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce for GCM
const AUTH_TAG_LENGTH = 16;
const KEY_VERSION = 'v1';
const KEY_ID = 'default'; // Supports future key rotation

function getEncryptionKey(): Buffer {
  const keyHex = process.env.APP_ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error('APP_ENCRYPTION_KEY is not defined in environment variables.');
  }

  // Key must be exactly 32 bytes (256 bits) for aes-256
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('APP_ENCRYPTION_KEY must be a 32-byte hex string (64 characters).');
  }

  return key;
}

export function encrypt(text: string): string {
  if (!text) return '';

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag().toString('base64');

  return `${KEY_VERSION}:${KEY_ID}:${iv.toString('base64')}:${encrypted}:${authTag}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';

  const parts = encryptedText.split(':');
  if (parts.length !== 5) {
    throw new Error('Invalid encrypted text format.');
  }

  const [version, keyId, ivBase64, ciphertextBase64, tagBase64] = parts;

  if (version !== 'v1') {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  // Future key rotation logic would use keyId here
  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const tag = Buffer.from(tagBase64, 'base64');
  const ciphertext = Buffer.from(ciphertextBase64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
