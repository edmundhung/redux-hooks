import request, { useRequest, makeUseRequest } from '@redux-hooks/request';
import { renderHook, act } from '@testing-library/react-hooks';
import { createContext, createElement } from 'react';
import { Provider } from 'react-redux';
import { combineReducers, createStore } from 'redux';

function createReduxStore(reducer = combineReducers({ request })): Store {
    return createStore(reducer);
}

function createStoreWrapper(store = createReduxStore(), context) {
    return ({ children }) => createElement(Provider, { store, context }, children);
}

describe('makeUseRequest()', () => {
    it('accepts a baseSelector if the reducer is setup differently', () => {
        const store = createReduxStore(request);
        const wrapper = createStoreWrapper(store);
        const useHook = makeUseRequest({ baseSelector: state => state });
        const { result } = renderHook(() => useHook('test', () => Promise.resolve()), { wrapper });

        expect(result.current).toEqual([
            { requested: false, requesting: false },
            expect.any(Function),
        ]);
    });

    it('supports custom context with react-redux', () => {
        const store = createReduxStore();
        const context = createContext(null);
        const wrapper = createStoreWrapper(store, context);
        const useHook = makeUseRequest({ context });
        const { result } = renderHook(() => useHook('test', () => Promise.resolve()), { wrapper });

        expect(result.current).toEqual([
            { requested: false, requesting: false },
            expect.any(Function),
        ]);
    });
});

describe('useRequest()', () => {
    it('wraps the provided request function and returns a function to execute it', async () => {
        const wrapper = createStoreWrapper();
        const request = jest.fn().mockResolvedValue('test data');
        const { result } = renderHook(() => useRequest('test', request), {
            wrapper,
        });

        expect(result.current[1]).toEqual(expect.any(Function));

        await act(async () => {
            result.current[1]('foo', 'bar');
        });

        expect(request).toBeCalledWith('foo', 'bar');
    });

    it('populates the resolved value if the request is successful', async () => {
        const wrapper = createStoreWrapper();
        const request = jest.fn().mockResolvedValue('test data');
        const { result, waitForNextUpdate } = renderHook(() => useRequest('test', request), {
            wrapper,
        });

        expect(result.current[0]).toEqual({ requested: false, requesting: false });

        act(() => {
            result.current[1]('foo', 'bar');
        });

        expect(result.current[0]).toEqual({ requested: true, requesting: true });

        await waitForNextUpdate();

        expect(result.current[0]).toEqual({
            requested: true,
            requesting: false,
            data: 'test data',
        });
    });

    it('populates the error message if the request is unsucessful', async () => {
        const wrapper = createStoreWrapper();
        const request = jest.fn().mockRejectedValue(new Error('test message'));
        const { result, waitForNextUpdate } = renderHook(() => useRequest('test', request), {
            wrapper,
        });

        expect(result.current[0]).toEqual({ requested: false, requesting: false });

        act(() => {
            result.current[1]('foo', 'bar');
        });

        expect(result.current[0]).toEqual({ requested: true, requesting: true });

        await waitForNextUpdate();

        expect(result.current[0]).toEqual({
            requested: true,
            requesting: false,
            error: { message: 'test message' },
        });
    });

    it('caches the request result by the name', async () => {
        const wrapper = createStoreWrapper();
        const request = () => Promise.resolve('test');
        const renderHookResult1 = renderHook(() => useRequest('test', request), { wrapper });
        const renderHookResult2 = renderHook(() => useRequest('test', request), { wrapper });

        expect(renderHookResult1.result.current[0]).toEqual(renderHookResult2.result.current[0]);

        act(() => {
            renderHookResult1.result.current[1]('foo', 'bar');
        });

        expect(renderHookResult1.result.current[0].requesting).toEqual(
            renderHookResult2.result.current[0].requesting,
        );
        expect(renderHookResult1.result.current[0].data).toEqual(
            renderHookResult2.result.current[0].data,
        );

        await renderHookResult1.waitForNextUpdate();

        expect(renderHookResult1.result.current[0].requesting).toEqual(
            renderHookResult2.result.current[0].requesting,
        );
        expect(renderHookResult1.result.current[0].data).toEqual(
            renderHookResult2.result.current[0].data,
        );
    });

    it('gives information if the request has been requested yet in the current component', async () => {
        const wrapper = createStoreWrapper();
        const request = () => Promise.resolve('test');
        const renderHook1Result = renderHook(() => useRequest('test', request), { wrapper });
        const renderHook2Result = renderHook(() => useRequest('test', request), { wrapper });

        expect(renderHook1Result.result.current[0].requested).toEqual(false);
        expect(renderHook2Result.result.current[0].requested).toEqual(false);

        await act(async () => {
            renderHook1Result.result.current[1]('foo', 'bar');
        });

        expect(renderHook1Result.result.current[0].requested).toEqual(true);
        expect(renderHook2Result.result.current[0].requested).toEqual(false);

        await act(async () => {
            renderHook2Result.result.current[1]('foo', 'bar');
        });

        expect(renderHook1Result.result.current[0].requested).toEqual(true);
        expect(renderHook2Result.result.current[0].requested).toEqual(true);
    });

    it('throws error if the request reducer is not setup probably', () => {
        const store = createReduxStore((state = {}) => state);
        const wrapper = createStoreWrapper(store);
        const { result } = renderHook(() => useRequest('test', () => Promise.resolve('data')), {
            wrapper,
        });

        expect(result.error).toEqual(expect.any(Error));
    });

    it('presists the request function if the provided request reference does not change', async () => {
        const wrapper = createStoreWrapper();
        const request = jest.fn().mockRejectedValue(new Error('test message'));
        const { result, rerender } = renderHook(() => useRequest('test', request), {
            wrapper,
        });

        let prevResult = result.current;

        rerender();

        expect(prevResult).toEqual(result.current);
    });
});
