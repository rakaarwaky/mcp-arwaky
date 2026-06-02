// taxonomy/email_address_vo.ts
// Immutable email address with validation
// Supports RFC 6531 (EAI) international email addresses

export interface EmailAddress {
  readonly localPart: string;
  readonly domain: string;
  readonly full: string;
}

/**
 * Validates basic email structure without restricting character sets.
 * Allows Unicode in local part and domain (RFC 6531 compliant).
 * Throws if: empty, missing @, multiple @, or whitespace.
 */
export function createEmailAddress(raw: string): EmailAddress {
  const trimmed = raw.trim();
  // Reject control characters (0-31 and 127)
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    throw new Error(`Invalid email address: contains control characters`);
  }
  if (!trimmed.includes('@')) {
    throw new Error(`Invalid email address: missing @ symbol`);
  }

  const atIdx = trimmed.lastIndexOf('@');
  if (atIdx === 0 || atIdx === trimmed.length - 1) {
    throw new Error(`Invalid email address: ${raw}`);
  }

  const localPart = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1);

  // Basic structure validation (no character restrictions)
  if (localPart.includes(' ')) {
    throw new Error(`Invalid email address: local part contains whitespace`);
  }
  if (domain.includes(' ')) {
    throw new Error(`Invalid domain structure: contains whitespace`);
  }
  if (trimmed.indexOf('@') !== atIdx) {
    throw new Error(`Invalid email address: multiple @ symbols`);
  }

  // Domain validation: no leading/trailing dots, no double dots, no spaces
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    throw new Error(`Invalid domain structure: ${domain}`);
  }
  if (!domain.includes('.')) {
    throw new Error(`Invalid domain: must contain at least one dot`);
  }

  // Build canonical form: lowercase domain, preserve local part case
  const canonicalDomain = domain.toLowerCase();
  const full = `${localPart}@${canonicalDomain}`;

  return Object.freeze({ localPart, domain: canonicalDomain, full });
}

/**
 * Alternative: Strict ASCII-only validation for legacy systems.
 * Use when international email support is not required.
 */
export function createEmailAddressAsciiOnly(raw: string): EmailAddress {
  const trimmed = raw.trim().toLowerCase();
  const atIdx = trimmed.lastIndexOf('@');
  if (atIdx < 1 || atIdx >= trimmed.length - 1) {
    throw new Error(`Invalid email address: ${raw}`);
  }
  const localPart = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1);
  if (!/^[a-z0-9._%+-]+$/.test(localPart)) {
    throw new Error(`Invalid local part: ${localPart}`);
  }
  if (!/^[a-z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
    throw new Error(`Invalid domain: ${domain}`);
  }
  return Object.freeze({ localPart, domain, full: `${localPart}@${domain}` });
}
