// contract/openrouter_auto_protocol.ts
// Protocol: OpenRouter account automation via browser
// AES: Local-only protocol. Drives Chrome CDP to register and extract API keys.

import type { EmailAddress, PasswordPlain, ApiKeyPlain, ApiOperationSuccess, ErrorMessage } from '../taxonomy';

export interface OpenRouterSignupInput {
  email: EmailAddress;
  password: PasswordPlain;
}

export interface OpenRouterSignupOutput {
  success: ApiOperationSuccess;
  apiKey?: ApiKeyPlain;
  error?: ErrorMessage;
  stage: 'init' | 'form_fill' | 'otp_wait' | 'otp_submit' | 'key_extract' | 'complete';
}

export interface IOpenRouterAutoProtocol {
  /** Full signup: fill form → wait OTP → submit → extract key. */
  runFullSignup(input: OpenRouterSignupInput): Promise<OpenRouterSignupOutput>;
}
