import { describe, it, expect, vi } from 'vitest';
import { DashboardMetricsActions } from '../../src/capabilities/dashboard_metrics_actions';
import { UserLoginActions } from '../../src/capabilities/user_login_actions';
import { EmailIngestActions } from '../../src/capabilities/email_ingest_actions';
import { createMockDb, createMockPasswordHash, createMockSessionAuth, createMockLogger, createMockMetricsCollector, createMockPush } from '../unit/mocks';
import { asUserId } from '../../src/taxonomy';
import { AuditLogActions } from '../../src/capabilities/audit_log_actions';

describe('integration: Capability → Infrastructure boundary (Dashboard)', () => {
  it('DashboardMetricsActions should correctly call and return data from Database adapter', async () => {
    const mockDb = createMockDb();
    const mockMetrics = createMockMetricsCollector();
    const mockMetricsData = [
      { key: 'total_emails', label: 'Total Emails', value: '100', status: 'ok' },
      { key: 'active_users', label: 'Active Users', value: '50', status: 'ok' }
    ];
    mockDb.getDashboardMetrics.mockResolvedValue(mockMetricsData);

    const metricsActions = new DashboardMetricsActions(mockDb, mockMetrics);
    const result = await metricsActions.getMetrics(asUserId('u1'));

    expect(mockDb.getDashboardMetrics).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockMetricsData);
  });
});

describe('integration: Capability → Infrastructure boundary (Auth)', () => {
  it('UserLoginActions should coordinate multiple ports for login', async () => {
    const { createEmailAddress } = await import('../../src/taxonomy');
    const mockDb = createMockDb();
    const mockHash = createMockPasswordHash();
    const mockAuth = createMockSessionAuth();
    const mockLogger = createMockLogger();
    const mockMetrics = createMockMetricsCollector();

    const email = createEmailAddress('user@example.com');
    const user: any = { id: 'u1', email, passwordHash: 'hash' };

    mockDb.getUserByEmail.mockResolvedValue(user);
    mockHash.verifyPassword.mockResolvedValue(true);
    mockAuth.createSession.mockResolvedValue({ token: 't1', session: { id: 's1' } as any });

    const auditLog = new AuditLogActions(mockDb, mockLogger, mockMetrics);
    const loginActions = new UserLoginActions(mockDb, mockHash, mockAuth, auditLog, mockMetrics, mockLogger);
    const result = await loginActions.login(email, 'pass' as any, { userAgent: 'agent' as any, clientIp: '1.1.1.1' as any });

    expect(mockDb.getUserByEmail).toHaveBeenCalledWith(email);
    expect(mockHash.verifyPassword).toHaveBeenCalledWith('pass', 'hash');
    expect(mockAuth.createSession).toHaveBeenCalledWith('u1', expect.any(Object));
    expect(result.token).toBe('t1');
  });
});

describe('integration: Capability → Infrastructure boundary (Ingest)', () => {
  it('EmailIngestActions should persist mapped email data', async () => {
    const { createEmailAddress } = await import('../../src/taxonomy');
    const mockDb = createMockDb();
    const metrics = createMockMetricsCollector();
    const push = createMockPush();
    const ingestActions = new EmailIngestActions(mockDb, metrics, push);

    const from = createEmailAddress('from@example.com');
    const to = createEmailAddress('to@example.com');

    await ingestActions.ingestEmail({
      emailId: 'e1' as any,
      sender: from,
      recipient: to,
      subject: 'test' as any,
      bodyText: 'hello' as any
    } as any);

    expect(mockDb.upsertEmail).toHaveBeenCalled();
    const callArgs = mockDb.upsertEmail.mock.calls[0][0];
    expect(callArgs.emailId).toBe('e1');
    expect(callArgs.sender).toBe(from);
  });
});
