/**
 * Memory backends the API can route to. The connector layer in
 * `apps/api/src/memory` maps each one onto the same request and response
 * shapes, so callers never see provider-specific payloads.
 */
export const MEMORY_PROVIDERS = ['hydradb', 'cognee'] as const;

export type MemoryProvider = (typeof MEMORY_PROVIDERS)[number];

export interface AddMemoryRequest {
  text: string;
  /** Omit to use the server's configured default provider. */
  provider?: MemoryProvider;
}

export interface AddMemoryResponse {
  provider: MemoryProvider;
  /** Provider-assigned id, or null when the provider does not return one. */
  id: string | null;
  /**
   * Both providers index asynchronously, so a memory is not guaranteed to be
   * searchable the moment this resolves.
   */
  status: 'queued' | 'failed';
}

export interface SearchMemoriesRequest {
  query: string;
  provider?: MemoryProvider;
  limit?: number;
}

export interface MemorySearchHit {
  id: string | null;
  content: string;
  /** Relevance score where the provider supplies one; scales differ by provider. */
  score: number | null;
}

export interface SearchMemoriesResponse {
  provider: MemoryProvider;
  items: MemorySearchHit[];
}
