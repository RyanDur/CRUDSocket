import {empty, has, maybe, nothing} from '@ryandur/sand';
import {explanation} from '../http';
import {cable} from './cable';
import {AuthStates} from '../../domain/auth/_data_';
import {Subscription} from '@rails/actioncable';
import {AppChannel} from './types';
import {performance} from '../performance';
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
  const performanceListeners = performance();

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
              performanceListeners.onMessage?.(channel);
            }
          },
          connected: () => {
            performanceListeners.onConnected?.(channel);
            subscriptions[String(id)].perform('hydrate');
          },
          disconnected: () => {
            performanceListeners.onDisconnected?.(channel);
            onUnauthenticated(explanation(AuthStates.UNAUTHENTICATED));
          },
          rejected: () => {
            performanceListeners.onRejected?.(channel);
            onUnauthorized(explanation(AuthStates.UNAUTHORIZED));
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
