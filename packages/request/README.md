# `useRequest`

> A react hook designed for managing request state with Redux

## Installation

`redux-hooks` requires the following packages:
1. react@16.8.3 or later
2. react-redux@7.1.0 or later
3. redux@2.0.0 or later

```
npm install --save @redux-hooks/request
```

## Getting Started

### 1. Setup the request reducer

```js
import request from '@redux-hooks/request';

const reducer = combineReducer({
  request,
  // ... and your other reducers
});

export default reducer;
```

### 2. Enjoy the hook
```js
import { useRequest } from '@redux-hooks/request';
import React, { useEffect } from 'react';
import TodoList from './TodoList';

function getTodos() {
  return fetch('/todos').then(response => response.json());
}

function Todos() {
  const [result, request] = useRequest('GET_TODOS', getTodos);

  useEffect(() => {
    request();
  }, [request]);

  if (!result.requested || !result.requesting) {
    return 'Loading';
  }

  if (result.error) {
    return result.error;
  }

  return (
    <TodoList todos={result.data}>
  )
}

export default Todos;
```

## API Reference

- [useRequest](#useRequest)
- [makeUseRequest](#makeUseRequest)

### useRequest

```js
useRequest(
  name: string,
  request: (...args: Args[]) => Promise<Data>,
  cacheKey?: string,
): [
  RequestResult<Data>,
  (...args: Args[]) => Promise<RequestResult<Data>>
];
```

#### Arguments

1. `name: string`:
Name of the request. It must be unique across all requests.

2. `request: (...args: Args[]) => Promise<Data>`:
The request function. It should return a promise.

3. `cacheKey?: string`:
The request result will be cached by the provided cache key.

#### Usage

```js
import { useRequest } from '@redux-hooks/request';
import { useEffect } from 'react';

function getTodo(todoId: string) {
  return fetch(`/todo/${todoId}`).then(response => response.json());
}

function useTodo(todoId: string) {
  const [result, request] = useRequest('TODO', getTodo, todoId);

  useEffect(() => {
    request(todoId);
  }, [request, todoId]);

  return result;
}

export default useTodo;
```

### makeUseRequest

Factory for making the `useRequest` hook

```js
makeUseRequest({
  baseSelector?: (state: any) => State,
  context?: React.Context,
}): useRequestHook;
```

#### Options

1. `baseSelector: (state: any) => State`:
Required if the request reducer is setup different from the [default approach](#1.-Setup-the-request-reducer)

2. `context: React.Context`:
Required if multiple stores are set
