# TypeScript Network Client

A flexible and powerful TypeScript HTTP client with middleware support, customizable request/response handling, and comprehensive type safety.

## Features

- 🚀 Full TypeScript support with comprehensive type definitions
- ⚡️ Promise-based API with async/await
- 🔄 Middleware system for request/response interceptors
- ⏱️ Configurable timeout handling
- 🎯 Custom response handlers
- 🔍 Detailed error handling
- 📝 Request ID tracking
- 🔒 Automatic content type handling

## Installation

```bash
npm install ts-network-client
# or
yarn add ts-network-client
# or
pnpm add ts-network-client
```

## Quick Start

```typescript
import createNetworkClient from 'ts-network-client';

// Create a client instance
const client = createNetworkClient({
  baseUrl: 'https://api.example.com',
  defaultHeaders: {
    'Authorization': 'Bearer your-token'
  },
  defaultTimeout: 5000
});

// Make requests
async function fetchUsers() {
  const response = await client.get<User[]>('/users');
  
  if (response.success) {
    console.log(response.data);
  } else {
    console.error(response.error);
  }
}
```

## Configuration

The client can be configured with various options:

```typescript
interface NetworkClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  defaultTimeout?: number;
  middleware?: Middleware[];
  responseHandler?: <T>(response: Response) => Promise<T>;
}
```

## Making Requests

The client supports all standard HTTP methods:

```typescript
// GET request
const getData = await client.get<ResponseType>('/endpoint');

// POST request with body
const postData = await client.post<ResponseType>('/endpoint', {
  name: 'John',
  email: 'john@example.com'
});

// PUT request with options
const putData = await client.put<ResponseType>('/endpoint', body, {
  headers: { 'Custom-Header': 'value' },
  timeout: 3000
});

// DELETE request
const deleteData = await client.delete<ResponseType>('/endpoint');
```

## Response Structure

All requests return a typed Response object:

```typescript
interface Response<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
  status?: number;
  headers?: Headers;
}

interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}
```

## Middleware System

The middleware system allows you to intercept and modify requests and responses:

```typescript
const loggingMiddleware: Middleware = {
  beforeRequest: async (context) => {
    console.log(`Request ${context.requestId} starting:`, {
      method: context.method,
      url: context.url
    });
    return context;
  },
  afterResponse: async (context) => {
    console.log(`Request ${context.requestId} completed:`, {
      status: context.response.status
    });
    return context;
  }
};

const client = createNetworkClient({
  baseUrl: 'https://api.example.com',
  middleware: [loggingMiddleware]
});
```

## Custom Response Handlers

You can provide custom response handlers at both the client and request level:

```typescript
// Client-level custom handler
const client = createNetworkClient({
  baseUrl: 'https://api.example.com',
  responseHandler: async (response) => {
    const data = await response.json();
    return data.results; // Transform response structure
  }
});

// Request-level custom handler
const response = await client.get('/endpoint', {
  responseHandler: async (response) => {
    const text = await response.text();
    return JSON.parse(text).customField;
  }
});
```

## TypeScript Support
The client is fully typed and provides excellent TypeScript support:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Response will be typed as Response<User[]>
const users = await client.get<User[]>('/users');

// TypeScript will ensure the body matches the expected type
const newUser = await client.post<User>('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});
```

## Error Handling

The client provides detailed error information:

```typescript
const response = await client.get<User[]>('/users');

if (!response.success) {
  console.error({
    message: response.error?.message,
    status: response.error?.status,
    details: response.error?.details
  });
  return;
}

// TypeScript knows response.data is User[] here
const users = response.data;
```

## License
View LICENSE.md
