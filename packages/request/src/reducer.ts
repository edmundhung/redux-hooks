import { AnyAction, Store } from 'redux';
import { Arguments, Request, RequestResult } from './types';
import {
    requestPending,
    requestSuccess,
    requestFailure,
    getRequestName,
    getRequestCacheKey,
    getRequestResult,
} from './utils';

export type State = {
    [name in string]: {
        [cacheKey in string]: RequestResult<any>;
    };
};

export const initialResult: RequestResult<any> = {
    requesting: false,
    requested: undefined,
};

export function makeAction<P, A extends Arguments>(
    store: Store,
    request: Request<A, P>,
    name: string,
    cacheKey: string,
): Request<A> {
    return async (...args: A) => {
        store.dispatch({
            type: requestPending(name),
            cacheKey,
        });

        try {
            const payload = await request(...args);

            store.dispatch({
                type: requestSuccess(name),
                cacheKey,
                payload,
            });
        } catch (error) {
            store.dispatch({
                type: requestFailure(name),
                cacheKey,
                error: { message: error.message },
            });
        }
    };
}

export function makeSelector(name: string, cacheKey: string) {
    return (state?: State): RequestResult<any> => {
        if (!state) {
            throw new Error(
                'could not find request reducer state; please ensure the reducer is setup probably',
            );
        }

        return state?.[name]?.[cacheKey] ?? initialResult;
    };
}

export default function reducer(state: State = {}, action: AnyAction): State {
    const name = getRequestName(action);
    const cacheKey = getRequestCacheKey(action);
    const result = getRequestResult(action);

    if (!name || !cacheKey || !result) {
        return state;
    }

    return {
        ...state,
        [name]: {
            ...state?.[name],
            [cacheKey]: result,
        },
    };
}
