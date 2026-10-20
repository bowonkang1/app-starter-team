import type {
  AddMemoryRequest,
  AddMemoryResponse,
  SearchMemoriesRequest,
  SearchMemoriesResponse,
} from '@app-starter/shared';
import { apiClient } from './api-client';

export class MemoriesApi {
  async add(organizationId: string, data: AddMemoryRequest): Promise<AddMemoryResponse> {
    return apiClient.post<AddMemoryResponse>(`/api/organizations/${organizationId}/memories`, data);
  }

  async search(
    organizationId: string,
    data: SearchMemoriesRequest,
  ): Promise<SearchMemoriesResponse> {
    return apiClient.post<SearchMemoriesResponse>(
      `/api/organizations/${organizationId}/memories/search`,
      data,
    );
  }
}

export const memoriesApi = new MemoriesApi();
