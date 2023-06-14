import {Subscription, Subscriptions} from '@rails/actioncable';

export const subscriptionDouble = {
  unsubscribe: vi.fn(),
  consumer: {
    disconnect: vi.fn()
  }
} as unknown as Subscription;
export const receivedDouble = vi.fn();
export const cableFake = (message: unknown) => ({
  create: (_: unknown, mixin = {
    received: receivedDouble
  }): Subscription => {
    mixin.received(message);
    return subscriptionDouble;
  }
} as unknown as Subscriptions);
