// taxonomy/flag_state_vo.ts
// Boolean flag types

export type FlagState = boolean & { readonly __brand: 'FlagState' };
export type IsStarred = boolean & { readonly __brand: 'IsStarred' };
export type HasAttachments = boolean & { readonly __brand: 'HasAttachments' };
export type IsOwner = boolean & { readonly __brand: 'IsOwner' };
export type LoadingState = boolean & { readonly __brand: 'LoadingState' };

export const STARRED: IsStarred = true as IsStarred;
export const NOT_STARRED: IsStarred = false as IsStarred;
export const WITH_ATTACHMENTS: HasAttachments = true as HasAttachments;
export const WITHOUT_ATTACHMENTS: HasAttachments = false as HasAttachments;

export function asIsStarred(v: number | boolean | string): IsStarred {
    if (typeof v === 'string') {
        // Reject string values like 'false' that are truthy but semantically false
        const lower = v.toLowerCase().trim();
        if (lower === 'false' || lower === '0' || lower === '') return false as IsStarred;
        return !!(lower === 'true' || lower === '1') as IsStarred;
    }
    return !!v as IsStarred;
}

export function asFlagState(v: number | boolean | string): FlagState {
    if (typeof v === 'string') {
        const lower = v.toLowerCase().trim();
        if (lower === 'false' || lower === '0' || lower === '') return false as FlagState;
        return !!(lower === 'true' || lower === '1') as FlagState;
    }
    return !!v as FlagState;
}

export function asIsOwner(v: any): IsOwner {
    return !!v as IsOwner;
}

export function asLoadingState(v: any): LoadingState {
    return !!v as LoadingState;
}
