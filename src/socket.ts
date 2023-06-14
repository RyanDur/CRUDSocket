import {empty, has, maybe, nothing} from '@ryandur/sand';
import {cable} from './cable';
import {Subscription} from '@rails/actioncable';
import {AppChannel} from './types';
import {PingContract, UpdateContract, CreateContract, DeleteContract, ErrorContract} from './_data_';

const logProblemWith = (message: unknown) => () => console.error('problem with:', message);
const channels: { [channelName: string]: AppChannel } = {};
const isNotAPing = (message: unknown) => maybe(PingContract.decode(message)).isNothing;

export const socket = (
  channel: string,
  params: (foo: string | number) => Record<string, string | number> = () => ({}),
  subscription = cable()
): AppChannel => {
  if (Object.hasOwn(channels, channel)) return channels[channel];
  let subscriptions: { [id: string]: Subscription } = {};

  channels[channel] = {
    name: channel,
    send: (action, id, value) => void maybe(subscriptions[String(id)])
      .map(subscription => subscription.perform(action, value))
      .or(() => {
        console.error(`no subscription for ${id}`);
        return nothing();
      }),

    subscribe: (id, {
      onCreate = nothing,
      onUpdate = nothing,
      onDelete = nothing,
      onError = nothing,
      onMessage, onUnauthenticated, onUnauthorized
    }) => {
      if (has(subscriptions[String(id)])) return;

      subscriptions = {
        ...subscriptions, [String(id)]: subscription.create({channel, ...params(id)}, {
          received: message => {
            if (has(message) && isNotAPing(message)) {
              maybe(ErrorContract.decode(message)).mBind(onError)
                .or(() => maybe(CreateContract.decode(message)).mBind(({create}) => onCreate(create)))
                .or(() => maybe(UpdateContract.decode(message)).mBind(({update}) => onUpdate(update)))
                .or(() => maybe(DeleteContract.decode(message)).mBind(({destroy}) => onDelete(destroy)))
                .or(() => onMessage(message))
                .orElse(logProblemWith(message));
            }
          },
          connected: () => {
            subscriptions[String(id)].perform('hydrate');
          },
          disconnected: () => {
            onUnauthenticated('UNAUTHENTICATED');
          },
          rejected: () => {
            onUnauthorized('UNAUTHORIZED');
          }
        })
      };
    },

    unsubscribe: (id, callback?: () => void) => {
      maybe(subscriptions[String(id)]).map((current) => {
        current.unsubscribe();
        delete subscriptions[String(id)];
        if (empty(subscriptions)) current?.consumer.disconnect();
      });
      empty(subscriptions[String(id)]) && callback?.();
    },

    unsubscribeAll: (callback?: () => void) => {
      Object.keys(subscriptions).forEach(id => {
        const current = subscriptions[id];
        current.unsubscribe();
        delete subscriptions[id];
        if (empty(subscriptions)) current?.consumer.disconnect();
      });
      empty(subscriptions) && callback?.();
    }
  };
  return channels[channel];
};
