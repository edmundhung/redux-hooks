import { AnyAction, Store } from 'redux';
import { Arguments, Request, RequestState } from './types';
import {
    requestPending,
    requestSuccess,
    requestFailure,
    getRequestName,
    getRequestCacheKey,
    getRequestState,
} from './utils';

export type State = {
    [name in string]: {
        [cacheKey in string]: RequestState;
    };
};

export const initialState: RequestState = {
    lastRequestTimestamp: NaN,
    lastResponseTimestamp: NaN,
};

export function makeAction<P, A extends Arguments>(
    store: Store,
    request: Request<A, P>,
    name: string,
    cacheKey: string,
    timestamp = Date.now(),
): Request<A> {
    return async (...args: A) => {
        store.dispatch({
            type: requestPending(name),
            cacheKey,
            timestamp,
        });

        try {
            const payload = await request(...args);

            store.dispatch({
                type: requestSuccess(name),
                cacheKey,
                timestamp,
                payload,
            });
        } catch (error) {
            store.dispatch({
                type: requestFailure(name),
                cacheKey,
                timestamp,
                error: { message: error.message },
            });
        }
    };
}

export function makeSelector(name: string, cacheKey: string | null) {
    return (state?: State): RequestState => {
        if (!state) {
            throw new Error(
                'could not find request reducer state; please ensure the reducer is setup probably',
            );
        }

        if (cacheKey === null) {
            return initialState;
        }

        return state?.[name]?.[cacheKey] ?? initialState;
    };
}

export default function reducer(state: State = {}, action: AnyAction): State {
    const name = getRequestName(action);
    const cacheKey = getRequestCacheKey(action);

    if (!name || !cacheKey) {
        return state;
    }

    const prevState = state?.[name]?.[cacheKey] ?? initialState;
    const nextState = getRequestState(prevState, action);

    if (nextState === prevState) {
        return state;
    }

    return {
        ...state,
        [name]: {
            ...state?.[name],
            [cacheKey]: nextState,
        },
    };
}
