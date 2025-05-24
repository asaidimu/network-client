# @asaidimu/network-client

A lightweight, type-safe HTTP client for browser environments with
powerful middleware, retry, and caching capabilities, designed for
building robust API SDKs.

[![npm version](https://img.shields.io/npm/v/@asaidimu/network-client.svg?style=flat-square)](https://www.npmjs.com/package/@asaidimu/network-client)
[![npm license](https://img.shields.io/npm/l/@asaidimu/network-client.svg?style=flat-square)](https://www.npmjs.com/package/@asaidimu/network-client)
[![Build Status](https://img.shields.io/github/actions/workflow/status/asaidimu/network-client/ci.yml?branch=main&label=Build&style=flat-square)](https://github.com/asaidimu/network-client/actions/workflows/ci.yml)

---

## 📚 Table of Contents

*   [Overview & Features](#-overview--features)
*   [Installation](#-installation)
*   [Quick Start](#-quick-start)
*   [Configuration](#-configuration)
*   [Making Requests](#-making-requests)
    *   [HTTP Methods](#http-methods)
    *   [Request Options](#request-options)
    *   [Body Serialization](#body-serialization)
    *   [Response Parsing](#response-parsing)
*   [Response Structure](#-response-structure)
*   [Middleware & Interceptors](#-middleware--interceptors)
*   [Retry Mechanism](#-retry-mechanism)
*   [Client-Side Caching](#-client-side-caching)
*   [Building SDKs](#-building-sdks)
*   [Error Handling](#-error-handling)
*   [TypeScript Support](#-typescript-support)
*   [Project Architecture](#-project-architecture)
*   [Development & Contributing](#-development--contributing)
*   [Additional Information](#-additional-information)

---

## 💡 Overview & Features

`@asaidimu/network-client` is a modern, promise-based HTTP client
meticulously crafted for browser environments. It leverages the native
`fetch` API, providing a type-safe and highly configurable solution for
interacting with RESTful APIs. Beyond basic request functionality, this
client introduces a robust middleware system, intelligent request/response
handling, configurable retry logic, and an opt-in caching mechanism,
making it an ideal foundation for building scalable and maintainable API
integrations or even full-fledged SDKs.

This library aims to simplify complex network operations by providing
a clean, intuitive API while exposing powerful extension points. Whether
you need fine-grained control over request headers, custom body
serialization, automated retries for transient failures, or a shared
caching layer, `@asaidimu/network-client` delivers the flexibility and
reliability required for modern web applications.

### ✨ Key Features

*   **Comprehensive Type Safety**: Full TypeScript support with detailed
    interfaces for requests, responses, errors, and configuration.
*   **Promise-Based API**: Asynchronous operations handled elegantly with
    `async/await`.
*   **Flexible Configuration**: Set base URLs, default headers, and
    timeouts at the client level.
*   **Extensible Middleware System**: Intercept and modify requests,
    responses, and errors at various stages of the lifecycle.
*   **Smart Body Serialization**: Automatic detection and serialization
    for JSON, FormData, URLSearchParams, text, blob, and streams.
*   **Intelligent Response Parsing**: Automatically parses JSON, text,
    blob, ArrayBuffer, or FormData based on `Content-Type` headers, with
    explicit override options.
*   **Configurable Retry Logic**: Implement robust retry strategies with
    exponential or linear backoff for transient network issues.
*   **Built-in Client-Side Caching**: Simple, configurable cache for GET
    requests with Time-To-Live (TTL).
*   **Dedicated SDK Base Class**: Provides a `BaseSDK` class to simplify
    the creation of modular and reusable API SDKs.
*   **Extendable Client Instances**: Clone and extend existing client
    configurations to create specialized instances without modifying the
    original.
*   **Abort Signal Integration**: Native support for `AbortSignal` for
    request cancellation and timeout handling.
*   **Raw Response Access**: Provides access to the underlying `Response`
    object for advanced use cases (e.g., streaming).

---

## 🚀 Installation

### Prerequisites

*   Node.js (LTS version recommended)
*   A modern browser environment for client-side usage.

### Installation Steps

Install the package using your preferred package manager:

```bash
# Using npm
npm install @asaidimu/network-client

# Using yarn
yarn add @asaidimu/network-client

# Using pnpm
pnpm add @asaidimu/network-client

# Using Bun
bun add @asaidimu/network-client
```

### Verification

To verify the installation, you can create a simple TypeScript file (e.g., `test.ts`):

```typescript
// test.ts
import { createNetworkClient } from '@asaidimu/network-client';

const client = createNetworkClient({
  baseUrl: 'https://jsonplaceholder.typicode.com', // A public test API
});

async function runTest() {
  try {
    const response = await client.get<{ title: string }>('/todos/1');
    if (response.success) {
      console.log('Client initialized and request successful!');
      console.log('Data:', response.data);
    } else {
      console.error('Request failed:', response.error);
    }
  } catch (error) {
    console.error('An unexpected error occurred:', error);
  }
}

runTest();
```

Compile and run:

```bash
# First, ensure you have TypeScript installed globally or locally
# npm install -g typescript
# Then, compile the test file
npx ts-node test.ts
# or
# tsc test.ts && node test.js
```

You should see output indicating a successful request to `jsonplaceholder.typicode.com`.

---

## ⚡ Quick Start

Get up and running with a basic client configuration and a simple request:

```typescript
import { createNetworkClient, ApiResponse, RequestError } from '@asaidimu/network-client';

interface User {
  id: number;
  name: string;
  email: string;
}

// 1. Create a client instance
const apiClient = createNetworkClient({
  baseUrl: 'https://api.example.com/v1',
  defaultHeaders: {
    'Authorization': 'Bearer YOUR_API_TOKEN',
    'X-Requested-With': 'XMLHttpRequest',
  },
  defaultTimeout: 10000, // 10 seconds
});

// 2. Make a request
async function fetchUsers(): Promise<void> {
  console.log('Fetching users...');
  const response: ApiResponse<User[]> = await apiClient.get<User[]>('/users');

  if (response.success) {
    console.log('Users fetched successfully:', response.data);
    // You can access raw response details if needed
    console.log('Status:', response.status);
    console.log('Headers:', response.headers.get('Content-Type'));
  } else {
    const error: RequestError | undefined = response.error;
    console.error('Failed to fetch users:', error?.message);
    if (error?.status) {
      console.error('Status Code:', error.status);
    }
  }
}

// 3. Call the function
fetchUsers();

// Example of a POST request
async function createUser(): Promise<void> {
  console.log('Creating new user...');
  const newUser = { name: 'Alice Smith', email: 'alice.s@example.com' };
  const response: ApiResponse<User> = await apiClient.post<User>('/users', newUser);

  if (response.success) {
    console.log('User created:', response.data);
  } else {
    console.error('Failed to create user:', response.error?.message);
  }
}

// createUser(); // Uncomment to run this example
```

---

## ⚙️ Configuration

The `createNetworkClient` function accepts a `NetworkClientConfig` object to define the client's behavior:

```typescript
import { NetworkClientConfig, HttpMethod, RequestError } from '@asaidimu/network-client';

interface RetryConfig {
  attempts: number; // Number of retry attempts
  delay: number; // Initial delay in milliseconds
  backoff?: 'linear' | 'exponential'; // Backoff strategy (default: 'linear')
  retryCondition?: (error: RequestError, attempt: number) => boolean; // Custom retry condition
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  key?: (url: string, method: HttpMethod, body?: unknown) => string; // Custom cache key generator
}

interface Middleware {
  onRequest?(context: RequestContext): RequestContext | Promise<RequestContext>;
  onResponse?<T>(context: ResponseContext<T>): ResponseContext<T> | Promise<ResponseContext<T>>;
  onError?(error: RequestError): RequestError | Promise<RequestError>;
}

type RequestInterceptor = (context: RequestContext) => RequestContext | Promise<RequestContext>;
type ResponseInterceptor<T = unknown> = (context: ResponseContext<T>) => ResponseContext<T> | Promise<ResponseContext<T>>;

type BodyType = 'json' | 'form' | 'text' | 'blob' | 'stream' | 'auto';
type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'auto';

interface NetworkClientConfig {
  baseUrl: string; // Base URL for all requests (e.g., 'https://api.example.com/v1')
  defaultHeaders?: Record<string, string>; // Headers applied to all requests by default
  defaultTimeout?: number; // Default request timeout in milliseconds
  middleware?: Middleware[]; // Array of middleware objects
  retry?: RetryConfig; // Retry configuration
  cache?: CacheConfig; // Caching configuration for GET requests
  interceptors?: { // Fine-grained interceptors
    request?: RequestInterceptor[];
    response?: ResponseInterceptor[];
  };
  defaultResponseType?: ResponseType; // Default way to parse responses (e.g., 'json', 'text', 'auto')
  defaultBodyType?: BodyType; // Default way to serialize request bodies (e.g., 'json', 'form', 'auto')
}
```

Example Configuration:

```typescript
import { createNetworkClient } from '@asaidimu/network-client';

const myClient = createNetworkClient({
  baseUrl: 'https://myapi.service.com',
  defaultHeaders: {
    'Accept': 'application/json',
    'User-Agent': 'My-App/1.0',
  },
  defaultTimeout: 8000, // 8 seconds
  defaultResponseType: 'json', // Always try to parse as JSON by default
  defaultBodyType: 'json', // Always try to serialize body as JSON by default
  retry: {
    attempts: 3,
    delay: 1000, // 1 second initial delay
    backoff: 'exponential', // Delays: 1s, 2s, 4s
    retryCondition: (error, attempt) => {
      // Only retry on 5xx errors or specific network issues
      return (error.status && error.status >= 500) || error.message.includes('NetworkError');
    }
  },
  cache: {
    ttl: 60 * 1000, // Cache GET responses for 60 seconds
    key: (url, method, body) => {
      // Custom cache key for GET requests, ignoring body for simplicity
      return `${method}:${url}`;
    }
  }
});
```

---

## ⚡ Making Requests

The client provides methods for all standard HTTP verbs.

### HTTP Methods

```typescript
import { createNetworkClient, ApiResponse, RequestOptions, BodyOptions } from '@asaidimu/network-client';

const client = createNetworkClient({ baseUrl: 'https://api.example.com' });

// GET request
async function getResource() {
  const response: ApiResponse<any> = await client.get('/resources');
  if (response.success) {
    console.log('GET Data:', response.data);
  }
}

// POST request with a JSON body (default behavior for objects)
async function createResource() {
  const newResource = { name: 'New Item', value: 123 };
  const response: ApiResponse<any> = await client.post('/resources', newResource);
  if (response.success) {
    console.log('POST Response:', response.data);
  }
}

// PUT request with body and custom options
async function updateResource(id: string, data: any) {
  const options: RequestOptions = {
    headers: { 'X-Custom-Header': 'update-flow' },
    timeout: 5000,
  };
  const response: ApiResponse<any> = await client.put(`/resources/${id}`, data, options);
  if (response.success) {
    console.log('PUT Response:', response.data);
  }
}

// PATCH request with body and explicit body options
async function partiallyUpdateResource(id: string, patchData: any) {
  const bodyOptions: BodyOptions = { type: 'json' }; // Explicitly send as JSON
  const response: ApiResponse<any> = await client.patch(`/resources/${id}`, patchData, {}, bodyOptions);
  if (response.success) {
    console.log('PATCH Response:', response.data);
  }
}

// DELETE request
async function deleteResource(id: string) {
  const response: ApiResponse<void> = await client.delete(`/resources/${id}`);
  if (response.success) {
    console.log('DELETE Success:', response.status); // 204 No Content for successful deletion
  }
}

// HEAD request (fetches headers only)
async function getHeaders() {
  const response: ApiResponse<void> = await client.head('/status');
  if (response.success) {
    console.log('HEAD Headers:', response.headers);
    console.log('Content-Type:', response.headers.get('Content-Type'));
  }
}

// OPTIONS request (fetches allowed methods)
async function getOptions() {
  const response: ApiResponse<void> = await client.options('/resources');
  if (response.success) {
    console.log('OPTIONS Allowed methods:', response.headers.get('Allow'));
  }
}

// Generic request method (for dynamic method calls)
async function makeGenericRequest(method: 'GET' | 'POST', path: string, body?: unknown) {
  const response = await client.request(method, path, body);
  if (response.success) {
    console.log(`${method} Generic Response:`, response.data);
  }
}
```

### Request Options

Requests can accept an `options` object for fine-grained control:

```typescript
interface RequestOptions {
  headers?: Record<string, string>; // Custom headers for this request
  timeout?: number; // Override default timeout for this request in ms
  signal?: AbortSignal; // AbortSignal for manual cancellation
  responseType?: ResponseType; // Explicitly define how to parse the response
  expectJson?: boolean; // Shorthand for responseType: 'json'
}
```

Example with `AbortSignal` for cancellation:

```typescript
import { createNetworkClient } from '@asaidimu/network-client';

const client = createNetworkClient({ baseUrl: 'https://api.example.com' });

async function fetchWithCancellation() {
  const controller = new AbortController();
  const signal = controller.signal;

  // Simulate user leaving page or timeout on client side
  setTimeout(() => controller.abort(), 2000); // Cancel after 2 seconds

  try {
    const response = await client.get('/long-running-task', { signal });
    if (response.success) {
      console.log('Task completed:', response.data);
    } else {
      console.error('Task failed:', response.error?.message);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('Request was aborted!');
    } else {
      console.error('An error occurred:', error.message);
    }
  }
}

fetchWithCancellation();
```

### Body Serialization

The client automatically detects and serializes request bodies based on content. You can explicitly control this with `bodyOptions`:

```typescript
interface BodyOptions {
  type?: BodyType; // Explicitly set the body type ('json', 'form', 'text', 'blob', 'stream', 'auto')
  contentType?: string; // Manually specify Content-Type header (overrides type inference)
}
```

Example Usage:

```typescript
import { createNetworkClient } from '@asaidimu/network-client';

const client = createNetworkClient({ baseUrl: 'https://api.example.com' });

// Default: JSON for objects (implicit type: 'json')
await client.post('/users', { name: 'John Doe', email: 'john@example.com' });

// Form data (multipart/form-data for FormData, application/x-www-form-urlencoded for URLSearchParams/objects)
const formData = new FormData();
formData.append('file', new Blob(['hello'], { type: 'text/plain' }), 'hello.txt');
await client.post('/upload', formData, {}, { type: 'form' }); // 'type: form' ensures correct handling

// URL-encoded form data from an object
await client.post('/submit-form', { param1: 'value1', param2: 'value2' }, {}, { type: 'form' });

// Plain text body
await client.post('/log', 'This is a raw log entry.', {}, { type: 'text' });

// Blob/ArrayBuffer/Stream (e.g., for binary uploads)
const binaryData = new ArrayBuffer(8); // Example binary data
await client.post('/binary-upload', binaryData, {}, { type: 'blob', contentType: 'application/octet-stream' });
```

### Response Parsing

The client attempts to parse responses based on the `Content-Type` header. You can override this with `responseType` in `RequestOptions` or `expectJson`:

```typescript
import { createNetworkClient } from '@asaidimu/network-client';

const client = createNetworkClient({ baseUrl: 'https://api.example.com' });

// Auto-detection (default): Parses based on Content-Type header
const autoResponse = await client.get('/data');

// Explicitly expect JSON (shorthand)
interface User { id: number; name: string; }
const usersJson = await client.get<User[]>('/users', { expectJson: true });

// Explicitly expect text
const rawText = await client.get<string>('/document.txt', { responseType: 'text' });

// Explicitly expect Blob (e.g., for image download)
const imageBlob = await client.get<Blob>('/image.png', { responseType: 'blob' });
if (imageBlob.success && imageBlob.data) {
  const imageUrl = URL.createObjectURL(imageBlob.data);
  console.log('Image URL:', imageUrl);
}

// Explicitly expect ArrayBuffer (e.g., for binary data processing)
const audioBuffer = await client.get<ArrayBuffer>('/audio.mp3', { responseType: 'arrayBuffer' });

// Explicitly expect FormData (e.g., for specific API responses)
const formResponse = await client.get<FormData>('/form-data-endpoint', { responseType: 'formData' });
```

---

## 📦 Response Structure

All client methods return an `ApiResponse<T>` object, providing a consistent way to handle responses, including data, errors, and metadata.

```typescript
interface RequestError {
  message: string;
  status?: number; // HTTP status code (e.g., 404, 500)
  url?: string;
  method?: HttpMethod;
}

interface ApiResponse<T> {
  data?: T; // The parsed response data (if successful)
  error?: RequestError; // Error details (if request failed or parsing issue)
  success: boolean; // True if the request was successful (HTTP status 2xx)
  status: number; // The HTTP status code
  headers: Headers; // The raw Fetch API Headers object
  raw?: Response; // The raw Fetch API Response object for advanced use cases
}
```

Example usage:

```typescript
import { createNetworkClient, ApiResponse, RequestError } from '@asaidimu/network-client';

const client = createNetworkClient({ baseUrl: 'https://api.example.com' });

async function handleResponse() {
  const response: ApiResponse<{ message: string }> = await client.get('/some-endpoint');

  if (response.success) {
    console.log('Data:', response.data?.message);
    console.log('HTTP Status:', response.status);
    console.log('Content-Type Header:', response.headers.get('content-type'));
    if (response.raw) {
      console.log('Raw response URL:', response.raw.url);
    }
  } else {
    const error: RequestError | undefined = response.error;
    console.error('Request failed!');
    console.error('Error Message:', error?.message);
    console.error('Error Status:', error?.status);
    console.error('Request URL:', error?.url);
    console.error('Request Method:', error?.method);
  }
}
```

---

## ♻️ Middleware & Interceptors

The client provides two powerful mechanisms for extending its functionality: `Middleware` and `Interceptors`.

*   **Interceptors**: Functions (`RequestInterceptor`,
    `ResponseInterceptor`) that get called sequentially before a request
    is sent or after a response is received. They directly modify the
    `RequestContext` or `ResponseContext`.
*   **Middleware**: Objects (`Middleware`) with optional `onRequest`,
    `onResponse`, and `onError` methods, offering a structured way to
    handle different phases of the request lifecycle. Middleware functions
    are also executed sequentially.

Both systems allow you to implement common patterns like logging, authentication, error reporting, and data transformation.

```typescript
import {
  createNetworkClient,
  Middleware,
  RequestInterceptor,
  ResponseInterceptor,
  RequestContext,
  ResponseContext,
  RequestError
} from '@asaidimu/network-client';

// 1. Define a Middleware object
const authMiddleware: Middleware = {
  async onRequest(context: RequestContext): Promise<RequestContext> {
    const token = localStorage.getItem('authToken');
    if (token) {
      context.headers = { ...context.headers, 'Authorization': `Bearer ${token}` };
    }
    return context;
  },
  async onError(error: RequestError): Promise<RequestError> {
    if (error.status === 401) {
      console.error('Authentication failed, redirecting to login...');
      // Example: window.location.href = '/login';
    }
    return error; // Always return the (potentially modified) error
  }
};

// 2. Define Request and Response Interceptors
const loggingInterceptor: RequestInterceptor = async (context: RequestContext) => {
  console.log(`[Request Interceptor] ${context.method} ${context.url}`);
  console.log('Headers:', context.headers);
  return context;
};

const responseLoggerInterceptor: ResponseInterceptor = async (context: ResponseContext<any>) => {
  console.log(`[Response Interceptor] Status: ${context.response.status}`);
  if (context.data) {
    console.log('Data (from interceptor):', context.data);
  }
  if (context.error) {
    console.error('Error (from interceptor):', context.error.message);
  }
  return context;
};

// 3. Initialize the client with middleware and interceptors
const client = createNetworkClient({
  baseUrl: 'https://api.example.com',
  middleware: [authMiddleware], // Add middleware during client creation
  interceptors: {
    request: [loggingInterceptor],
    response: [responseLoggerInterceptor]
  }
});

// You can also add interceptors after client creation
client.addInterceptor('request', async (context) => {
  console.log('[Interceptor Added Later] Another request interceptor!');
  return context;
});

// Example of a response interceptor transforming data
client.addInterceptor('response', async (context) => {
  if (context.response.ok && context.data && typeof context.data === 'object' && 'results' in context.data) {
    // If the API wraps data in a 'results' field, unwrap it
    context.data = (context.data as { results: any }).results;
  }
  return context;
});
```

---

## 🔄 Retry Mechanism

The client includes a built-in retry mechanism for handling transient
network failures or server errors. Configure it via the `retry` option in
`NetworkClientConfig`.

```typescript
import { createNetworkClient } from '@asaidimu/network-client';

const clientWithRetry = createNetworkClient({
  baseUrl: 'https://api.example.com',
  retry: {
    attempts: 3,        // Total number of attempts (1 initial + 2 retries)
    delay: 1000,        // Initial delay before the first retry (1 second)
    backoff: 'exponential', // 'linear' (delay * attempt) or 'exponential' (delay * 2^(attempt-1))
    retryCondition: (error, attempt) => {
      // Custom condition: retry on network errors (status 0) or 5xx server errors
      // and only for the first 2 retries (attempts 1, 2)
      return (!error.status || error.status >= 500) && attempt < 3;
    }
  }
});

// Example: This request will automatically retry if it fails due to a network issue or 5xx error
async function fetchDataWithRetry() {
  console.log('Attempting to fetch data with retry...');
  const response = await clientWithRetry.get('/unreliable-endpoint');
  if (response.success) {
    console.log('Data fetched successfully after potential retries:', response.data);
  } else {
    console.error('Failed to fetch data after all retries:', response.error?.message);
  }
}

fetchDataWithRetry();
```

---

## 💾 Client-Side Caching

For `GET` requests, you can enable a simple in-memory cache to reduce redundant network calls and improve performance.

```typescript
import { createNetworkClient } from '@asaidimu/network-client';

const clientWithCache = createNetworkClient({
  baseUrl: 'https://api.example.com',
  cache: {
    ttl: 5 * 60 * 1000, // Cache entries for 5 minutes (in milliseconds)
    key: (url, method, body) => {
      // Optional: Custom cache key generation. Default is `${method}:${url}`.
      // If your URL has query params that don't affect cache, you might normalize it.
      // Example: return `${method}:${new URL(url).pathname}`;
      return `${method}:${url}`;
    }
  }
});

async function fetchCachedData() {
  // First request: hits the network, stores in cache
  console.log('Fetching users (first time, from network)...');
  let response1 = await clientWithCache.get<{ id: number; name: string }[]>('/users');
  console.log('Response 1 status:', response1.status); // Will be 200

  // Second request: hits the cache if within TTL
  console.log('Fetching users (second time, from cache if available)...');
  let response2 = await clientWithCache.get<{ id: number; name: string }[]>('/users');
  console.log('Response 2 status:', response2.status); // Will be 200 (from cache)

  // Clear the cache manually if needed (e.g., after a mutation)
  clientWithCache.clearCache();
  console.log('Cache cleared.');

  // Third request: will hit the network again
  console.log('Fetching users (third time, after cache clear)...');
  let response3 = await clientWithCache.get<{ id: number; name: string }[]>('/users');
  console.log('Response 3 status:', response3.status); // Will be 200

  // You can also delete specific items from the cache
  // cache.delete('GET:https://api.example.com/users'); // Not exposed via client currently, use client.clearCache()
}

fetchCachedData();
```

---

## 🏗️ Building SDKs

The library provides a `BaseSDK` class, which can be extended to create
structured and organized API SDKs for specific services. This promotes
code reusability and maintainability.

```typescript
import {
  ApiResponse,
  BodyOptions,
  createNetworkClient,
  HttpMethod,
  RequestOptions,
  type NetworkClient,
  type NetworkClientConfig,
  BaseSDK // Import BaseSDK
} from '@asaidimu/network-client';

interface Product {
  id: string;
  name: string;
  price: number;
}

// Extend BaseSDK for your specific API
class ProductsAPI extends BaseSDK {
  constructor(apiKey: string) {
    super({
      baseUrl: 'https://api.my-ecommerce.com/products',
      defaultHeaders: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      defaultTimeout: 15000,
    });
  }

  // Define specific methods for your API endpoints
  async getProducts(): Promise<ApiResponse<Product[]>> {
    return this.get<Product[]>('/');
  }

  async getProductById(id: string): Promise<ApiResponse<Product>> {
    return this.get<Product>(`/${id}`);
  }

  async createProduct(productData: Omit<Product, 'id'>): Promise<ApiResponse<Product>> {
    return this.post<Product>('/', productData);
  }

  async updateProduct(id: string, productData: Partial<Product>): Promise<ApiResponse<Product>> {
    return this.put<Product>(`/${id}`, productData);
  }

  async uploadProductImage(productId: string, file: File): Promise<ApiResponse<void>> {
    const formData = new FormData();
    formData.append('image', file);
    return this.post<void>(`/${productId}/image`, formData, {}, { type: 'form' });
  }
}

// Usage of the SDK
const myProductsApi = new ProductsAPI('YOUR_SUPER_SECRET_API_KEY');

async function manageProducts() {
  // Fetch all products
  const productsResponse = await myProductsApi.getProducts();
  if (productsResponse.success) {
    console.log('All Products:', productsResponse.data);
  } else {
    console.error('Failed to get products:', productsResponse.error?.message);
  }

  // Create a new product
  const newProduct = { name: 'Wireless Headphones', price: 99.99 };
  const createResponse = await myProductsApi.createProduct(newProduct);
  if (createResponse.success) {
    console.log('Created Product:', createResponse.data);
  } else {
    console.error('Failed to create product:', createResponse.error?.message);
  }
}

manageProducts();
```

### Extending Client Instances

The `extend` method allows you to create new client instances with merged
configurations, useful for overriding default settings for specific parts
of your application without affecting the original client.

```typescript
import { createNetworkClient } from '@asaidimu/network-client';

const baseClient = createNetworkClient({
  baseUrl: 'https://api.example.com',
  defaultHeaders: { 'X-App-Version': '1.0' },
  defaultTimeout: 5000,
});

// Create a new client instance for authentication, overriding base URL and adding specific headers
const authClient = baseClient.extend({
  baseUrl: 'https://auth.example.com/api',
  defaultHeaders: { 'X-Auth-Flow': 'true' },
  middleware: [
    {
      onRequest: async (context) => {
        console.log(`Auth Client Request to: ${context.url}`);
        return context;
      }
    }
  ]
});

// Original client unchanged
await baseClient.get('/users'); // Uses 'https://api.example.com'

// Auth client uses its own configuration
await authClient.post('/login', { username: 'test' }); // Uses 'https://auth.example.com/api'
```

---

## 🚨 Error Handling

The client standardizes error handling through the `ApiResponse`
interface. When a request fails (e.g., network error, non-2xx HTTP
status), the `success` property will be `false`, and the `error` property
will contain a `RequestError` object.

```typescript
import { createNetworkClient, ApiResponse, RequestError, NetworkError } from '@asaidimu/network-client';

const client = createNetworkClient({ baseUrl: 'https://api.example.com' });

async function demonstrateErrorHandling() {
  // Example 1: Non-existent endpoint (404 Not Found)
  console.log('Attempting to access non-existent endpoint...');
  const notFoundResponse: ApiResponse<any> = await client.get('/non-existent-path');
  if (!notFoundResponse.success) {
    const error = notFoundResponse.error as RequestError;
    console.error('Error 1: Not Found');
    console.error(`  Message: ${error.message}`);
    console.error(`  Status: ${error.status}`);
    console.error(`  URL: ${error.url}`);
  }

  // Example 2: Endpoint returning an error message in JSON (e.g., 400 Bad Request)
  console.log('\nAttempting to send invalid data...');
  const badRequestResponse: ApiResponse<any> = await client.post('/items', { invalid_field: 123 });
  if (!badRequestResponse.success) {
    const error = badRequestResponse.error as RequestError;
    console.error('Error 2: Bad Request');
    console.error(`  Message: ${error.message}`); // This will try to extract message from JSON body
    console.error(`  Status: ${error.status}`);
  }

  // Example 3: Simulating a network error (e.g., server offline, CORS issue)
  console.log('\nSimulating network error...');
  try {
    // This will likely throw if the URL is unreachable or CORS blocks
    const networkErrorResponse: ApiResponse<any> = await client.get('http://nonexistent.domain');
    if (!networkErrorResponse.success) {
      const error = networkErrorResponse.error as RequestError;
      console.error('Error 3: Network Error (caught via ApiResponse.error)');
      console.error(`  Message: ${error.message}`);
      console.error(`  Status: ${error.status || 'N/A'}`); // Status might be 0 for network errors
    }
  } catch (rawError: any) {
    // Top-level network errors (e.g., fetch itself failing) might be caught here
    if (rawError instanceof NetworkError) {
      console.error('Error 3: Network Error (caught via NetworkError instance)');
      console.error(`  Message: ${rawError.message}`);
      console.error(`  Status: ${rawError.status || 'N/A'}`);
    } else {
      console.error('Error 3: Other unexpected error:', rawError.message);
    }
  }
}

demonstrateErrorHandling();
```

---

## 💙 TypeScript Support

`@asaidimu/network-client` is built from the ground up with TypeScript,
ensuring robust type safety across all configurations, methods, and
response data. This minimizes common runtime errors and improves
development velocity.

```typescript
import { createNetworkClient, ApiResponse, RequestOptions, RequestError } from '@asaimu/network-client';

interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  address: {
    street: string;
    city: string;
  };
}

const client = createNetworkClient({ baseUrl: 'https://jsonplaceholder.typicode.com' });

async function getAndCreateData() {
  // GET a list of todos - response.data will be typed as Todo[]
  const todosResponse: ApiResponse<Todo[]> = await client.get<Todo[]>('/todos');
  if (todosResponse.success) {
    // TypeScript knows todosResponse.data is Todo[] here
    console.log('First todo:', todosResponse.data[0].title);
    // todosResponse.data[0].nonExistentProperty; // This would cause a TypeScript error
  }

  // GET a single user profile - response.data will be typed as UserProfile
  const userResponse: ApiResponse<UserProfile> = await client.get<UserProfile>('/users/1');
  if (userResponse.success) {
    console.log('User email:', userResponse.data?.email);
    console.log('User city:', userResponse.data?.address.city);
  } else {
    // TypeScript knows userResponse.error is RequestError here
    console.error('Failed to fetch user:', userResponse.error?.message);
  }

  // POST a new todo - request body and response are typed
  const newTodoData = { title: 'Learn Network Client', completed: false, userId: 1 };
  const createTodoResponse: ApiResponse<Todo> = await client.post<Todo>('/todos', newTodoData);
  if (createTodoResponse.success) {
    console.log('New todo ID:', createTodoResponse.data?.id);
    // createTodoResponse.data?.status; // This would cause a TypeScript error, 'status' is not on Todo
  }
}

getAndCreateData();
```

---

## 🏛️ Project Architecture

The library is structured to be modular and easy to understand, separating core client logic from utility functions and SDK-building abstractions.

### Core Components

*   **`createNetworkClient`**: The primary factory function that initializes and returns a `NetworkClient` instance.
*   **`NetworkClient` Interface**: Defines the public API for the client, including HTTP methods and utility functions.
*   **`NetworkClientConfig`**: The configuration interface that allows extensive customization of client behavior.
*   **`ApiResponse<T>`**: The standardized response wrapper that provides data, error, status, and raw response details.
*   **`RequestError`**: Standardized error interface for network and API-level errors.
*   **`Middleware`**: Interface for objects with `onRequest`, `onResponse`, and `onError` methods to extend client behavior.
*   **`RequestInterceptor`, `ResponseInterceptor`**: Functional interfaces for modifying request and response contexts.
*   **`SimpleCache`**: An internal utility class providing basic in-memory caching for GET requests.
*   **`serializeBody`, `parseResponse`**: Internal utility functions for handling request body serialization and response data parsing.
*   **`BaseSDK`**: An abstract class designed to be extended by developers to build their own typed API SDKs on top of the `NetworkClient`.

### Data Flow

1.  **Client Initialization**: `createNetworkClient` takes a `NetworkClientConfig` to set up defaults and behaviors.
2.  **Request Creation**: A client method (e.g., `client.get`, `client.post`) is called, generating a `RequestContext`.
3.  **Request Interception**: `RequestInterceptor` functions and `onRequest` middleware methods are executed, allowing modification of the `RequestContext` (e.g., adding headers, logging).
4.  **Body Serialization**: The request body is serialized based on `BodyOptions` or auto-detection.
5.  **Fetch Execution**: The `fetch` API is called with the prepared request.
6.  **Response Handling**:
    *   If the `fetch` call itself fails (e.g., network down, timeout), an `RequestError` is generated.
    *   If `fetch` succeeds, the raw `Response` is received.
    *   The `Response` is parsed based on `ResponseType` or auto-detection to extract data.
7.  **Response Interception**: `ResponseInterceptor` functions and `onResponse` middleware methods are executed, allowing modification of the `ResponseContext` (e.g., data transformation, success logging).
8.  **Error Interception**: If an error occurred (from fetch, parsing, or a non-2xx status), `onError` middleware methods are executed, allowing modification or logging of the `RequestError`.
9.  **Retry Logic**: If configured, the `executeRequest` function might re-attempt the request based on the `retry` configuration and the nature of the error.
10. **Cache Management**: For successful `GET` requests, data is stored in the `SimpleCache`. For subsequent `GET` requests, the cache is checked first.
11. **Result Return**: An `ApiResponse<T>` object is returned to the caller, containing the parsed data or error, and request metadata.

---

## 🛠️ Development & Contributing

We welcome contributions from the community!

### Development Setup

To set up the project for local development:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/asaidimu/network-client.git
    cd network-client
    ```
2.  **Install dependencies:**
    This project uses `bun` for scripts, but `npm` or `yarn` will also work for dependency installation.
    ```bash
    bun install
    # or
    npm install
    # or
    yarn install
    ```

### Available Scripts

The `package.json` defines several scripts for common development tasks:

*   `bun ci`: Installs dependencies. Used in CI environments.
*   `bun clean`: Removes the `dist` directory.
*   `bun prebuild`: Runs `bun clean` before `build`.
*   `bun build`: Compiles TypeScript files into CommonJS (`.js`), ES Modules (`.mjs`), and TypeScript declaration files (`.d.ts`). Uses `tsup`.
*   `bun postbuild`: Copies `README.md`, `LICENSE.md`, and `dist.package.json` into the `dist` directory, preparing for publishing.

To build the project:

```bash
bun build
# or
npm run build
```

### Contributing Guidelines

We follow a standard GitHub pull request workflow:

1.  **Fork** the repository.
2.  **Clone** your forked repository.
3.  **Create a new branch** for your feature or bug fix: `git checkout -b feature/my-new-feature` or `bugfix/fix-some-bug`.
4.  **Make your changes**.
5.  **Commit your changes** using [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) (e.g., `feat: add new feature`, `fix: resolve bug`). This project uses `semantic-release`, which relies on these conventions.
6.  **Push your branch** to your forked repository.
7.  **Open a Pull Request** to the `main` branch of the original repository.
8.  Ensure your code adheres to existing coding standards and passes linting/type checks.

### Issue Reporting

Found a bug or have a feature request? Please open an issue on our GitHub Issues page:
[https://github.com/asaidimu/network-client/issues](https://github.com/asaidimu/network-client/issues)

When reporting a bug, please include:

*   A clear and concise description of the issue.
*   Steps to reproduce the behavior.
*   Expected behavior.
*   Actual behavior.
*   Any relevant error messages or console output.
*   Your environment details (Node.js version, browser, OS).

---

## ℹ️ Additional Information

### Troubleshooting

*   **CORS Issues**: If you encounter "Cross-Origin Request Blocked"
    errors, ensure your API server is configured to send appropriate CORS
    headers (`Access-Control-Allow-Origin`,
    `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`).
*   **NetworkError with Status 0**: This often indicates a client-side
    network issue (e.g., offline, DNS failure), or a CORS error where the
    browser prevents access to the response.
*   **Incorrect Body/Response Parsing**: Double-check `BodyOptions` and
    `RequestOptions.responseType` to ensure they match the expected
    content type of your API. The `auto` detection is smart but explicit
    settings are safer for specific cases.
*   **Timeout Not Working**: Ensure `timeout` is correctly set and
    `AbortSignal` is not overriding it if passed directly. The client's
    timeout mechanism relies on `AbortController`.

### FAQ

**Q: Can I use this client in Node.js?** 
A: While designed for browser environments and using `fetch`, Node.js v18+
supports the `fetch` API globally. Therefore, this client should work in
Node.js environments as well.

**Q: How do I handle file uploads?**
A: Use `FormData` with `client.post` or `client.put`, and set `bodyOptions: { type: 'form' }`. The client will correctly send `multipart/form-data`.

**Q: What if my API returns non-JSON errors?** 
A: The client attempts to parse non-2xx responses as JSON first. If that
fails, it defaults to the raw text content of the error. You can also
implement `onError` middleware to parse specific error formats.

**Q: How does `extend()` differ from just creating a new client?** 
A: `extend()` creates a new client instance inheriting the current
client's configuration, then applies the provided `newConfig` on top of
it. This is useful for building a hierarchy of clients (e.g., a base
client, then an authenticated client derived from it). Creating a new
client starts from a blank slate with only the provided config.

### Changelog / Roadmap

For a detailed history of changes and new features, please refer to the [CHANGELOG.md](CHANGELOG.md) file.
This project uses [semantic-release](https://semantic-release.gitbook.io/semantic-release/) for automated releases and changelog generation.

### License

This project is licensed under the MIT License. See the [LICENSE.md](LICENSE.md) file for full details.

### Acknowledgments

*   Inspired by modern HTTP client patterns and the native Fetch API.
*   Built with TypeScript for a superior developer experience.
