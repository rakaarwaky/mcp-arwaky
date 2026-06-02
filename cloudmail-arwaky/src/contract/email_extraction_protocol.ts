// contract/email_extraction_protocol.ts
// Protocol for extracting links and keys from email bodies (Phase 2)

import type { VerificationLink, VerificationCode, ExtractedApiKey, BodyText, ServiceName } from '../taxonomy';

/**
 * Interface for extraction services.
 * Analyzes email body text to find verification URLs, codes, or tokens.
 */
export interface IEmailExtractionProtocol {
  /**
   * Scans text for any URL containing 'verify', 'confirm', or 'activation'.
   *
   * @param textEmailBody - Raw text content of the email
   * @returns Extracted VerificationLink or null if not found
   */
  extractVerificationLink(textEmailBody: BodyText): VerificationLink | null;

  /**
   * Scans text for a 6-digit numeric verification code.
   *
   * @param textEmailBody - Raw text content of the email
   * @returns Extracted VerificationCode or null if not found
   */
  extractNumericCode(textEmailBody: BodyText): VerificationCode | null;

  /**
   * Scans text for patterns matching service-specific API keys.
   * (e.g., OpenRouter 'sk-or-v1-...')
   *
   * @param textEmailBody - Raw text content of the email
   * @param provider - Service provider context (optional)
   * @returns Extracted API key or null if not found
   */
  extractApiKey(textEmailBody: BodyText, provider?: ServiceName): ExtractedApiKey | null;
}
