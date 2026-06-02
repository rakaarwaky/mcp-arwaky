// contract/push_notify_port.ts
// Port for real-time notifications (Push/WebSocket)

/**
 * Interface for internal notification bus (for push-based flows).
 */
import type { Channel } from '../taxonomy';

export interface IPushNotifyPort {
  /**
   * Subscribes to a channel.
   * @returns A function to unsubscribe.
   */
  subscribe(channel: Channel, callback: (payload: unknown) => void): () => void;

  /**
   * Publishes a message to a channel.
   */
  publish(channel: Channel, payload: unknown): void;
}
