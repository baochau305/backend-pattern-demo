import type { Queue } from 'bullmq';
import {
  AnalyticsJob,
  EmailJob,
  type AnalyticsEventPayload,
  type OrderConfirmationPayload,
} from './jobs.js';

/**
 * Thin producer-side facade over the BullMQ queues. Services depend on this
 * abstraction rather than on BullMQ directly, which keeps enqueue calls type-safe
 * and makes the queue trivial to stub in unit tests.
 */
export class QueuePublisher {
  constructor(
    private readonly emailQueue: Queue<OrderConfirmationPayload>,
    private readonly analyticsQueue: Queue<AnalyticsEventPayload>,
  ) {}

  async orderConfirmation(payload: OrderConfirmationPayload): Promise<void> {
    await this.emailQueue.add(EmailJob.ORDER_CONFIRMATION, payload);
  }

  async analyticsEvent(payload: AnalyticsEventPayload): Promise<void> {
    await this.analyticsQueue.add(AnalyticsJob.EVENT, payload);
  }
}
