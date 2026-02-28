import { AppError, ERROR_CODES } from "@helio/shared";

interface APIClientOptions {
  baseURL: string;
  getToken?: () => Promise<string | null>;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class APIClient {
  private baseURL: string;
  private getToken?: () => Promise<string | null>;

  constructor(options: APIClientOptions) {
    this.baseURL = options.baseURL.replace(/\/$/, "");
    this.getToken = options.getToken;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;

    let url = `${this.baseURL}${path}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (this.getToken) {
      const token = await this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new AppError(
        errorBody?.error?.message ?? `Request failed: ${response.status}`,
        ERROR_CODES.API_ERROR,
        response.status
      );
    }

    return response.json() as Promise<T>;
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}

export function createAPIClient(baseURL: string, getToken?: () => Promise<string | null>) {
  return new APIClient({ baseURL, getToken });
}
