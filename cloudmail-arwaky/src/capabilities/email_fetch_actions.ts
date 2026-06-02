// capabilities/email_fetch_actions.ts
// Implements IEmailFetchProtocol — taxonomy-aligned

import type {
  TimeoutSeconds, PollIntervalSeconds, UserId, EmailId, Email, SearchFrom, Subject
} from '../taxonomy';
import { asTimeoutSeconds, asPollIntervalSeconds, asChannel, createEmailAddress, asServiceName, asAction } from '../taxonomy';
import type { IEmailFetchProtocol, IDatabaseQueryPort, IMetricsCollectorPort, IPushNotifyPort } from '../contract';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';

const DEFAULT_TIMEOUT_SECONDS = 30 as TimeoutSeconds;
const DEFAULT_POLL_INTERVAL_SECONDS = 2 as PollIntervalSeconds;

export class EmailFetchActions implements IEmailFetchProtocol {
  constructor(
    private db: IDatabaseQueryPort,
    private metrics: IMetricsCollectorPort,
    private push: IPushNotifyPort
  ) {}

  async getEmail(userId: UserId, emailId: EmailId): Promise<Email | null> {
    return withMetrics(this.metrics, asServiceName('email_fetch'), asAction('getEmail'), () => 
      this.db.getEmailById(userId, emailId)
    );
  }

  async waitForEmail(
    userId: UserId,
    options?: { from?: SearchFrom; subject?: Subject; timeout?: TimeoutSeconds; pollInterval?: PollIntervalSeconds }
  ): Promise<Email | null> {
    return withMetrics(this.metrics, asServiceName('email_fetch'), asAction('waitForEmail'), async () => {
      const timeoutMs = Number(options?.timeout ?? DEFAULT_TIMEOUT_SECONDS) * 1000;
      const pollIntervalMs = Number(options?.pollInterval ?? DEFAULT_POLL_INTERVAL_SECONDS) * 1000;
      const filters = {
        from: options?.from ? createEmailAddress(String(options.from)) : undefined,
        subject: options?.subject ? options.subject : undefined,
      };

      // 1. Immediate check
      const initialEmail = await this.db.findEmail(userId, filters);
      if (initialEmail) return initialEmail;

      // 2. Wait for push notification or poll with AbortController
      const user = await this.db.getUserById(userId);
      const channelToWatch = user ? asChannel(`user_emails_${user.email.full}`) : asChannel('any_email');

      const abortController = new AbortController();
      const { signal } = abortController;

      return new Promise<Email | null>((resolve) => {
        let cleanupCalled = false;
        let timer: any = null;
        let pollTimer: any = null;
        let unsubscribe: (() => void) | null = null;

        const cleanup = () => {
          if (cleanupCalled) return;
          cleanupCalled = true;
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
          }
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
          // Remove abort listener
          signal.removeEventListener('abort', onAbort);
        };

        const onAbort = () => {
          if (cleanupCalled) return;
          cleanup();
          resolve(null); // timeout or abort -> return null
        };

        signal.addEventListener('abort', onAbort);

        // Subscribe to push notifications
        unsubscribe = this.push.subscribe(channelToWatch, async () => {
          if (signal.aborted) return;
          const email = await this.db.findEmail(userId, filters);
          if (email && !signal.aborted) {
            cleanup();
            resolve(email);
          }
        });

        // Set timeout
        timer = setTimeout(() => {
          if (signal.aborted) return;
          abortController.abort();
        }, timeoutMs);

        // Polling loop (backup)
        pollTimer = setInterval(async () => {
          if (signal.aborted) return;
          const email = await this.db.findEmail(userId, filters);
          if (email && !signal.aborted) {
            cleanup();
            resolve(email);
          }
        }, pollIntervalMs);
      });
    });
  }
}
