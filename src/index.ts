// Types
type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'PATCH';
type HttpMethodWithBody = 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type HttpMethodWithoutBody = 'GET' | 'HEAD' | 'OPTIONS';

type BodyType = 'json' | 'form' | 'text' | 'blob' | 'stream' | 'auto';
type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'auto';

interface RequestError {
  message: string;
  status?: number;
  url?: string;
  method?: HttpMethod;
}

interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  // Response handling options
  responseType?: ResponseType;
  expectJson?: boolean; // Shorthand for responseType: 'json'
}

interface BodyOptions {
  type?: BodyType;
  contentType?: string;
}

interface RequestOptionsWithBody extends RequestOptions {
  body?: unknown;
  bodyOptions?: BodyOptions;
}

interface ApiResponse<T> {
  data?: T;
  error?: RequestError;
  success: boolean;
  status: number;
  headers: Headers;
  // Raw response for advanced use cases
  raw?: Response;
}

interface RequestContext {
  url: string;
  method: HttpMethod;
  body?: unknown;
  headers: Record<string, string>;
  signal?: AbortSignal;
  bodyOptions?: BodyOptions;
  responseType?: ResponseType;
}

interface ResponseContext<T> {
  response: Response;
  data?: T;
  error?: RequestError;
}

type RequestInterceptor = (context: RequestContext) => RequestContext | Promise<RequestContext>;
type ResponseInterceptor<T = unknown> = (context: ResponseContext<T>) => ResponseContext<T> | Promise<ResponseContext<T>>;

interface Middleware {
  onRequest?(context: RequestContext): RequestContext | Promise<RequestContext>;
  onResponse?<T>(context: ResponseContext<T>): ResponseContext<T> | Promise<ResponseContext<T>>;
  onError?(error: RequestError): RequestError | Promise<RequestError>;
}

// Cache implementation
class SimpleCache {
  private cache = new Map<string, { data: unknown; expires: number }>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

interface RetryConfig {
  attempts: number;
  delay: number;
  backoff?: 'linear' | 'exponential';
  retryCondition?: (error: RequestError, attempt: number) => boolean;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  key?: (url: string, method: HttpMethod, body?: unknown) => string;
}

interface NetworkClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  defaultTimeout?: number;
  middleware?: Middleware[];
  retry?: RetryConfig;
  cache?: CacheConfig;
  interceptors?: {
    request?: RequestInterceptor[];
    response?: ResponseInterceptor[];
  };
  // Default content handling
  defaultResponseType?: ResponseType;
  defaultBodyType?: BodyType;
}

class NetworkError extends Error {
  constructor(
    message: string,
    public status?: number,
    public url?: string,
    public method?: HttpMethod
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Body serialization utilities
function serializeBody(body: unknown, options: BodyOptions = {}): { serialized: BodyInit | null; contentType: string } {
  if (body === null || body === undefined) {
    return { serialized: null, contentType: '' };
  }

  // If user explicitly provided content type, use it
  if (options.contentType) {
    if (options.type === 'json' || (!options.type && typeof body === 'object')) {
      return {
        serialized: JSON.stringify(body),
        contentType: options.contentType
      };
    }
    return {
      serialized: body as BodyInit,
      contentType: options.contentType
    };
  }

  // Auto-detect or use specified type
  const bodyType = options.type || 'auto';

  switch (bodyType) {
    case 'json':
      return {
        serialized: JSON.stringify(body),
        contentType: 'application/json'
      };

    case 'form':
      if (body instanceof FormData) {
        return { serialized: body, contentType: '' }; // Let browser set multipart boundary
      }
      if (body instanceof URLSearchParams) {
        return { serialized: body, contentType: 'application/x-www-form-urlencoded' };
      }
      // Convert object to URLSearchParams
      const params = new URLSearchParams();
      if (typeof body === 'object' && body !== null) {
        Object.entries(body as Record<string, any>).forEach(([key, value]) => {
          params.append(key, String(value));
        });
      }
      return { serialized: params, contentType: 'application/x-www-form-urlencoded' };

    case 'text':
      return {
        serialized: String(body),
        contentType: 'text/plain'
      };

    case 'blob':
    case 'stream':
      return {
        serialized: body as BodyInit,
        contentType: 'application/octet-stream'
      };

    case 'auto':
    default:
      // Auto-detection logic
      if (body instanceof FormData) {
        return { serialized: body, contentType: '' };
      }
      if (body instanceof URLSearchParams) {
        return { serialized: body, contentType: 'application/x-www-form-urlencoded' };
      }
      if (body instanceof Blob || body instanceof ArrayBuffer || body instanceof ReadableStream) {
        return { serialized: body as BodyInit, contentType: 'application/octet-stream' };
      }
      if (typeof body === 'string') {
        // Try to detect if it's JSON
        const trimmed = body.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          return { serialized: body, contentType: 'application/json' };
        }
        return { serialized: body, contentType: 'text/plain' };
      }
      // Default to JSON for objects
      return {
        serialized: JSON.stringify(body),
        contentType: 'application/json'
      };
  }
}

// Response parsing utilities
async function parseResponse<T>(response: Response, responseType: ResponseType = 'auto'): Promise<T> {
  if (responseType === 'auto') {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return response.json();
    }
    if (contentType.includes('text/')) {
      return response.text() as unknown as T;
    }
    if (contentType.includes('application/x-www-form-urlencoded') ||
        contentType.includes('multipart/form-data')) {
      return response.formData() as unknown as T;
    }

    // For binary content or unknown, try JSON first, then text
    const text = await response.text();
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        return JSON.parse(text);
      } catch {
        return text as unknown as T;
      }
    }
    return text as unknown as T;
  }

  // Explicit response type handling
  switch (responseType) {
    case 'json':
      return response.json();
    case 'text':
      return response.text() as unknown as T;
    case 'blob':
      return response.blob() as unknown as T;
    case 'arrayBuffer':
      return response.arrayBuffer() as unknown as T;
    case 'formData':
      return response.formData() as unknown as T;
    default:
      return response.json();
  }
}

