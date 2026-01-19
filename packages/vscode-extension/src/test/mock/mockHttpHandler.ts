import { IHttpHandler, HttpResponse } from "../../handlers/httpHandler";

export class MockHttpHandler implements IHttpHandler {
  private mockResponses: Map<string, HttpResponse<unknown>> = new Map();

  /**
   * Set a mock response for a specific endpoint
   */
  setMockResponse<T>(endpoint: string, response: HttpResponse<T>): void {
    this.mockResponses.set(endpoint, response);
  }

  async get<T = unknown>(endpoint: string): Promise<HttpResponse<T>> {
    const mockResponse = this.mockResponses.get(endpoint);
    if (!mockResponse) {
      throw new Error(`No mock response configured for GET ${endpoint}`);
    }
    return mockResponse as HttpResponse<T>;
  }

  async post<T = unknown>(endpoint: string): Promise<HttpResponse<T>> {
    const mockResponse = this.mockResponses.get(endpoint);
    if (!mockResponse) {
      throw new Error(`No mock response configured for POST ${endpoint}`);
    }
    return mockResponse as HttpResponse<T>;
  }
}
