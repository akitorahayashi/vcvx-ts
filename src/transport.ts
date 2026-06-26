import {
  ClientConfigurationError,
  HttpError,
  ResponseParseError,
} from './errors';

export type FetchLike = (
  input: Request | URL | string,
  init?: RequestInit,
) => Promise<Response>;

export type HeaderSource = ConstructorParameters<typeof Headers>[0];

export type HttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';

export type QueryValue = boolean | number | string | undefined;

export interface HttpRequest {
  body?: unknown;
  headers?: HeaderSource;
  method: HttpMethod;
  path: string;
  query?: Record<string, QueryValue>;
}

export interface HttpTransportOptions {
  baseUrl: string;
  fetch?: FetchLike;
  headers?: HeaderSource;
}

export class HttpTransport {
  readonly baseUrl: URL;
  readonly fetch: FetchLike;
  readonly headers?: HeaderSource;

  constructor(options: HttpTransportOptions) {
    if (options.baseUrl.trim().length === 0) {
      throw new ClientConfigurationError('baseUrl is required.');
    }

    this.baseUrl = new URL(options.baseUrl);
    this.fetch = options.fetch ?? fetch;
    this.headers = options.headers;
  }

  async request<T>(request: HttpRequest): Promise<T> {
    const url = this.buildUrl(request);
    const response = await this.fetch(url, this.buildRequestInit(request));

    if (!response.ok) {
      throw new HttpError(
        `HTTP request failed with ${response.status} ${response.statusText}.`,
        response.status,
        response.statusText,
        await response.text(),
      );
    }

    return this.parseJson<T>(response);
  }

  private buildUrl(request: HttpRequest): URL {
    const url = new URL(request.path.replace(/^\/+/, ''), this.baseUrl);

    for (const [key, value] of Object.entries(request.query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    return url;
  }

  private buildRequestInit(request: HttpRequest): RequestInit {
    const headers = new Headers(this.headers);
    const init: RequestInit = {
      headers,
      method: request.method,
    };

    for (const [key, value] of new Headers(request.headers)) {
      headers.set(key, value);
    }

    if (request.body !== undefined) {
      headers.set('content-type', 'application/json');
      init.body = JSON.stringify(request.body);
    }

    return init;
  }

  private async parseJson<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }

    const body = await response.text();

    if (body.length === 0) {
      throw new ResponseParseError('HTTP response body is empty.', body);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new ResponseParseError(
        'HTTP response content type is not JSON.',
        body,
      );
    }

    try {
      return JSON.parse(body) as T;
    } catch (error) {
      throw new ResponseParseError(
        'HTTP response body is invalid JSON.',
        body,
        {
          cause: error,
        },
      );
    }
  }
}