async function executeRequest<T>(
  url: string,
  method: HttpMethod,
  options: RequestOptionsWithBody,
  config: NetworkClientConfig
): Promise<ApiResponse<T>> {
  // Check cache for GET requests
  if (method === 'GET' && config.cache) {
    const cacheKey = config.cache.key
      ? config.cache.key(url, method, options.body)
      : `${method}:${url}`;

    const cached = cache.get<T>(cacheKey);
    if (cached) {
      return {
        data: cached,
        success: true,
        status: 200,
        headers: new Headers(),
      };
    }
  }

  const executeWithRetry = async (attempt: number = 1): Promise<ApiResponse<T>> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
    };

    try {
      // Setup timeout and abort controller
      const timeout = options.timeout ?? config.defaultTimeout;
      if (timeout && !options.signal) {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller?.abort(), timeout);
      }

      // Determine response type
      const responseType = options.expectJson ? 'json' :
                          options.responseType ||
                          config.defaultResponseType ||
                          'auto';

      // Build request context
      let context: RequestContext = {
        url,
        method,
        body: options.body,
        headers: {
          'Accept': 'application/json, text/plain, */*',
          ...config.defaultHeaders,
          ...options.headers,
        },
        signal: options.signal || controller?.signal,
        bodyOptions: options.bodyOptions,
        responseType,
      };

      // Apply request interceptors
      for (const interceptor of config.interceptors?.request || []) {
        context = await interceptor(context);
      }

      // Apply request middleware
      for (const middleware of config.middleware || []) {
        if (middleware.onRequest) {
          context = await middleware.onRequest(context);
        }
      }

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: context.method,
        headers: { ...context.headers },
        credentials: 'include',
        signal: context.signal,
      };

      // Handle body serialization
      if (context.body !== undefined) {
        const bodyOptions = {
          type: config.defaultBodyType,
          ...context.bodyOptions,
        };

        const { serialized, contentType } = serializeBody(context.body, bodyOptions);
        fetchOptions.body = serialized;

        // Set content type if not already specified and we have one
        if (contentType && !fetchOptions.headers!['Content-Type'] && !fetchOptions.headers!['content-type']) {
          fetchOptions.headers = {
            ...fetchOptions.headers,
            'Content-Type': contentType,
          };
        }
      }

      // Make the request
      const response = await fetch(context.url, fetchOptions);
      cleanup();

      // Build response context
      let responseContext: ResponseContext<T> = { response };

      // Parse response data or error
      try {
        if (response.ok) {
          responseContext.data = await parseResponse<T>(response, context.responseType);
        } else {
          // Try to get error message from response body
          const errorText = await response.text();
          let errorMessage = `Request failed with status ${response.status}`;

          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.message) {
              errorMessage = errorJson.message;
            } else if (errorJson.error) {
              errorMessage = errorJson.error;
            }
          } catch {
            if (errorText) {
              errorMessage = errorText;
            }
          }

          responseContext.error = {
            message: errorMessage,
            status: response.status,
            url: context.url,
            method: context.method,
          };
        }
      } catch (parseError) {
        responseContext.error = {
          message: parseError instanceof Error ? parseError.message : 'Failed to parse response',
          status: response.status,
          url: context.url,
          method: context.method,
        };
      }

      // Apply response interceptors
      for (const interceptor of config.interceptors?.response || []) {
        responseContext = await interceptor(responseContext);
      }

      // Apply response middleware
      for (const middleware of config.middleware || []) {
        if (middleware.onResponse) {
          responseContext = await middleware.onResponse(responseContext);
        }
      }

      // Apply error middleware if there's an error
      if (responseContext.error) {
        for (const middleware of config.middleware || []) {
          if (middleware.onError) {
            responseContext.error = await middleware.onError(responseContext.error);
          }
        }
      }

      const result: ApiResponse<T> = {
        data: responseContext.data,
        error: responseContext.error,
        success: !responseContext.error,
        status: response.status,
        headers: response.headers,
        raw: response,
      };

      // Cache successful GET responses
      if (method === 'GET' && config.cache && result.success && result.data) {
        const cacheKey = config.cache.key
          ? config.cache.key(url, method, options.body)
          : `${method}:${url}`;
        cache.set(cacheKey, result.data, config.cache.ttl);
      }

      // Handle retry logic
      if (!result.success && config.retry && attempt < config.retry.attempts) {
        const shouldRetry = config.retry.retryCondition
          ? config.retry.retryCondition(result.error!, attempt)
          : isRetryableError(result.error!);

        if (shouldRetry) {
          const delay = calculateRetryDelay(config.retry, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          return executeWithRetry(attempt + 1);
        }
      }

      return result;

    } catch (error) {
      cleanup();

      let requestError: RequestError = {
        message: error instanceof Error ? error.message : 'Unknown network error',
        url,
        method,
      };

      // Apply error middleware
      for (const middleware of config.middleware || []) {
        if (middleware.onError) {
          requestError = await middleware.onError(requestError);
        }
      }

      // Handle retry for network errors
      if (config.retry && attempt < config.retry.attempts) {
        const shouldRetry = config.retry.retryCondition
          ? config.retry.retryCondition(requestError, attempt)
          : isRetryableError(requestError);

        if (shouldRetry) {
          const delay = calculateRetryDelay(config.retry, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          return executeWithRetry(attempt + 1);
        }
      }

      return {
        error: requestError,
        success: false,
        status: 0,
        headers: new Headers(),
      };
    }
  };

  return executeWithRetry();
}

