// infrastructure/push_notify_adapter.ts
// Real-time notification infrastructure (In-memory pub/sub)

import type { IPushNotifyPort } from '../contract/push_notify_port';
import type { Channel } from '../taxonomy';

/**
 * Basic in-memory implementation of the push notification port.
 * Can be replaced with Redis/Durable Objects for distributed environments.
 */
export class PushNotifyAdapter implements IPushNotifyPort {
  private subscribers: Map<Channel, Array<(payload: unknown) => void>> = new Map();

  subscribe(channel: Channel, callback: (payload: unknown) => void): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, []);
    }
    this.subscribers.get(channel)!.push(callback);

    return () => {
      const callbacks = this.subscribers.get(channel);
      if (callbacks) {
        this.subscribers.set(
          channel,
          callbacks.filter(cb => cb !== callback)
        );
      }
    };
  }

  publish(channel: Channel, payload: unknown): void {
    const callbacks = this.subscribers.get(channel);
    if (callbacks) {
      callbacks.forEach(cb => cb(payload));
    }
  }
}
