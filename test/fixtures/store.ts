import React from 'react';
import { Provider } from 'react-redux';

export { createStore } from 'redux';

export function createStoreWrapper(store, context) {
    return ({ children }) => React.createElement(Provider, { store, context }, children);
}
