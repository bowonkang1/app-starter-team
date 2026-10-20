import { AddMemoryResponse, MemoryProvider, MemorySearchHit } from '@app-starter/shared';

/**
 * The tenant a connector call runs on behalf of. Connectors derive their
 * provider-side partition (HydraDB collection, Cognee dataset) from this and
 * never accept one from the caller, so one organization cannot address
 * another's memories.
 */
export interface MemoryScope {
  readonly organizationId: string;
}

export type AddMemoryResult = Omit<AddMemoryResponse, 'provider'>;

/**
 * Common contract over the memory backends. Add a backend by implementing
 * this and registering it under `MEMORY_CONNECTORS` in `MemoryModule`.
 */
export interface MemoryConnector {
  readonly provider: MemoryProvider;

  addMemory(scope: MemoryScope, text: string): Promise<AddMemoryResult>;

  search(scope: MemoryScope, query: string, limit: number): Promise<MemorySearchHit[]>;
}

export const MEMORY_CONNECTORS = Symbol('MEMORY_CONNECTORS');

/**
 * Provider-side partition name for an organization. Restricted to
 * `[a-z0-9_]` because Cognee rejects dataset names containing dots or
 * spaces, and one naming rule for both providers keeps them easy to compare.
 */
export const toPartitionName = (scope: MemoryScope): string =>
  `org_${scope.organizationId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
