interface HttpOptions {
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface HttpResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText: string;
  data: T;
  headers: Headers;
}

export interface IHttpHandler {
  get<T = unknown>(endpoint: string, options?: HttpOptions): Promise<HttpResponse<T>>;
  post<T = unknown>(endpoint: string, options?: HttpOptions): Promise<HttpResponse<T>>;
}

export class HttpHandler implements IHttpHandler {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...defaultHeaders,
    };
  }

  /**
   * Performs a GET request
   */
  async get<T = unknown>(endpoint: string, options: HttpOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>("GET", endpoint, options);
  }

  /**
   * Performs a POST request
   */
  async post<T = unknown>(endpoint: string, options: HttpOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>("POST", endpoint, options);
  }

  /**
   * Generic request handler
   */
  private async request<T>(
    method: string,
    endpoint: string,
    options: HttpOptions = {},
  ): Promise<HttpResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { ...this.defaultHeaders, ...options.headers };

    const result = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    return {
      ok: result.ok,
      status: result.status,
      statusText: result.statusText,
      data: await this.parseResponse<T>(result),
      headers: result.headers,
    };
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type");
    let data: T;

    if (contentType?.includes("application/json")) {
      data = (await response.json()) as T;
    } else {
      data = (await response.text()) as T;
    }

    return data;
  }
}
