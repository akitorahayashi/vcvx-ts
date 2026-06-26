export interface Resource {
  id: string;
  name: string;
}

export interface CreateResourceRequest {
  name: string;
}

export interface ListResourcesResponse {
  resources: Resource[];
}
