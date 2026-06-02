// taxonomy/field_name_vo.ts
// Field name value object — branded string for field identifiers

/**
 * Branded type for field names used in validation errors.
 * Prevents accidental use of arbitrary strings as field identifiers.
 *
 * @example
 *   const emailField = asFieldName('email');
 *   const usernameField = asFieldName('username');
 */
export type FieldName = string & { readonly __brand: 'FieldName' };

/**
 * Creates a FieldName branded value.
 * Validates that the field name is a non-empty string.
 *
 * @param value - Raw field name string
 * @returns Branded FieldName
 * @throws {ValidationFieldError} if value is empty or invalid
 *
 * @example
 *   const field = asFieldName('email'); // OK
 *   const invalid = asFieldName(''); // throws ValidationFieldError
 */
export function asFieldName(value: string): FieldName {
  if (!value || value.trim().length === 0) {
    throw new Error('Field name cannot be empty');
  }
  const normalized = value.trim();
  const reserved = ['__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty'];
  if (reserved.includes(normalized)) {
    throw new Error(`Reserved field name: ${normalized}`);
  }
  return normalized as FieldName;
}

/**
 * Returns the raw string value of a FieldName.
 *
 * @param field - Branded FieldName
 * @returns Raw string
 *
 * @example
 *   const field = asFieldName('email');
 *   console.log(fieldNameOf(field)); // 'email'
 */
export function fieldNameOf(field: FieldName): string {
  return field as string;
}
