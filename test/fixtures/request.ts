import request from '@redux-hooks/request';
import { Store, combineReducers } from 'redux';
import * as baseStore from './store';

interface MockRequest extends Promise {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
}

export function createMockRequest(): [
    () => Promise<any>,
    (value: any, index: number) => void,
    (error: Error, index: number) => void,
] {
    let resolves: Array<(value: any) => void> = [];
    let rejects: Array<(error: Error) => void> = [];

    const mockRequest = jest.fn().mockImplementation(
        () =>
            new Promise((resolve, reject) => {
                resolves.push(resolve);
                rejects.push(reject);
            }),
    );

    return [
        mockRequest,
        (value: any, index = 0) => {
            resolves?.[index]?.(value);
        },
        (error: Error, index = 0) => {
            rejects?.[index]?.(error);
        },
    ];
}

export function createStore(reducer = combineReducers({ request })): Store {
    return baseStore.createStore(reducer);
}

export function createStoreWrapper(store = createStore(), context) {
    return baseStore.createStoreWrapper(store, context);
}
