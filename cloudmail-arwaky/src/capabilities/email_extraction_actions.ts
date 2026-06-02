// capabilities/email_extraction_actions.ts
// Implements IEmailExtractionProtocol — Regex-based link and code extraction

import type { IEmailExtractionProtocol } from '../contract/email_extraction_protocol';
import type { VerificationLink, VerificationCode, ExtractedApiKey, BodyText, ServiceName } from '../taxonomy';
import {
  asVerificationLink,
  asVerificationCode,
  asExtractedApiKey,
  VERIFICATION_KEYWORDS,
  NUMERIC_CODE_LENGTH,
  asServiceName,
  asAction
} from '../taxonomy';
import type { IMetricsCollectorPort } from '../contract';
import { withMetricsSync } from '../infrastructure/metrics_instrument_helper';

/**
 * Capability for extracting structured information (links, codes, keys) from email bodies.
 * Uses regular expressions and heuristic keyword matching.
 */
export class EmailExtractionActions implements IEmailExtractionProtocol {
  constructor(private metrics: IMetricsCollectorPort) { }

  /**
   * Scans text for URLs containing common verification keywords.
   *
   * @param textEmailBody The plain text content of the email (branded BodyText)
   * @returns The extracted verification link or null if not found
   */
  extractVerificationLink(textEmailBody: BodyText): VerificationLink | null {
    return withMetricsSync(this.metrics, asServiceName('extraction'), asAction('extractVerificationLink'), () => {
      const urlRegex = /https?:\/\/[^\s<>'"]+(?<![).\],])/gi;
      const matches = textEmailBody.match(urlRegex);

      if (!matches) return null;

      // Filter for common verification keywords
      const bestMatch = matches.find(url =>
        VERIFICATION_KEYWORDS.some(kw => url.toLowerCase().includes(kw))
      );

      if (!bestMatch) return null;

      try {
        return asVerificationLink(bestMatch);
      } catch {
        return null;
      }
    });
  }

  /**
   * Scans for a numeric verification code of a specific length (default 6).
   *
   * @param textEmailBody The plain text content of the email (branded BodyText)
   * @returns The extracted verification code or null if not found
   */
  extractNumericCode(textEmailBody: BodyText): VerificationCode | null {
    return withMetricsSync(this.metrics, asServiceName('extraction'), asAction('extractNumericCode'), () => {
      const codeRegex = new RegExp(`\\b\\d{${NUMERIC_CODE_LENGTH}}\\b`, 'g');
      const matches = textEmailBody.match(codeRegex);

      if (!matches) return null;

      // Pick the first match found
      return asVerificationCode(matches[0]);
    });
  }

  /**
   * Scans for API keys (e.g., OpenRouter 'sk-or-v1-...') using provider-specific or generic patterns.
   *
   * @param textEmailBody The plain text content of the email (branded BodyText)
   * @param provider Optional provider name (e.g., 'openrouter') to use specific regex (branded ServiceName)
   * @returns The extracted API key or null if not found
   */
  extractApiKey(textEmailBody: BodyText, provider?: ServiceName): ExtractedApiKey | null {
    return withMetricsSync(this.metrics, asServiceName('extraction'), asAction('extractApiKey'), () => {
      // OpenRouter specific pattern if provider matches
      if (provider?.toLowerCase() === 'openrouter') {
        const orRegex = /\bsk-or-v1-[a-zA-Z0-9]{32,}\b/g;
        const matches = textEmailBody.match(orRegex);
        if (matches) return asExtractedApiKey(matches[0]);
      }

      // Generic key-like sequence (shannon entropy high strings)
      // Matches common sk- style keys
      const genericKeyRegex = /\bsk-[a-zA-Z0-9]{24,}\b/g;
      const genericMatches = textEmailBody.match(genericKeyRegex);

      if (genericMatches) {
        return asExtractedApiKey(genericMatches[0]);
      }

      return null;
    });
  }
}
