import {SubscriptionEventHandlers} from './SubscriptionEventHandlers';


type ChannelId = (string | 'currentUser')

export interface AppChannel {
    name: string;
    send: (action: string, id: ChannelId, value?: object) => void
    subscribe: (id: ChannelId, subscriptionEventHandlers: SubscriptionEventHandlers) => void;
    unsubscribe: (id: ChannelId, callback?: () => void) => void;
    unsubscribeAll: (callback?: () => void) => void;
}
