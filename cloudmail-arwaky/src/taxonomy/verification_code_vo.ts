// taxonomy/verification_code_vo.ts
// Branded types for verification codes and their properties

/** Numeric verification code length (positive integer) */
export type NumericCodeLength = number & { readonly __brand: 'NumericCodeLength' };

export function asNumericCodeLength(n: number): NumericCodeLength {
    return Math.max(1, Math.floor(n)) as NumericCodeLength;
}

/** Default numeric verification code length constant */
export const NUMERIC_CODE_LENGTH = 6;

/** Default numeric verification code length as branded type */
export const DEFAULT_NUMERIC_CODE_LENGTH: NumericCodeLength = asNumericCodeLength(NUMERIC_CODE_LENGTH);

/** Default visible characters when masking */
export const DEFAULT_MASK_VISIBLE_CHARS = 4;

