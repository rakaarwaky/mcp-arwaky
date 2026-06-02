// agent/inbox_query_router.ts
// Inbox domain router — email listing, fetch, actions, wait/poll
// Owns: inbox queries, individual email retrieval, email actions

import type { AgentContainer } from './di_container_registry';
import type { UserId, EmailId, SearchFrom, Subject, TimeoutSeconds, PollIntervalSeconds, EmailAction, Actor, EmailQuickAction, InboxId } from '../taxonomy';
import { asActor } from '../taxonomy';

export class InboxQueryRouter {
  constructor(private container: AgentContainer) { }

  async getUserInbox(userId: UserId) {
    return this.container.inboxManage.getUserInbox(userId);
  }

  async getInboxMessages(userId: UserId, _inboxId: InboxId) {
    // inboxId is same as userId in current data model; validate if provided
    return this.container.inboxManage.getUserInbox(userId);
  }

  async getAllEmails() {
    return this.container.inboxManage.getAllEmails();
  }

  async getEmail(userId: UserId, emailId: EmailId) {
    return this.container.emailFetch.getEmail(userId, emailId);
  }

  async getEmailGlobal(emailId: EmailId) {
    return this.container.database.getEmailGlobal(emailId);
  }

  async getMessageDetails(userId: UserId, messageId: EmailId) {
    return this.container.emailFetch.getEmail(userId, messageId);
  }

  async waitForEmail(
    userId: UserId,
    options?: { from?: SearchFrom; subject?: Subject; timeout?: TimeoutSeconds; pollInterval?: PollIntervalSeconds }
  ) {
    return this.container.emailFetch.waitForEmail(userId, options);
  }

  async applyEmailAction(userId: UserId, emailId: EmailId, action: EmailAction, actor?: Actor) {
    const resolvedActor = actor ?? asActor(`web:${userId}`);
    return this.container.inboxManage.applyEmailAction(userId, emailId, action as EmailQuickAction, resolvedActor);
  }
}
