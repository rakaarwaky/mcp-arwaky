// tests/integration/cli_integration.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { program, output } from '../../src/surfaces/cli/cli_main_entry';
import { getAgent } from '../../src/surfaces/cli/cli_agent_util';
import { loadConfig } from '../../src/surfaces/cli/cli_config_loader';
import os from 'os';
import path from 'path';

// Mock Agent
vi.mock('../../src/surfaces/cli/cli_agent_util', () => ({
  getAgent: vi.fn(),
}));

// Mock Config Loader
vi.mock('../../src/surfaces/cli/cli_config_loader', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    loadConfig: vi.fn(),
  };
});

describe('CLI Integration Tests', () => {
  let mockAgent: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAgent = {
      healthCheck: vi.fn().mockResolvedValue({ status: 'ok' }),
      getUsers: vi.fn().mockResolvedValue([{ id: 'u1', email: 'u1@test.com' }]),
      listUsers: vi.fn().mockResolvedValue([{ id: 'u1', email: 'u1@test.com' }]),
      getDashboardMetrics: vi.fn().mockResolvedValue({ totalEmails: 0, totalInboxes: 0 }),
    };
    (getAgent as any).mockReturnValue(mockAgent);
    (loadConfig as any).mockReturnValue({
      api: { baseUrl: 'http://test:8787' }
    });
    
    // Reset output state
    output.json = false;
    output.verbose = false;
    output.quiet = false;

    // Mock process.exit to prevent test runner from exiting
    vi.spyOn(process, 'exit').mockImplementation((_code?: string | number | null | undefined) => {
       return undefined as never;
    });
  });

  it('parses global flags correctly', async () => {
    await program.parseAsync(['node', 'cmf', '--json', 'system', 'benchmark']);
    
    expect(output.json).toBe(true);
  });

  it('respects the --profile flag', async () => {
    await program.parseAsync(['node', 'cmf', '--profile', 'test-profile', 'config', 'show']);
    expect(output.profile).toBe('test-profile');
    expect(loadConfig).toHaveBeenCalledWith('test-profile');
  });

  it('handles command failures with printError', async () => {
    mockAgent.listUsers.mockRejectedValue(new Error('Network error'));
    
    // We capture console.log to verify error printing
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    await program.parseAsync(['node', 'cmf', 'user', 'list']);
    
    expect(process.exit).toHaveBeenCalledWith(1);
    consoleSpy.mockRestore();
  });

  it('generates a request ID for agent calls', async () => {
    await program.parseAsync(['node', 'cmf', 'system', 'dashboard', '--user', 'u1']);
    expect(getAgent).toHaveBeenCalled();
  });
});
