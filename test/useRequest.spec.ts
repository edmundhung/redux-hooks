import request, { useRequest, makeUseRequest } from '@redux-hooks/request';
import '@testing-library/jest-dom';
import { render, fireEvent, waitForDomChange, cleanup } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react-hooks';
import React, { createContext, useState, useEffect } from 'react';
import { createStore, createStoreWrapper, createMockRequest } from './fixtures/request';

describe('makeUseRequest()', () => {
    it('accepts a baseSelector if the reducer is setup differently', () => {
        const store = createStore(request);
        const wrapper = createStoreWrapper(store);
        const useHook = makeUseRequest({ baseSelector: state => state });
        const { result } = renderHook(() => useHook('test', () => Promise.resolve()), { wrapper });

        expect(result.current).toEqual(expect.any(Array));
        expect(result.current[0]).toEqual({ requesting: false });
        expect(result.current[1]).toEqual(expect.any(Function));
        expect(result.current[2]).toEqual(expect.any(Function));
    });

    it('supports custom context with react-redux', () => {
        const store = createStore();
        const context = createContext(null);
        const wrapper = createStoreWrapper(store, context);
        const useHook = makeUseRequest({ context });
        const { result } = renderHook(() => useHook('test', () => Promise.resolve()), { wrapper });

        expect(result.current).toEqual(expect.any(Array));
        expect(result.current[0]).toEqual({ requesting: false });
        expect(result.current[1]).toEqual(expect.any(Function));
        expect(result.current[2]).toEqual(expect.any(Function));
    });
});

