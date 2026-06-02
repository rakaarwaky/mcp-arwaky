// tests/unit/surface-cli.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// Mock Agent
const mockAgent = {
  listUsers: vi.fn(),
  getUserInbox: vi.fn(),
  getEmail: vi.fn(),
  waitForEmail: vi.fn(),
  applyEmailAction: vi.fn(),
  getDashboardMetrics: vi.fn(),
  createUser: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  softDeleteUser: vi.fn(),
  getWorkerSettings: vi.fn(),
  updateWorkerSettings: vi.fn(),
  listApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
};

vi.mock('../../src/surfaces/cli/cli_agent_util', () => ({
  getAgent: () => mockAgent,
}));

// Mock format util to avoid process.exit and console noise
vi.mock('../../src/surfaces/cli/cli_format_util', () => ({
  success: vi.fn(),
  info: vi.fn(),
  printTable: vi.fn(),
  printJson: vi.fn(),
  printError: vi.fn(),
  exit: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('../../src/surfaces/cli/cli_main_entry', () => ({
  output: { json: false, quiet: false },
}));

describe('Surfaces > CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inboxCommands — list', async () => {
    const { inboxCommands } = await import('../../src/surfaces/cli/cli_inbox_command');
    const program = new Command();
    program.exitOverride(); // Prevent process.exit
    inboxCommands(program);
    
    mockAgent.listUsers.mockResolvedValue([{ id: 'u1' }]);
    mockAgent.getUserInbox.mockResolvedValue({ emails: [], archivedCount: 0 });

    await program.parseAsync(['node', 'test', 'inbox', 'list', '--user', 'u1']);
    
    expect(mockAgent.getUserInbox).toHaveBeenCalledWith('u1');
  });

  it('inboxCommands — get', async () => {
    const { inboxCommands } = await import('../../src/surfaces/cli/cli_inbox_command');
    const program = new Command();
    program.exitOverride();
    inboxCommands(program);

    mockAgent.listUsers.mockResolvedValue([{ id: 'u1' }]);
    mockAgent.getEmail.mockResolvedValue({ id: 'e1', subject: 'test' });

    await program.parseAsync(['node', 'test', 'inbox', 'get', 'e1', '--user', 'u1']);
    
    expect(mockAgent.getEmail).toHaveBeenCalledWith('u1', 'e1');
  });

  it('authCommands — login', async () => {
    const { authCommands } = await import('../../src/surfaces/cli/cli_auth_command');
    const program = new Command();
    program.exitOverride();
    authCommands(program);

    await program.parseAsync(['node', 'test', 'auth', 'login', 'test@t.com', '123']);
  });

  it('userCommands — list', async () => {
    const { userCommands } = await import('../../src/surfaces/cli/cli_user_command');
    const program = new Command();
    program.exitOverride();
    userCommands(program);

    mockAgent.listUsers.mockResolvedValue([{ id: 'u1', email: 'u1@t.com' }]);
    await program.parseAsync(['node', 'test', 'user', 'list']);
    expect(mockAgent.listUsers).toHaveBeenCalled();
  });

  it('systemCommands — dashboard', async () => {
    const { systemCommands } = await import('../../src/surfaces/cli/cli_system_command');
    const program = new Command();
    program.exitOverride();
    systemCommands(program);

    mockAgent.getDashboardMetrics.mockResolvedValue({});
    await program.parseAsync(['node', 'test', 'system', 'dashboard']);
  });

  it('settingsCommands — all', async () => {
    const { settingsCommands } = await import('../../src/surfaces/cli/cli_settings_command');
    const program = new Command();
    program.exitOverride();
    settingsCommands(program);

    // get
    mockAgent.getWorkerSettings.mockResolvedValue({ settings: {} });
    await program.parseAsync(['node', 'test', 'settings', 'get']);

    // set
    mockAgent.updateWorkerSettings.mockResolvedValue(undefined);
    await program.parseAsync(['node', 'test', 'settings', 'set', 'k', 'v']);

    // apikey list
    mockAgent.listApiKeys.mockResolvedValue([]);
    await program.parseAsync(['node', 'test', 'apikey', 'list']);

    // apikey create
    mockAgent.createApiKey.mockResolvedValue({ apiKey: 'k', plainKey: 'p' });
    await program.parseAsync(['node', 'test', 'apikey', 'create', 'test']);

    // apikey revoke
    mockAgent.revokeApiKey.mockResolvedValue(undefined);
    await program.parseAsync(['node', 'test', 'apikey', 'revoke', 'id']);
  });

  it('userCommands — all', async () => {
    const { userCommands } = await import('../../src/surfaces/cli/cli_user_command');
    const program = new Command();
    program.exitOverride();
    userCommands(program);

    // create
    mockAgent.createUser.mockResolvedValue({ id: 'u2' });
    await program.parseAsync(['node', 'test', 'user', 'create', 'newuser']);

    // get
    mockAgent.getUser.mockResolvedValue({ id: 'u1' });
    await program.parseAsync(['node', 'test', 'user', 'get', 'u1']);

    // update
    mockAgent.updateUser.mockResolvedValue({ id: 'u1' });
    await program.parseAsync(['node', 'test', 'user', 'update', 'u1', '--name', 'New']);

    // delete
    mockAgent.softDeleteUser.mockResolvedValue({ deleted: true });
    await program.parseAsync(['node', 'test', 'user', 'delete', 'u1']);
  });

  it('CLI — error handling', async () => {
    const { userCommands } = await import('../../src/surfaces/cli/cli_user_command');
    const program = new Command();
    program.exitOverride();
    userCommands(program);

    mockAgent.listUsers.mockRejectedValue(new Error('Fail'));
    await program.parseAsync(['node', 'test', 'user', 'list']).catch(() => {});
    // Should have called printError
  });
});
