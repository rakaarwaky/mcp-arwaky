// contract/email_fetch_protocol.ts
import type { Email, EmailId, UserId, Subject, SearchFrom } from '../taxonomy';
import type { TimeoutSeconds, PollIntervalSeconds } from '../taxonomy';

export interface IEmailFetchProtocol {
  getEmail(userId: UserId, emailId: EmailId): Promise<Email | null>;
  waitForEmail(
    userId: UserId,
    options?: { from?: SearchFrom; subject?: Subject; timeout?: TimeoutSeconds; pollInterval?: PollIntervalSeconds }
  ): Promise<Email | null>;
}
