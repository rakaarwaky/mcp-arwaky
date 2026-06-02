// taxonomy/text_content_vo.ts

export type DisplayName = string & { readonly __brand: 'DisplayName' };
export type Label = string & { readonly __brand: 'Label' };
export type Subject = string & { readonly __brand: 'Subject' };
export type Snippet = string & { readonly __brand: 'Snippet' };
export type BodyText = string & { readonly __brand: 'BodyText' };
export type BodyHtml = string & { readonly __brand: 'BodyHtml' };
export type RawMime = string & { readonly __brand: 'RawMime' };
/**
 * RawText — branded string for arbitrary text (base64, SQL fragments, etc.)
 * Merged from raw_text_vo.ts
 */
export type RawText = string & { readonly __brand: 'RawText' };
export type ErrorMessage = string & { readonly __brand: 'ErrorMessage' };
export type Purpose = string & { readonly __brand: 'Purpose' };
export type Username = string & { readonly __brand: 'Username' };
export type ServiceName = string & { readonly __brand: 'ServiceName' };

export function asDisplayName(s: string): DisplayName { return s as DisplayName; }
export function asLabel(s: string): Label { return s as Label; }
export function asSubject(s: string): Subject { return s as Subject; }
export function asSnippet(s: string): Snippet { return s as Snippet; }
export function asBodyText(s: string): BodyText { return s as BodyText; }
export function asBodyHtml(s: string): BodyHtml { return s as BodyHtml; }
export function asRawMime(s: string): RawMime { return s as RawMime; }
/**
 * Creates a RawText branded string (unvalidated)
 */
export function asRawText(s: string): RawText { return s as RawText; }
export function asErrorMessage(s: string): ErrorMessage { return s as ErrorMessage; }
export function asPurpose(s: string): Purpose { return s as Purpose; }
export function asUsername(s: string): Username { return s as Username; }
export function asServiceName(s: string): ServiceName { return s as ServiceName; }

export const TEXT_CONTENT_DOMAIN = 'text_content';
