// infrastructure/crypto_encrypt_adapter.ts
// Symmetric encryption for sensitive data at rest using Web Crypto API (AES-GCM)
// Used for reversible encryption of external service passwords stored in D1.

import { type EncryptionSecret, type RawText, asRawText } from '../taxonomy';

const encoder = new TextEncoder();

export class CryptoEncryptAdapter {
  private keyPromise: Promise<CryptoKey>;

  constructor(keyMaterial: EncryptionSecret) {
    if (!keyMaterial || keyMaterial.trim().length === 0) {
      throw new Error('CryptoEncryptAdapter: encryption key material cannot be empty');
    }
    const bytes = encoder.encode(keyMaterial);
    this.keyPromise = this.deriveKeyFromBytes(bytes);
  }

  // Derive a 256-bit AES-GCM key from raw bytes using SHA-256.
  private async deriveKeyFromBytes(raw: Uint8Array): Promise<CryptoKey> {
    const hash = await crypto.subtle.digest('SHA-256', raw as BufferSource);
    const keyBytes = new Uint8Array(hash);
    return crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(plaintext: string | RawText): Promise<string> {
    if (!plaintext) return plaintext;
    const key = await this.keyPromise;
    const iv = new Uint8Array(crypto.getRandomValues(new Uint8Array(12)));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(plaintext)
    );
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return this.toBase64(combined);
  }

  async decrypt(encrypted: string): Promise<RawText> {
    if (!encrypted) return asRawText(encrypted);
    const key = await this.keyPromise;
    const combined = this.fromBase64(encrypted);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );
    return asRawText(new TextDecoder().decode(decrypted));
  }

  private toBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }

  private fromBase64(value: string): Uint8Array {
    const binary = atob(value);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
}
