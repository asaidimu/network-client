// Types
type HttpMethod =
  | 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH';

interface RequestError {
  message: string;
  status?: number;
  details?: unknown;
}

interface RequestOptions<T> {
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  responseHandler?: (response: globalThis.Response) => Promise<T>;
}

type Response<T> = {
  data?: T;
  error?: RequestError;
  success: boolean;
  status?: number;
  headers?: Headers;
};

interface MethodConfig {
  method: HttpMethod;
  requiresBody: boolean;
}

type RequestContext = {
  url: string;
  method: HttpMethod;
  options: RequestInit;
  requestId: string;
};

type ResponseContext<T> = {
  response: globalThis.Response;
  data?: T;
  error?: RequestError;
  requestId: string;
};

type Middleware = {
  beforeRequest?: (context: RequestContext) => Promise<RequestContext> | RequestContext;
  afterRequest?: (context: RequestContext) => Promise<RequestContext> | RequestContext;
  beforeResponse?: <T>(context: ResponseContext<T>) => Promise<ResponseContext<T>> | ResponseContext<T>;
  afterResponse?: <T>(context: ResponseContext<T>) => Promise<ResponseContext<T>> | ResponseContext<T>;
};

interface NetworkClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  defaultTimeout?: number;
  middleware?: Middleware[];
  responseHandler?: <T>(response: globalThis.Response) => Promise<T>;
}

/**
 * Default response handler
 */
async function defaultResponseHandler<T>(response: globalThis.Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.text().catch(() => null);
    let errorMessage = `Request failed with status: ${response.status}`;

    try {
      const errorJson = errorBody ? JSON.parse(errorBody) : null;
      if (errorJson?.message) {
        errorMessage = errorJson.message;
      }
    } catch {
      if (errorBody) {
        errorMessage = errorBody;
      }
    }

    throw new Error(errorMessage, { cause: { status: response.status, body: errorBody } });
  }

  const contentType = response.headers.get("Content-Type");
  if (contentType?.includes('application/json')) {
    return response.json();
  }

  const textContent = await response.text();
  return textContent as unknown as T;
}

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function request<T>(
  url: string,
  method: HttpMethod,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
    timeout?: number;
    signal?: AbortSignal;
    responseHandler?: (response: globalThis.Response) => Promise<T>;
  } = {},
  config: NetworkClientConfig
): Promise<Response<T>> {
  const requestId = generateRequestId();

  try {
    const controller = new AbortController();
    const timeoutId = options.timeout &&
      setTimeout(() => controller.abort(), options.timeout);

    let requestOptions: RequestInit = {
      method,
      credentials: "include",
      signal: options.signal || controller.signal,
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      }
    };

    if (options.body) {
      requestOptions.headers = {
        ...requestOptions.headers,
        "Content-Type": "application/json",
      };
      requestOptions.body = JSON.stringify(options.body);
    }

    let requestContext: RequestContext = {
      url,
      method,
      options: requestOptions,
      requestId
    };

    for (const m of config.middleware || []) {
      if (m.beforeRequest) {
        requestContext = await m.beforeRequest(requestContext);
      }
    }

    for (const m of config.middleware || []) {
      if (m.afterRequest) {
        requestContext = await m.afterRequest(requestContext);
      }
    }

    const response = await fetch(requestContext.url, requestContext.options);
    timeoutId && clearTimeout(timeoutId);

    // Select the appropriate response handler with priority:
    // 1. Per-request handler
    // 2. Client-level handler
    // 3. Default handler
    const responseHandler = options.responseHandler || config.responseHandler || defaultResponseHandler;

    let responseContext: ResponseContext<T> = {
      response,
      requestId
    };

    for (const m of config.middleware || []) {
      if (m.beforeResponse) {
        responseContext = await m.beforeResponse(responseContext);
      }
    }

    try {
      responseContext.data = await responseHandler(response);
    } catch (e) {
      responseContext.error = {
        message: e instanceof Error ? e.message : String(e),
        status: response.status,
        details: e instanceof Error ? e.cause : undefined
      };
    }

    for (const m of config.middleware || []) {
      if (m.afterResponse) {
        responseContext = await m.afterResponse(responseContext);
      }
    }

    return {
      data: responseContext.data,
      error: responseContext.error,
      success: !responseContext.error,
      status: response.status,
      headers: response.headers
    };
  } catch (e) {
    const error: RequestError = {
      message: e instanceof Error ? e.message : String(e),
      details: e instanceof Error ? e.cause : undefined
    };

    console.error('Request failed:', error);
    return { error, success: false };
  }
}

export default function createNetworkClient(config: NetworkClientConfig) {
  const endpoint = (path: string) => `${config.baseUrl}${path}`;

  const createRequest = <T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options: RequestOptions<T> = {}
  ): Promise<Response<T>> => {
    return request<T>(endpoint(path), method, {
      body,
      headers: {
        ...config.defaultHeaders,
        ...options.headers,
      },
      timeout: options.timeout || config.defaultTimeout,
      signal: options.signal,
      responseHandler: options.responseHandler,
    }, config);
  };

  const methodConfigs: MethodConfig[] = [
    { method: 'GET', requiresBody: false },
    { method: 'HEAD', requiresBody: false },
    { method: 'POST', requiresBody: true },
    { method: 'PUT', requiresBody: true },
    { method: 'DELETE', requiresBody: true },
    { method: 'CONNECT', requiresBody: true },
    { method: 'OPTIONS', requiresBody: false },
    { method: 'TRACE', requiresBody: false },
    { method: 'PATCH', requiresBody: true }
  ];

  return methodConfigs.reduce((acc, { method, requiresBody }) => {
    const methodName = method.toLowerCase();
    const handler = requiresBody
      ? <T>(path: string, body: unknown, options?: RequestOptions<T>) =>
          createRequest<T>(method, path, body, options)
      : <T>(path: string, options?: RequestOptions<T>) =>
          createRequest<T>(method, path, undefined, options);

    return { ...acc, [methodName]: handler };
  }, {} as Record<Lowercase<HttpMethod>, Function>);
}

declare global {
  type NetworkClient = ReturnType<typeof createNetworkClient>;
}

export type {
  Response,
  RequestOptions,
  Middleware,
  NetworkClientConfig,
  RequestError
};
