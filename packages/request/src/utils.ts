import { AnyAction } from 'redux';
import { RequestError, RequestState } from './types';

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

export function getRequestTimestamp(action: AnyAction): number {
    return Number(action.timestamp);
}

export function getRequestData(action: AnyAction): any | undefined {
    return action.payload;
}

export function getRequestError(action: AnyAction): RequestError | undefined {
    return action.error;
}

export function getRequestState(state: RequestState, action: AnyAction): RequestState {
    const name = getRequestName(action) ?? '';
    const timestamp = getRequestTimestamp(action);

    if (!name || isNaN(timestamp)) {
        return state;
    }

    const data = getRequestData(action);
    const error = getRequestError(action);

    let nextState;

    switch (action.type) {
        case requestPending(name):
            if (timestamp <= state.lastRequestTimestamp) {
                nextState = state;
            } else {
                nextState = { ...state, lastRequestTimestamp: timestamp };
            }
            break;
        case requestSuccess(name):
        case requestFailure(name):
            if (timestamp <= state.lastResponseTimestamp) {
                nextState = state;
            } else {
                nextState = { ...state, data, error, lastResponseTimestamp: timestamp };
            }
            break;
        default:
            nextState = state;
            break;
    }

    return nextState;
}