// Helper functions for retry logic
function isRetryableError(error: RequestError): boolean {
  // Retry on network errors or 5xx status codes
  return !error.status || error.status >= 500;
}

function calculateRetryDelay(retryConfig: RetryConfig, attempt: number): number {
  const { delay, backoff = 'linear' } = retryConfig;

  if (backoff === 'exponential') {
    return delay * Math.pow(2, attempt - 1);
  }

  return delay * attempt;
}

// Global cache instance
const cache = new SimpleCache();

export interface NetworkClient {
  // Methods without body
  get<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>;
  head<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>;
  options<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>;

  // Methods with body - now support body options
  post<T = unknown>(path: string, body?: unknown, options?: RequestOptions, bodyOptions?: BodyOptions): Promise<ApiResponse<T>>;
  put<T = unknown>(path: string, body?: unknown, options?: RequestOptions, bodyOptions?: BodyOptions): Promise<ApiResponse<T>>;
  patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions, bodyOptions?: BodyOptions): Promise<ApiResponse<T>>;
  delete<T = unknown>(path: string, body?: unknown, options?: RequestOptions, bodyOptions?: BodyOptions): Promise<ApiResponse<T>>;

  // Generic request method
  request<T = unknown>(method: HttpMethod, path: string, body?: unknown, options?: RequestOptions, bodyOptions?: BodyOptions): Promise<ApiResponse<T>>;

  // Utility methods for SDK building
  extend(config: Partial<NetworkClientConfig>): NetworkClient;
  addInterceptor(type: 'request', interceptor: RequestInterceptor): void;
  addInterceptor<T>(type: 'response', interceptor: ResponseInterceptor<T>): void;
  clearCache(): void;
  clone(): NetworkClient;
}

