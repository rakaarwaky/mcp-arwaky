// infrastructure/crypto_password_adapter.ts
// Implements IPasswordHashPort using Web Crypto API (PBKDF2 + SHA-256)

import type { CryptoHash, Password, PasswordLength, ByteLength, AuthToken, RawText, PasswordMatch } from '../taxonomy';
import type { IPasswordHashPort } from '../contract';
import { MATCH, NO_MATCH, asRawText, asByteLength, asCryptoHash, asPassword, asAuthToken, asFieldName } from '../taxonomy';
import { ValidationFieldError } from '../taxonomy/validation_field_error.js';

const PASSWORD_SCHEME = 'pbkdf2_sha256';
const PASSWORD_ITERATIONS = 100_000;
const DERIVED_BITS = 256;

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): RawText {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return asRawText(btoa(binary));
}

function fromBase64(value: RawText): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function toBase64Url(bytes: Uint8Array): RawText {
  return asRawText(toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''));
}

async function derivePbkdf2(password: RawText, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key, DERIVED_BITS
  );
  return new Uint8Array(bits);
}

function safeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i]! ^ right[i]!;
  return diff === 0;
}

function randomIndex(maxExclusive: number): ByteLength {
  const maxUnbiased = Math.floor(4294967296 / maxExclusive) * maxExclusive;
  const bytes = new Uint32Array(1);
  while (true) {
    crypto.getRandomValues(bytes);
    if (bytes[0]! < maxUnbiased) return asByteLength(bytes[0]! % maxExclusive);
  }
}

function randomChar(chars: RawText): RawText {
  return chars[randomIndex(chars.length)]! as RawText;
}
export class CryptoPasswordAdapter implements IPasswordHashPort {
  async hashPassword(password: Password): Promise<CryptoHash> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const derived = await derivePbkdf2(asRawText(String(password)), salt, PASSWORD_ITERATIONS);
    return asCryptoHash(`${PASSWORD_SCHEME}$${PASSWORD_ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`);
  }

  async verifyPassword(password: Password, hash: CryptoHash): Promise<PasswordMatch> {
    const parts = String(hash).split('$');
    const scheme = parts[0] ?? '';
    const iterationsRaw = parts[1] ?? '';
    const saltB64 = parts[2] ?? '';
    const derivedB64 = parts[3] ?? '';
    if (scheme !== PASSWORD_SCHEME || !iterationsRaw || !saltB64 || !derivedB64) return NO_MATCH;
    const iterations = Number(iterationsRaw);
    if (!Number.isFinite(iterations) || iterations < 10_000) return NO_MATCH;
    const salt = fromBase64(asRawText(saltB64));
    const expected = fromBase64(asRawText(derivedB64));
    try {
      const actual = await derivePbkdf2(asRawText(String(password)), salt, iterations);
      return safeEqual(actual, expected) ? MATCH : NO_MATCH;
    } catch {
      return NO_MATCH;
    }
  }

  generateSecurePassword(length?: PasswordLength): Password {
    const len = Number(length ?? 18);
    if (len < 12) throw new ValidationFieldError(asFieldName('password'), 'Password length must be at least 12');
    const lowercase = asRawText('abcdefghjkmnpqrstuvwxyz');
    const uppercase = asRawText('ABCDEFGHJKMNPQRSTUVWXYZ');
    const numbers = asRawText('23456789');
    const symbols = asRawText('!@#$%^&*_-+=?');
    const all = asRawText(`${lowercase}${uppercase}${numbers}${symbols}`);
    const output = [randomChar(lowercase), randomChar(uppercase), randomChar(numbers), randomChar(symbols)];
    while (output.length < len) output.push(randomChar(all));
    for (let i = output.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1);
      const tmp = output[i]!;
      output[i] = output[j]!;
      output[j] = tmp;
    }
    return asPassword(output.join(''));
  }

  async sha256Hex(input: CryptoHash): Promise<CryptoHash> {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(String(input)));
    return asCryptoHash(Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join(''));
  }

  randomToken(byteLength?: ByteLength): AuthToken {
    const len = Number(byteLength ?? 32);
    const tokenBytes = crypto.getRandomValues(new Uint8Array(len));
    return asAuthToken(String(toBase64Url(tokenBytes)));
  }
}
