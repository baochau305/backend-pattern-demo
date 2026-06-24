/**
 * Queue and job-name catalogue plus the payload type for each job.
 *
 * Centralising names and payloads keeps producers (services) and consumers
 * (workers) in sync and fully type-checked: a producer cannot enqueue a payload
 * shape the worker does not expect.
 */
export const QueueName = {
  EMAIL: 'email',
  ANALYTICS: 'analytics',
} as const;

export type QueueName = (typeof QueueName)[keyof typeof QueueName];

export const EmailJob = {
  ORDER_CONFIRMATION: 'order-confirmation',
} as const;

export const AnalyticsJob = {
  EVENT: 'event',
} as const;

export interface OrderConfirmationPayload {
  orderId: string;
  userId: string;
}

export interface AnalyticsEventPayload {
  event: string;
  userId?: string;
  properties?: Record<string, unknown>;
  timestamp: string;
}
