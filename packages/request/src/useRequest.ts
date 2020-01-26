import { useMemo, useCallback, useRef, useState } from 'react';
import { createStoreHook, createSelectorHook, ReactReduxContext } from 'react-redux';
import { compose } from 'redux';
import { makeAction, makeSelector, State } from './reducer';
import { Request, RequestResult, RequestHookResult, Arguments, RequestState } from './types';

export function makeUseRequest({
    baseSelector = (state: { request: State }) => state.request,
    context = ReactReduxContext,
    generateRequestId = (): string => `${Date.now() + Math.random()}`,
} = {}) {
    const useStore = createStoreHook(context);
    const useSelector = createSelectorHook(context);

    let prevResult: RequestResult, prevState: RequestState;

    function computeResult(nextState: RequestState): RequestResult {
        if (prevResult && nextState === prevState) {
            return prevResult;
        }

        prevState = nextState;
        prevResult = {
            requesting:
                !isNaN(nextState.lastRequestTimestamp) &&
                (isNaN(nextState.lastResponseTimestamp) ||
                    nextState.lastResponseTimestamp < nextState.lastRequestTimestamp),
            data: nextState.data,
            error: nextState.error,
        };

        return prevResult;
    }

    function useRequest<P, A extends Arguments>(
        name: string,
        request: Request<A, P>,
        cacheKey?: string,
    ): RequestHookResult<P, A> {
        const store = useStore();
        const hooks = useRef<Request<[RequestResult<P>, A]>[]>([]);
        const [requestId, setRequestId] = useState<string | null>(null);
        const cachedRequest = useCallback(request, [cacheKey]);
        const selector = useMemo(
            () => compose(makeSelector(name, cacheKey ?? requestId), baseSelector),
            [name, cacheKey, requestId],
        );
        const state = useSelector(selector);
        const result = computeResult(state);
        const execute = useCallback(
            async (...args: A) => {
                const requestId = generateRequestId();

                if (!cacheKey) {
                    setRequestId(requestId);
                }

                const action = makeAction(store, cachedRequest, name, cacheKey ?? requestId);

                await action(...args);

                const state = store.getState();
                const selector = compose(
                    computeResult,
                    makeSelector(name, cacheKey ?? requestId),
                    baseSelector,
                );
                const result = selector(state);

                hooks.current.forEach(hook => hook(result, args));
            },
            [store, name, cacheKey, cachedRequest],
        );

        const onComplete = useCallback((hook: Request<[RequestResult<P>, A]>) => {
            hooks.current.push(hook);

            return () => {
                hooks.current = hooks.current.filter(h => h !== hook);
            };
        }, []);

        return [result, execute, onComplete];
    }

    return useRequest;
}

export default makeUseRequest();
