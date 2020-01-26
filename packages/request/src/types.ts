import { Action } from 'redux';

export type Arguments = any[];

export interface RequestAction extends Action<string> {
    cacheKey: string;
    timestamp: number;
    payload?: any;
    error?: RequestError;
}

export interface RequestError {
    message: string;
}

export interface RequestResult<P = any> {
    requesting: boolean;
    data?: P;
    error?: RequestError;
}

export interface RequestState {
    lastResponseTimestamp: number;
    lastRequestTimestamp: number;
    data?: P;
    error?: RequestError;
}

export type Request<A extends Arguments, P = void> = (...args: A) => P;

export type RequestHookResult<P, A extends Arguments> = [
    RequestResult<P>,
    Request<A>,
    (hook: Request<[RequestResult<P>, A]>) => () => void,
];
