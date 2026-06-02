// taxonomy/web_url_vo.ts

export type Url = string & { readonly __brand: 'Url' };
export type WebhookUrl = string & { readonly __brand: 'WebhookUrl' };
export type Domain = string & { readonly __brand: 'Domain' };

export function asDomain(s: string): Domain { return s as Domain; }

export function asUrl(s: string): Url {
  if (s === '') return s as Url;
  try {
    const url = new URL(s);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`Insecure protocol: ${url.protocol}`);
    }
    return s as Url;
  } catch (e: any) {
    throw new Error(`Invalid URL: ${e.message || s}`);
  }
}

export function asWebhookUrl(s: string): WebhookUrl {
  return asUrl(s) as unknown as WebhookUrl;
}

export const WEB_URL_DOMAIN = 'web_url';
