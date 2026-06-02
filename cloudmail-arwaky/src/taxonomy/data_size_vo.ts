// taxonomy/data_size_vo.ts
// Value objects describing byte lengths, sizes, and string lengths

export type ByteLength = number & { readonly __brand: 'ByteLength' };
export type PasswordLength = number & { readonly __brand: 'PasswordLength' };
export type AttachmentSize = number & { readonly __brand: 'AttachmentSize' };

/**
 * Validates byte length (must be non-negative integer)
 */
export function asByteLength(n: number): ByteLength {
  return Math.max(0, Math.floor(n)) as ByteLength;
}

/**
 * Validates password length (must be non-negative integer)
 */
export function asPasswordLength(n: number): PasswordLength {
  return Math.max(0, Math.floor(n)) as PasswordLength;
}

/**
 * Validates attachment size in bytes (must be non-negative integer)
 */
export function asAttachmentSize(n: number): AttachmentSize {
  return Math.max(0, Math.floor(n)) as AttachmentSize;
}
