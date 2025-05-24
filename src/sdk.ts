import {ApiResponse, BodyOptions, createNetworkClient, HttpMethod, RequestOptions, type NetworkClient, type NetworkClientConfig} from "./index"
// SDK Base Class for easy inheritance
export abstract class BaseSDK {
  protected client: NetworkClient;

  constructor(config: NetworkClientConfig) {
    this.client = createNetworkClient(config);
  }

  protected request<T>(method: HttpMethod, path: string, body?: unknown, options?: RequestOptions, bodyOptions?: BodyOptions): Promise<ApiResponse<T>> {
    return this.client.request<T>(method, path, body, options, bodyOptions);
  }

  protected get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.client.get<T>(path, options);
  }

  protected post<T>(path: string, body?: unknown, options?: RequestOptions, bodyOptions?: BodyOptions): Promise<ApiResponse<T>> {
    return this.client.post<T>(path, body, options, bodyOptions);
  }

  protected put<T>(path: string, body?: unknown, options?: RequestOptions, bodyOptions?: BodyOptions): Promise<ApiResponse<T>> {
    return this.client.put<T>(path, body, options, bodyOptions);
  }

  protected patch<T>(path: string, body?: unknown, options?: RequestOptions, bodyOptions?: BodyOptions): Promise<ApiResponse<T>> {
    return this.client.patch<T>(path, body, options, bodyOptions);
  }

  protected delete<T>(path: string, body?: unknown, options?: RequestOptions, bodyOptions?: BodyOptions): Promise<ApiResponse<T>> {
    return this.client.delete<T>(path, body, options, bodyOptions);
  }

}

/*
// SDK Example
class FileAPI extends BaseSDK {
  constructor(apiKey: string) {
    super({
      baseUrl: 'https://files.api.com',
      defaultHeaders: { 'Authorization': `Bearer ${apiKey}` }
    });
  }

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.post('/upload', formData, {}, { type: 'form' });
  }

  async downloadFile(id: string) {
    return this.get<Blob>(`/files/${id}`, { responseType: 'blob' });
  }

  async sendWebhook(url: string, data: string) {
    return this.post('/webhook', data,
      { headers: { 'Content-Type': 'text/plain' } },
      { type: 'text' }
    );
  }
}
*/
