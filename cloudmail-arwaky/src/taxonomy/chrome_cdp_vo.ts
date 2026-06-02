// taxonomy/chrome_cdp_vo.ts
// Branded types for Chrome DevTools Protocol automation

/** CDP target/tab ID */
export type CdpTargetId = string & { readonly __brand: 'CdpTargetId' };

/** CDP method name (e.g., 'Page.navigate') */
export type CdpMethod = string & { readonly __brand: 'CdpMethod' };

/** CDP domain name (e.g., 'Page') */
export type CdpDomain = string & { readonly __brand: 'CdpDomain' };

export function asCdpTargetId(s: string): CdpTargetId {
    if (typeof s !== 'string' || s.trim().length === 0) throw new Error('CdpTargetId cannot be empty');
    return s as CdpTargetId;
}

export function asCdpMethod(s: string): CdpMethod {
    if (typeof s !== 'string' || s.trim().length === 0) throw new Error('CdpMethod cannot be empty');
    return s as CdpMethod;
}

export function asCdpDomain(s: string): CdpDomain {
    if (typeof s !== 'string' || s.trim().length === 0) throw new Error('CdpDomain cannot be empty');
    return s as CdpDomain;
}
