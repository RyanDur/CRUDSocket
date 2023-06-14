import {socket} from '../socket';
import {cableFake, subscriptionDouble} from './util/fakeCable';
import {SubscriptionEventHandlers} from '../types';
import {nothing, some, Supplier} from '@ryandur/sand';
import {MockedFunction} from 'vitest';
import {Subscription} from '@rails/actioncable';

vi.mock('../cable', () => ({cable: () => vi.fn()}));

const testSubscriptionHandlers = (handlers: Partial<SubscriptionEventHandlers>): SubscriptionEventHandlers => ({
  ...handlers,
  onMessage: handlers.onMessage || nothing,
  onUnauthorized: () => void 0,
  onUnauthenticated: () => void 0
});

describe('socket', () => {
  const message = {id: 42};
  const subscriptionMock = cableFake(message);
  const channel = socket('Channel', (id) => ({id}), subscriptionMock);
  const messageHandler = vi.fn(() => some('thing'));
  const subscriptionEventHandlers = testSubscriptionHandlers({
    onMessage: messageHandler,
    onUnauthorized: void vi.fn()
  });

  it('should not allow the creation of duplicate channels', () => {
    expect(socket('Channel', (id) => ({id}), subscriptionMock)).toEqual(channel);
  });

  afterEach(() => channel.unsubscribeAll());

  describe('subscribing', () => {
    describe('when there is a message', () => {
      it('should pass the messages to the listener', () => {
        channel.subscribe('1', testSubscriptionHandlers({
          onMessage: (data) => {
            expect(data).toEqual({id: 42});
            return some('thing');
          }
        }));
      });

      it('should ignore pings', () => {
        const pingSubscriptionMock = cableFake({type: 'ping'});
        const localMessageHandler = vi.fn();
        socket('Ping Channel', (id) => ({id}), pingSubscriptionMock).subscribe('1', testSubscriptionHandlers({
          onMessage: localMessageHandler
        }));
        expect(localMessageHandler).not.toHaveBeenCalled();
      });

      it('should consume updates', () => {
        const updateSubscriptionMock = cableFake({update: 'update'});
        const updateHandler = vi.fn(() => some('thing')), messageHandler = vi.fn(nothing);

        socket('Update Channel', (id) => ({id}), updateSubscriptionMock).subscribe('1', testSubscriptionHandlers({
          onUpdate: updateHandler,
          onMessage: messageHandler
        }));

        expect(updateHandler).toHaveBeenCalled();
        expect(messageHandler).not.toHaveBeenCalled();
      });

      it('should consume deletions', () => {
        const deleteSubscriptionMock = cableFake({destroy: 'delete'});
        const deleteHandler = vi.fn(() => some('thing')), messageHandler = vi.fn(nothing);

        socket('Delete Channel', (id) => ({id}), deleteSubscriptionMock).subscribe('1', testSubscriptionHandlers({
          onDelete: deleteHandler,
          onMessage: messageHandler
        }));

        expect(deleteHandler).toHaveBeenCalled();
        expect(messageHandler).not.toHaveBeenCalled();
      });

      it('should consume creates', () => {
        const createSubscriptionMock = cableFake({create: 'create'});
        const createHandler = vi.fn(() => some('thing')), messageHandler = vi.fn(nothing);

        socket('Create Channel', (id) => ({id}), createSubscriptionMock).subscribe('1', testSubscriptionHandlers({
          onCreate: createHandler,
          onMessage: messageHandler
        }));

        expect(createHandler).toHaveBeenCalled();
        expect(messageHandler).not.toHaveBeenCalled();
      });

      it.each([
        {replace: 'replace'},
      ])('should consume replacements', (message) => {
        const replaceSubscriptionMock = cableFake(message);
        const replaceHandler = vi.fn(() => some('thing')), messageHandler = vi.fn(nothing);

        socket(`Replace ${JSON.stringify(message)} Channel`, (id) => ({id}), replaceSubscriptionMock).subscribe('1', testSubscriptionHandlers({
          onReplace: replaceHandler,
          onMessage: messageHandler
        }));

        expect(replaceHandler).toHaveBeenCalled();
        expect(messageHandler).not.toHaveBeenCalled();
      });
    });

    describe('when there is no message', () => {
      const channel = socket('Channel subscription undefined', (id) => ({id}), cableFake(undefined));

      it('should not pass the undefined messages to the listener', () => {
        channel.subscribe('1', subscriptionEventHandlers);
        expect(messageHandler).not.toHaveBeenCalled();
      });
    });
  });

  describe('unsubscribing from specific subscriptions ', () => {
    const callbackDouble = vi.fn();

    beforeEach(() => {
      (subscriptionDouble.unsubscribe as MockedFunction<Supplier<Subscription>>).mockReset();
      channel.subscribe('1', subscriptionEventHandlers);
      channel.unsubscribe('1', callbackDouble);
    });

    it('should only unsubscribe once', () => {
      channel.unsubscribe('1', callbackDouble);
      channel.unsubscribe('1', callbackDouble);
      channel.unsubscribe('1', callbackDouble);
      expect(subscriptionDouble.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should not unsubscribe from any other team subscription', () => {
      channel.subscribe('2', subscriptionEventHandlers);
      expect(subscriptionDouble.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should disconnect if there are no more subscriptions', () => {
      expect(subscriptionDouble.consumer.disconnect).toHaveBeenCalled();
    });
  });

  describe('unsubscribe from all subscriptions', () => {
    const unsubscribeAllCallbackDouble = vi.fn();

    beforeEach(() => {
      (subscriptionDouble.unsubscribe as MockedFunction<Supplier<Subscription>>).mockReset();
      channel.subscribe('1', subscriptionEventHandlers);
      channel.subscribe('2', subscriptionEventHandlers);
      channel.unsubscribeAll(unsubscribeAllCallbackDouble);
    });

    it('should be able to unsubscribe from every teams updates', () => {
      expect(subscriptionDouble.unsubscribe).toHaveBeenCalledTimes(2);
    });

    it('should trigger the callback given', () =>
      expect(unsubscribeAllCallbackDouble).toHaveBeenCalled());

    it('should disconnect if there are no more subscriptions', () => {
      expect(subscriptionDouble.consumer.disconnect).toHaveBeenCalled();
    });
  });
});
