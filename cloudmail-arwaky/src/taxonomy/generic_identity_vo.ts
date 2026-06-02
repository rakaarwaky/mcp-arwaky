// taxonomy/generic_identity_vo.ts

function ensureNotEmpty(s: string, fieldName: string): string {
    if (!s || s.trim().length === 0) {
        throw new Error(`${fieldName} cannot be empty`);
    }
    return s;
}

export type Name = string & { readonly __brand: 'Name' };
export type CreatedBy = string & { readonly __brand: 'CreatedBy' };
export type Actor = string & { readonly __brand: 'Actor' };
export type Action = string & { readonly __brand: 'Action' };
export type State = string & { readonly __brand: 'State' };
export type AttachmentFilename = string & { readonly __brand: 'AttachmentFilename' };
export type ContentType = string & { readonly __brand: 'ContentType' };
export type ChromePath = string & { readonly __brand: 'ChromePath' };
export type UserDataDir = string & { readonly __brand: 'UserDataDir' };
export type Selector = string & { readonly __brand: 'Selector' };
export type JavascriptExpression = string & { readonly __brand: 'JavascriptExpression' };
export type FeatureFlag = string & { readonly __brand: 'FeatureFlag' };
export type CacheKey = string & { readonly __brand: 'CacheKey' };
export type LogMessage = string & { readonly __brand: 'LogMessage' };
export type LogContext = string & { readonly __brand: 'LogContext' };
export type Channel = string & { readonly __brand: 'Channel' };
export type AttributeKey = string & { readonly __brand: 'AttributeKey' };
export type SpanName = string & { readonly __brand: 'SpanName' };

export function asName(s: string): Name {
  if (typeof s !== 'string') throw new Error(`Name must be a string`);
  const trimmed = s.trim();
  if (trimmed.length < 3 || trimmed.length > 50) {
    throw new Error(`Name must be between 3 and 50 characters`);
  }
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
    throw new Error(`Name contains invalid characters (only alphanumeric, space, hyphen, underscore allowed)`);
  }
  return trimmed as Name;
}
export function asCreatedBy(s: string): CreatedBy { return ensureNotEmpty(s, 'CreatedBy') as CreatedBy; }
export function asActor(s: string): Actor { return ensureNotEmpty(s, 'Actor') as Actor; }
export function asAction(s: string): Action { return ensureNotEmpty(s, 'Action') as Action; }
export function asState(s: string): State { return ensureNotEmpty(s, 'State') as State; }
export function asAttachmentFilename(s: string): AttachmentFilename { return ensureNotEmpty(s, 'AttachmentFilename') as AttachmentFilename; }
export function asContentType(s: string): ContentType { return ensureNotEmpty(s, 'ContentType') as ContentType; }
export function asChromePath(s: string): ChromePath { return ensureNotEmpty(s, 'ChromePath') as ChromePath; }
export function asUserDataDir(s: string): UserDataDir { return ensureNotEmpty(s, 'UserDataDir') as UserDataDir; }
export function asSelector(s: string): Selector { return ensureNotEmpty(s, 'Selector') as Selector; }
export function asJavascriptExpression(s: string): JavascriptExpression { return ensureNotEmpty(s, 'JavascriptExpression') as JavascriptExpression; }
export function asFeatureFlag(s: string): FeatureFlag { return ensureNotEmpty(s, 'FeatureFlag') as FeatureFlag; }
export function asCacheKey(s: string): CacheKey { return ensureNotEmpty(s, 'CacheKey') as CacheKey; }
export function asLogMessage(s: string): LogMessage { return ensureNotEmpty(s, 'LogMessage') as LogMessage; }
export function asLogContext(s: string): LogContext { return ensureNotEmpty(s, 'LogContext') as LogContext; }
export function asChannel(s: string): Channel { return ensureNotEmpty(s, 'Channel') as Channel; }
export function asAttributeKey(s: string): AttributeKey { return ensureNotEmpty(s, 'AttributeKey') as AttributeKey; }
export function asSpanName(s: string): SpanName { return ensureNotEmpty(s, 'SpanName') as SpanName; }
