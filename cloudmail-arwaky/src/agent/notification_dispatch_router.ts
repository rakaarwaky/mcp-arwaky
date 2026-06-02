// agent/notification_dispatch_router.ts
// Notification orchestration — email ingest + OpenRouter automation pipeline
// Owns: email ingestion, extraction, verification, API key capture

import type { AgentContainer } from './di_container_registry';
import type { EmailIngestInput } from '../contract/email_ingest_protocol';
import type { AccountId, VerificationLink } from '../taxonomy';
import { asName, asCreatedBy, asServiceName } from '../taxonomy';

export interface NotificationResult {
  stored: boolean;
  automation?: {
    accountId?: AccountId;
    verificationLink?: VerificationLink;
    apiKeyExtracted?: boolean;
  };
}

export class NotificationDispatchRouter {
  constructor(private container: AgentContainer) {}

  // ── Full notification pipeline ──
  // 1. Ingest email → store in DB
  // 2. Extract verification link → update account
  // 3. Extract API key → store in account

  async handleEmailNotification(
    data: EmailIngestInput,
    _waitUntil?: (promise: Promise<unknown>) => void
  ): Promise<NotificationResult> {
    const result: NotificationResult = { stored: false };

    // Step 1: Store email (must complete)
    const ingestResult = await this.container.emailIngest.ingestEmail(data);
    result.stored = ingestResult.stored;

    if (!data.bodyText) {
      return result;
    }

    // Step 2-3: Account verification & API key extraction (can run in background)
    const bodyText = data.bodyText;
    const backgroundWork = (async () => {
      const pendingAccounts = await this.container.accountService.listPendingAccounts();
      const recipientLower = String(data.recipient || '').toLowerCase();

      for (const pending of pendingAccounts) {
        const account = await this.container.accountService.getAccount(pending.id);
        if (!account) continue;

        const targetEmailLower = account.targetEmail.full.toLowerCase();
        if (targetEmailLower !== recipientLower) continue;

        // Step 2a: Extract verification link
        const verificationLink = this.container.emailExtraction.extractVerificationLink(bodyText);
        if (verificationLink) {
          await this.container.accountService.updateVerification({
            accountId: pending.id,
            verificationLink
          });
          result.automation = result.automation || {};
          result.automation.accountId = pending.id;
          result.automation.verificationLink = verificationLink;
        }

        // Step 2b: Extract API key & complete account
        const extractedKey = this.container.emailExtraction.extractApiKey(bodyText, asServiceName(String(account.provider)));
        if (extractedKey) {
          const { apiKey } = await this.container.apiKeyManagement.createApiKey({
            name: asName(`OpenRouter-${account.provider}`),
            createdBy: asCreatedBy(String(pending.inboxId))
          });
          await this.container.accountService.markComplete({
            accountId: pending.id,
            apiKeyId: apiKey.id
          });
          result.automation = result.automation || {};
          result.automation.apiKeyExtracted = true;
        }
        break;
      }
    })();

    _waitUntil?.(backgroundWork);

    return result;
  }
}