import { type FetchLike, type HeaderSource, HttpTransport } from './transport';
import type {
  CreateResourceRequest,
  ListResourcesResponse,
  Resource,
} from './types/resource';

export interface ExampleClientOptions {
  baseUrl: string;
  fetch?: FetchLike;
  headers?: HeaderSource;
}

export class ExampleClient {
  private readonly transport: HttpTransport;

  constructor(options: ExampleClientOptions) {
    this.transport = new HttpTransport(options);
  }

  async listResources(): Promise<Resource[]> {
    const response = await this.transport.request<ListResourcesResponse>({
      method: 'GET',
      path: '/resources',
    });

    return response.resources;
  }

  async getResource(id: string): Promise<Resource> {
    return this.transport.request<Resource>({
      method: 'GET',
      path: `/resources/${encodeURIComponent(id)}`,
    });
  }

  async createResource(request: CreateResourceRequest): Promise<Resource> {
    return this.transport.request<Resource>({
      body: request,
      method: 'POST',
      path: '/resources',
    });
  }
}
