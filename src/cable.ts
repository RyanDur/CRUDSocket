import * as ActionCable from '@rails/actioncable';
import {Consumer as CableConsumer, Subscriptions} from '@rails/actioncable';
import {not} from '@ryandur/sand';
import {hosts} from './hosts';

type Producer<T> = () => T;

const produceOnce = <T>(producer: Producer<T>): T => producer();

export const cable = produceOnce(() => {
  let socket: Subscriptions<CableConsumer>;
  return (): Subscriptions<CableConsumer> => {
    if (not(socket)) socket = ActionCable.createConsumer(hosts().SOCKET_HOST).subscriptions;
    return socket;
  };
});
