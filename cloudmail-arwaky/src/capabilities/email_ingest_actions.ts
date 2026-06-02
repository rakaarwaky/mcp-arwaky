// capabilities/email_ingest_actions.ts
// Ingests inbound emails — converts raw strings to taxonomy types, stores in DB

import type { IEmailIngestProtocol, EmailIngestInput } from '../contract/email_ingest_protocol';
import type { EmailIngestOutput } from '../contract/email_ingest_io';
import type { IDatabaseQueryPort, UpsertEmailInput, IMetricsCollectorPort, IPushNotifyPort } from '../contract';
import type { EmailId, EmailAddress, Subject, Snippet, BodyText, Timestamp, RawMime, ContentType, HeadersJson, Channel } from '../taxonomy';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';
import { asChannel, asServiceName, asAction } from '../taxonomy';

export class EmailIngestActions implements IEmailIngestProtocol {
  constructor(
    private db: IDatabaseQueryPort,
    private metrics: IMetricsCollectorPort,
    private push: IPushNotifyPort
  ) { }

  async ingestEmail(data: EmailIngestInput): Promise<EmailIngestOutput> {
    return withMetrics(this.metrics, asServiceName('email_ingest'), asAction('ingestEmail'), async () => {
      const input: UpsertEmailInput = {
        emailId: data.emailId,
        sender: data.sender,
        recipient: data.recipient,
        subject: data.subject,
        snippet: data.snippet,
        bodyText: data.bodyText,
        receivedAt: data.receivedAt,
        rawMime: data.rawMime,
        contentType: data.contentType,
        headersJson: data.headersJson,
      };

      const result = await this.db.upsertEmail(input);
      
      // Notify listeners (push-based wait)
      this.push.publish(asChannel(`user_emails_${data.recipient}`), { emailId: data.emailId });
      this.push.publish(asChannel('any_email'), { recipient: data.recipient });
      
      return result;
    });
  }
}
