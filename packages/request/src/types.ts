import { Action } from 'redux';

export type Arguments = any[];

export interface RequestAction<P = any> extends Action<string> {
    cacheKey: string;
    payload?: P;
    error?: RequestError;
}

export interface RequestError {
    message: string;
}

export interface RequestResult<P, T = undefined> {
    requesting: boolean;
    requested: T;
    data?: Payload;
    error?: RequestError;
}

export type Request<Args extends Arguments, Payload = void> = (...args: Args) => Promise<Payload>;
