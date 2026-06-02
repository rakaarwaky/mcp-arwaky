import { EmailExtractionActions } from '../../src/capabilities/email_extraction_actions';
import { createMockMetricsCollector } from './mocks';
import { asBodyText, asServiceName } from '../../src/taxonomy';
import assert from 'assert';

/// <reference types="vitest" />

describe('EmailExtractionActions (Manual PBT)', () => {
  const extractor = new EmailExtractionActions(createMockMetricsCollector());

  function generateRandomString(length: number) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/ ';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  it('should never crash on random input (Fuzzing)', () => {
    for (let i = 0; i < 100; i++) {
      const input = generateRandomString(Math.floor(Math.random() * 2000));
      try {
        extractor.extractVerificationLink(asBodyText(input));
        extractor.extractNumericCode(asBodyText(input));
        extractor.extractApiKey(asBodyText(input), asServiceName('openrouter'));
      } catch (err) {
        assert.fail(`Fuzzer crashed on input: ${input.substring(0, 100)}... Error: ${err}`);
      }
    }
  });

  it('should extract correctly embedded codes', () => {
    for (let i = 0; i < 50; i++) {
      const code = Math.floor(100000 + Math.random() * 899999).toString();
      const prefix = generateRandomString(50);
      const suffix = generateRandomString(50);
      const input = `${prefix} Your code is ${code}. ${suffix}`;

      const result = extractor.extractNumericCode(asBodyText(input));
      assert.strictEqual(result, code, `Failed to extract ${code} from suspicious environment`);
    }
  });
});
