// taxonomy/network_path_vo.ts
// Branded types for network-related strings and paths

/** Relative URL path */
export type RelativePath = string & { readonly __brand: 'RelativePath' };

/** Push notification channel name */
export type ChannelName = string & { readonly __brand: 'ChannelName' };

export function asRelativePath(s: string): RelativePath {
    if (!s.startsWith('/')) return `/${s}` as RelativePath;
    return s as RelativePath;
}

export function asChannelName(s: string): ChannelName {
    if (typeof s !== 'string') throw new Error(`Invalid ChannelName: ${s}`);
    return s as ChannelName;
}