describe('useRequest()', () => {
    afterEach(cleanup);

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

        expect(result.current[0]).toEqual({ requesting: false });

        act(() => {
            result.current[1]('foo', 'bar');
        });

        expect(result.current[0]).toEqual({ requesting: true });

        await waitForNextUpdate();

        expect(result.current[0]).toEqual({
            requesting: false,
            data: 'test data',
        });
    });

    it('populates the error message if the request is unsuccessful', async () => {
        const wrapper = createStoreWrapper();
        const request = jest.fn().mockRejectedValue(new Error('test message'));
        const { result, waitForNextUpdate } = renderHook(() => useRequest('test', request), {
            wrapper,
        });

        expect(result.current[0]).toEqual({ requesting: false });

        act(() => {
            result.current[1]('foo', 'bar');
        });

        expect(result.current[0]).toEqual({ requesting: true });

        await waitForNextUpdate();

        expect(result.current[0]).toEqual({
            requesting: false,
            error: { message: 'test message' },
        });
    });

    it('caches the request result by the combination of name & cacheKey', async () => {
        const wrapper = createStoreWrapper();
        const request = () => Promise.resolve('test');
        const renderHookResult1 = renderHook(() => useRequest('test', request, 'key'), { wrapper });
        const renderHookResult2 = renderHook(() => useRequest('test', request, 'key'), { wrapper });

        expect(renderHookResult1.result.current[0]).toEqual(renderHookResult2.result.current[0]);

        act(() => {
            renderHookResult1.result.current[1]('foo', 'bar');
        });

        expect(renderHookResult1.result.current[0]).toEqual(renderHookResult2.result.current[0]);

        await renderHookResult1.waitForNextUpdate();

        expect(renderHookResult1.result.current[0]).toEqual(renderHookResult2.result.current[0]);
    });

    it('assigns a unique cache key to the request if not provided', async () => {
        const wrapper = createStoreWrapper();
        const request = () => Promise.resolve('test');
        const renderHookResult1 = renderHook(() => useRequest('test', request), { wrapper });
        const renderHookResult2 = renderHook(() => useRequest('test', request), { wrapper });

        expect(renderHookResult1.result.current[0]).toEqual(renderHookResult2.result.current[0]);

        act(() => {
            renderHookResult1.result.current[1]('foo', 'bar');
        });

        expect(renderHookResult1.result.current[0]).not.toEqual(
            renderHookResult2.result.current[0],
        );

        await renderHookResult1.waitForNextUpdate();

        expect(renderHookResult1.result.current[0]).not.toEqual(
            renderHookResult2.result.current[0],
        );
    });

    it('throws error if the request reducer is not setup probably', () => {
        const store = createStore((state = {}) => state);
        const wrapper = createStoreWrapper(store);
        const { result } = renderHook(() => useRequest('test', () => Promise.resolve('data')), {
            wrapper,
        });

        expect(result.error).toEqual(expect.any(Error));
    });

    it('recreates the request function when the cacheKey changes', async () => {
        const wrapper = createStoreWrapper();
        const { result, rerender } = renderHook(
            ({ id }) => useRequest('test', (): Promise<string> => Promise.resolve(id), id),
            { wrapper, initialProps: { id: 'foo' } },
        );

        let prevRequest;

        prevRequest = result.current[1];
        rerender();
        expect(result.current[1]).toBe(prevRequest);

        prevRequest = result.current[1];
        rerender({ id: 'bar' });
        expect(result.current).not.toBe(prevRequest);

        prevRequest = result.current[1];
        rerender({ id: 'bar' });
        expect(result.current[1]).toBe(prevRequest);
    });

    it('does not recreate the request function if it is setup with no cacheKey', async () => {
        const wrapper = createStoreWrapper();
        const { result, waitForNextUpdate } = renderHook(
            () => useRequest('test', data => Promise.resolve(data)),
            { wrapper },
        );

        let prevRequest;

        prevRequest = result.current[1];

        act(() => {
            prevRequest('foo');
        });

        await waitForNextUpdate();

        expect(result.current[1]).toBe(prevRequest);

        prevRequest = result.current[1];

        act(() => {
            prevRequest('bar');
        });

        await waitForNextUpdate();

        expect(result.current[1]).toBe(prevRequest);
    });

    it('ignores response with consecutive requests except the last one', async () => {
        const wrapper = createStoreWrapper();
        const [mockRequest, resolve, reject] = createMockRequest();
        const { result } = renderHook(() => useRequest('request', mockRequest), {
            wrapper,
        });

        await act(async () => {
            result.current[1]('foo');
        });

        expect(result.current[0]).toEqual({ requesting: true });

        await act(async () => {
            result.current[1]('bar');
        });

        expect(result.current[0]).toEqual({ requesting: true });

        await act(async () => {
            resolve('test', 1);
        });

        expect(result.current[0]).toEqual({ requesting: false, data: 'test' });

        await act(async () => {
            reject(new Error('error'), 0);
        });

        expect(result.current[0]).toEqual({ requesting: false, data: 'test' });

        await act(async () => {
            result.current[1]('oops');
        });

        expect(result.current[0]).toEqual({ requesting: true });

        await act(async () => {
            reject(new Error('error 2'), 2);
        });

        expect(result.current[0]).toEqual({ requesting: false, error: { message: 'error 2' } });
    });

    it('provides an `onComplete()` hook for response handling', async () => {
        const wrapper = createStoreWrapper();
        const mockCompleteHandler = jest.fn();
        const mockRequest = () => Promise.resolve('foobar');
        const TestComponent: React.FunctionComponent = () => {
            const [result, request, onComplete] = useRequest('test', mockRequest);
            const [isRequested, setRequested] = useState(false);

            useEffect(() => {
                return onComplete((...args) => {
                    mockCompleteHandler(...args);
                    setRequested(true);
                });
            }, [onComplete]);

            return React.createElement(
                React.Fragment,
                {},
                React.createElement(
                    'button',
                    { onClick: () => request('test arguments') },
                    'Button',
                ),
                React.createElement('div', {}, result.requesting ? 'Requesting' : 'Not requesting'),
                React.createElement('div', {}, isRequested ? 'Requested' : 'Not requested'),
                React.createElement('div', {}, result.data ?? 'No data'),
            );
        };
        const { container, getByText } = render(React.createElement(TestComponent), {
            wrapper,
        });

        expect(getByText('Not requesting')).toBeInTheDocument();
        expect(getByText('Not requested')).toBeInTheDocument();
        expect(getByText('No data')).toBeInTheDocument();
        expect(mockCompleteHandler).not.toBeCalled();

        fireEvent.click(getByText('Button'));

        expect(getByText('Requesting')).toBeInTheDocument();
        expect(getByText('Not requested')).toBeInTheDocument();
        expect(getByText('No data')).toBeInTheDocument();
        expect(mockCompleteHandler).not.toBeCalled();

        await waitForDomChange({ container });

        expect(getByText('Not requesting')).toBeInTheDocument();
        expect(getByText('Requested')).toBeInTheDocument();
        expect(getByText('foobar')).toBeInTheDocument();
        expect(mockCompleteHandler).toBeCalledWith({ requesting: false, data: 'foobar' }, [
            'test arguments',
        ]);
    });

    it('makes response handling with the onComplete hook safe', () => {
        const wrapper = createStoreWrapper();
        const mockCompleteHandler = jest.fn();
        const [mockRequest, resolve] = createMockRequest();
        const TestComponent: React.FunctionComponent = () => {
            const [, request, onComplete] = useRequest('test', mockRequest);

            useEffect(() => {
                return onComplete((...args) => {
                    mockCompleteHandler(...args);
                });
            }, [onComplete]);

            return React.createElement(
                React.Fragment,
                {},
                React.createElement(
                    'button',
                    { onClick: () => request('test arguments') },
                    'Button',
                ),
            );
        };
        const { getByText, unmount } = render(React.createElement(TestComponent), {
            wrapper,
        });

        expect(mockCompleteHandler).not.toBeCalled();

        fireEvent.click(getByText('Button'));

        expect(mockCompleteHandler).not.toBeCalled();

        unmount();

        expect(mockCompleteHandler).not.toBeCalled();

        resolve('Test data');

        expect(mockCompleteHandler).not.toBeCalled();
    });
});
