import {Maybe} from '@ryandur/sand';

export interface SubscriptionEventHandlers {
    onMessage: (message: unknown) => Maybe<unknown>;    onReplace?: (value: unknown) => Maybe<unknown>;
    onCreate?: (value: unknown) => Maybe<unknown>;
    onUpdate?: (value: unknown) => Maybe<unknown>;
    onDelete?: (value: unknown) => Maybe<unknown>;
    onError?: (value: unknown) => Maybe<unknown>;
    onUnauthorized: (explanation: unknown) => void;
    onUnauthenticated: (explanation: unknown) => void;
}
