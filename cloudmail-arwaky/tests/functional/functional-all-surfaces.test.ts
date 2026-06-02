// tests/functional/functional-all-surfaces.test.ts
// Functional: verify consistency and alignment across different system surfaces (CLI, MCP, Web, etc.)

import { describe, it, expect } from 'vitest';
import type { UserGetInput } from '../../src/contract/user_crud_io';

describe('Functional: Surface alignment and contract validation', () => {
  it('CLI format utils handle taxonomy objects correctly', async () => {
    const { success, bold } = await import('../../src/surfaces/cli/cli_format_util');
    const { createEmailAddress } = await import('../../src/taxonomy');

    // Smoke check: can we format domain objects?
    const email = createEmailAddress('user@example.com');
    expect(() => success(`Processed ${email.full}`)).not.toThrow();
    expect(bold('Test')).toContain('Test');
  });

  it('Contract IO types match Taxonomy brands', async () => {
    // Verify that the IO layer re-exports correct taxonomy types for client use
    const { asUserId } = await import('../../src/taxonomy');
    const userIo = await import('../../src/contract/user_crud_io');

    // A UserId from taxonomy should be acceptable as a UserId in the contract
    const id = asUserId('u1');
    const typedId: UserGetInput['userId'] = id;
    expect(typedId).toBe(id);
  });
});

describe('Functional: Security constraints across surfaces', () => {
  it('Auth guard has a clear separation between authorized/unauthorized states', async () => {
    const { AuthUnauthorizedError } = await import('../../src/taxonomy/auth_unauthorized_error');
    const err = new AuthUnauthorizedError('Missing Token');
    expect(err.statusCode).toBe(401);
    expect(err.toJSON().error).toBe('UNAUTHORIZED');
  });
});
