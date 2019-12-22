import { useMemo, useState, useCallback } from 'react';
import { createStoreHook, createSelectorHook, ReactReduxContext } from 'react-redux';
import { compose } from 'redux';
import { makeAction, makeSelector, State } from './reducer';
import { Request, RequestResult, Arguments } from './types';

export function makeUseRequest({
    baseSelector = (state: { request: State }) => state.request,
    context = ReactReduxContext,
} = {}) {
    const useStore = createStoreHook(context);
    const useSelector = createSelectorHook(context);

    function useRequest<P, A extends Arguments>(
        name: string,
        request: Request<A, P>,
        cacheKey = 'default',
    ): [RequestResult<P, boolean>, Request<A, RequestResult<P>>] {
        const store = useStore();
        const [requested, setRequested] = useState(false);
        const selector = useMemo(() => compose(makeSelector(name, cacheKey), baseSelector), [
            name,
            cacheKey,
        ]);
        const action = useMemo(() => makeAction(store, request, name, cacheKey), [
            store,
            request,
            name,
            cacheKey,
        ]);
        const state = useSelector(selector);
        const result = useMemo(() => ({ ...state, requested }), [state, requested]);
        const execute = useCallback(
            async (...args: A) => {
                setRequested(true);
                await action(...args);
                return selector(store.getState());
            },
            [store, action, selector],
        );

        return [result, execute];
    }

    return useRequest;
}

export default makeUseRequest();