export function createNetworkClient(config: NetworkClientConfig): NetworkClient {
  // Create a mutable copy of the config
  let clientConfig = { ...config };

  const buildUrl = (path: string): string => {
    const baseUrl = clientConfig.baseUrl.endsWith('/') ? clientConfig.baseUrl.slice(0, -1) : clientConfig.baseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  };

  const request = <T = unknown>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
    bodyOptions?: BodyOptions
  ): Promise<ApiResponse<T>> => {
    const requestOptions: RequestOptionsWithBody = {
      ...options,
      body,
      bodyOptions
    };
    return executeRequest<T>(buildUrl(path), method, requestOptions, clientConfig);
  };

  return {
    // Methods without body
    get: <T = unknown>(path: string, options?: RequestOptions) =>
      request<T>('GET', path, undefined, options),

    head: <T = unknown>(path: string, options?: RequestOptions) =>
      request<T>('HEAD', path, undefined, options),

    options: <T = unknown>(path: string, options?: RequestOptions) =>
      request<T>('OPTIONS', path, undefined, options),

    // Methods with body
    post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions, bodyOptions?: BodyOptions) =>
      request<T>('POST', path, body, options, bodyOptions),

    put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions, bodyOptions?: BodyOptions) =>
      request<T>('PUT', path, body, options, bodyOptions),

    patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions, bodyOptions?: BodyOptions) =>
      request<T>('PATCH', path, body, options, bodyOptions),

    delete: <T = unknown>(path: string, body?: unknown, options?: RequestOptions, bodyOptions?: BodyOptions) =>
      request<T>('DELETE', path, body, options, bodyOptions),

    // Generic request method
    request,

    // Utility methods for SDK building
    extend: (newConfig: Partial<NetworkClientConfig>): NetworkClient => {
      return createNetworkClient({
        ...clientConfig,
        ...newConfig,
        defaultHeaders: {
          ...clientConfig.defaultHeaders,
          ...newConfig.defaultHeaders,
        },
        middleware: [
          ...(clientConfig.middleware || []),
          ...(newConfig.middleware || []),
        ],
        interceptors: {
          request: [
            ...(clientConfig.interceptors?.request || []),
            ...(newConfig.interceptors?.request || []),
          ],
          response: [
            ...(clientConfig.interceptors?.response || []),
            ...(newConfig.interceptors?.response || []),
          ],
        },
      });
    },

    addInterceptor: (type: 'request' | 'response', interceptor: any) => {
      if (!clientConfig.interceptors) {
        clientConfig.interceptors = { request: [], response: [] };
      }
      clientConfig.interceptors[type]!.push(interceptor);
    },

    clearCache: () => {
      cache.clear();
    },

    clone: (): NetworkClient => {
      return createNetworkClient({ ...clientConfig });
    },
  };
}

// Export types for consumers
export type {
  NetworkClient,
  NetworkClientConfig,
  ApiResponse,
  RequestError,
  RequestOptions,
  RequestOptionsWithBody,
  BodyOptions,
  BodyType,
  ResponseType,
  Middleware,
  HttpMethod,
  RetryConfig,
  CacheConfig,
  RequestInterceptor,
  ResponseInterceptor,
};

export { NetworkError, SimpleCache };

// Usage examples:
/*
const client = createNetworkClient({
  baseUrl: 'https://api.example.com',
  defaultBodyType: 'json', // Default behavior
  defaultResponseType: 'auto' // Smart parsing
});

// JSON request (default behavior)
await client.post('/users', { name: 'John', email: 'john@example.com' });

// Form data
await client.post('/upload', formData, {}, { type: 'form' });

// Custom content type
await client.post('/binary', buffer, {}, {
  type: 'blob',
  contentType: 'application/octet-stream'
});

// Plain text
await client.post('/webhook', 'raw data', {}, { type: 'text' });

// Expect specific response type
await client.get<ArrayBuffer>('/download', { responseType: 'arrayBuffer' });

// Raw response access
const response = await client.get('/data');
if (response.raw) {
  const stream = response.raw.body; // Access raw ReadableStream
}
*/
