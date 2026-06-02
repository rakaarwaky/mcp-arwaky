// taxonomy/email_metadata_vo.ts

export type MessageId = string & { readonly __brand: 'MessageId' };
export type InReplyTo = string & { readonly __brand: 'InReplyTo' };
export type SpamScore = string & { readonly __brand: 'SpamScore' };
export type AuthResults = string & { readonly __brand: 'AuthResults' };

export function asMessageId(s: string): MessageId { return s as MessageId; }
export function asInReplyTo(s: string): InReplyTo { return s as InReplyTo; }
export function asSpamScore(s: string): SpamScore { return s as SpamScore; }
export function asAuthResults(s: string): AuthResults { return s as AuthResults; }

export const EMAIL_METADATA_DOMAIN = 'email_metadata';

export const VERIFICATION_KEYWORDS = ['verify', 'confirm', 'activation', 'validate', 'auth'];
