// tests/unit/surface-mcp.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock MCP SDK - provide both registerTool and connect methods
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    registerTool: vi.fn(),
    registry: { tools: new Map(), resources: new Map(), prompts: new Map() },
  })),
}));

// Mock StdioServerTransport
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
  })),
}));

// Mock child_process for CLI execution
vi.mock('child_process', () => ({
  execFileSync: vi.fn((_cmd: string, args: string[]) => {
    // Simulate CLI output based on command
    const fullCmd = args.join(' ');
    if (fullCmd.includes('auth health')) return JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() });
    if (fullCmd.includes('user list')) return JSON.stringify({ users: [{ id: 'u1', email: 'test@example.com', displayName: 'Test', role: 'agent' }] });
    if (fullCmd.includes('user create')) return JSON.stringify({ user: { id: 'u2' }, credentials: { email: 'new@example.com', password: 'secret' } });
    if (fullCmd.includes('inbox list')) return JSON.stringify({ userId: 'u1', emails: [{ id: 'e1', subject: 'Hello' }], archivedCount: 0 });
    if (fullCmd.includes('inbox action')) return JSON.stringify({ updated: true });
    if (fullCmd.includes('system dashboard')) return JSON.stringify({ summary: { totalEmails: 100 }, metrics: [] });
    if (fullCmd.includes('system cleanup')) return JSON.stringify({ expiredEmails: 5, expiredSessions: 2, ranAt: new Date().toISOString() });
    if (fullCmd.includes('settings get')) return JSON.stringify({ settings: { base_url: 'http://localhost:8787' }, webhook: { url: null } });
    if (fullCmd.includes('apikey list')) return JSON.stringify({ keys: [{ id: 'k1', name: 'test', isActive: true }] });
    return JSON.stringify({ error: 'Unknown command' });
  }),
}));

// Mock fs for SKILL.md reading
vi.mock('fs', () => ({
  readFileSync: vi.fn((path: string) => {
    if (String(path).includes('SKILL.md')) return '# CloudMailFlare\n## CLI Commands\n```bash\ncmf auth login\n```';
    throw new Error('File not found');
  }),
  existsSync: vi.fn((path: string) => {
    if (String(path).includes('SKILL.md')) return true;
    return false;
  }),
}));

describe('Surfaces > MCP (Hydra)', () => {
  let mockServer: any;
  let registeredTools: Record<string, Function>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules(); // Clear module cache to force fresh import
    registeredTools = {};
    mockServer = {
      registerTool: vi.fn((name: string, _config: any, handler: Function) => {
        registeredTools[name] = handler;
      }),
    };

    // Import MCP SDK mock and set implementation
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    (McpServer as any).mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      registerTool: mockServer.registerTool,
    }));

    // Import the module under test to trigger registration
    await import('../../src/surfaces/mcp/mcp_tools_entry');
  });

  it('registers exactly 5 Hydra tools', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(5);
    const toolNames = mockServer.registerTool.mock.calls.map((c: any[]) => c[0]);
    expect(toolNames).toContain('cmf_execute');
    expect(toolNames).toContain('cmf_list_commands');
    expect(toolNames).toContain('cmf_skill');
    expect(toolNames).toContain('cmf_status');
    expect(toolNames).toContain('cmf_cancel');
  });

  it('cmf_execute — runs CLI and returns output', async () => {
    const handler = registeredTools['cmf_execute']!;
    expect(handler).toBeDefined();

    const result = await handler({ command: 'user list' });
    expect(result.content[0]!.type).toBe('text');
    const data = JSON.parse(result.content[0]!.text);
    expect(data.users).toBeDefined();
    expect(data.users[0]!.email).toBe('test@example.com');
  });

  it('cmf_list_commands — returns command list', async () => {
    const handler = registeredTools['cmf_list_commands']!;

    const result = await handler({});
    const commands = JSON.parse(result.content[0]!.text);
    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBeGreaterThan(0);
    expect(commands[0]).toHaveProperty('command');
    expect(commands[0]).toHaveProperty('desc');
  });

  it('cmf_list_commands — filtered by domain', async () => {
    const handler = registeredTools['cmf_list_commands']!;

    const result = await handler({ domain: 'auth' });
    const commands = JSON.parse(result.content[0]!.text);
    expect(commands.every((c: any) => c.command.startsWith('auth'))).toBe(true);
  });

  it('cmf_skill — reads SKILL.md', async () => {
    const handler = registeredTools['cmf_skill']!;

    const result = await handler({});
    expect(result.content[0]!.text).toContain('CloudMailFlare');
  });

  it('cmf_skill — section filtering', async () => {
    const handler = registeredTools['cmf_skill']!;

    const result = await handler({ section: 'CLI Commands' });
    expect(result.content[0]!.text).toContain('CLI Commands');
  });

  it('cmf_status — returns health', async () => {
    const handler = registeredTools['cmf_status']!;

    const result = await handler({});
    const status = JSON.parse(result.content[0]!.text);
    expect(status.server).toContain('cloud-mail-flare');
    expect(status.health).toBe('Online');
    expect(status.tools).toBe(5);
  });

  it('cmf_cancel — returns success for no job ID', async () => {
    const handler = registeredTools['cmf_cancel']!;

    const result = await handler({});
    const data = JSON.parse(result.content[0]!.text);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Cancel signal received");
    expect(data.jobId).toBeUndefined();
  });

  it('cmf_cancel — returns error for unknown job', async () => {
    const handler = registeredTools['cmf_cancel']!;

    const result = await handler({ job_id: 'fake' });
    const data = JSON.parse(result.content[0]!.text);
    expect(data.message).toContain('received');
  });

  it('cmf_execute — error handling', async () => {
    const { execFileSync } = await import('child_process');
    (execFileSync as any).mockImplementationOnce(() => { throw new Error('CLI failed'); });

    const handler = registeredTools['cmf_execute']!;

    const result = await handler({ command: 'user list' });
    const data = JSON.parse(result.content[0]!.text);
    expect(data.error).toBeDefined();
  });
});
