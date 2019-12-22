import { AnyAction } from 'redux';
import { RequestError, RequestResult } from './types';

export function requestPending(name: string): string {
    return `request/${name}/pending`;
}

export function requestSuccess(name: string): string {
    return `request/${name}/success`;
}

export function requestFailure(name: string): string {
    return `request/${name}/failure`;
}

export function getRequestName(action: AnyAction): string | null {
    const [, name = ''] = action.type.split('/');

    switch (action.type) {
        case requestPending(name):
        case requestSuccess(name):
        case requestFailure(name):
            return name;
    }

    return null;
}

export function getRequestCacheKey(action: AnyAction): string | null {
    return action.cacheKey ?? null;
}

export function getRequestData<P>(action: AnyAction): P | null {
    return action.payload ?? null;
}

export function getRequestError(action: AnyAction): RequestError | null {
    return action.error ?? null;
}

export function getRequestResult<P>(action: AnyAction): RequestResult<P> | null {
    const name = getRequestName(action);

    if (!name) {
        return null;
    }

    const data = getRequestData(action);
    const error = getRequestError(action);

    let result: RequestResult<P> | null = null;

    switch (action.type) {
        case requestPending(name):
            result = { requesting: true, requested: undefined };
            break;
        case requestSuccess(name):
            result = data !== null ? { requesting: false, requested: undefined, data } : null;
            break;
        case requestFailure(name):
            result = error !== null ? { requesting: false, requested: undefined, error } : null;
            break;
        default:
            break;
    }

    return result;
}
