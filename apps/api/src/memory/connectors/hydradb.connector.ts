import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemorySearchHit } from '@app-starter/shared';
import { HydraDBService } from '../../hydradb/hydradb.service';
import {
  AddMemoryResult,
  MemoryConnector,
  MemoryScope,
  toPartitionName,
} from '../memory-connector.interface';

const DEFAULT_DATABASE = 'app-starter-db';

/**
 * HydraDB backend. All organizations share one database; each organization
 * gets its own collection inside it.
 */
@Injectable()
export class HydraDBConnector implements MemoryConnector {
  readonly provider = 'hydradb' as const;

  private readonly database: string;

  constructor(
    private readonly hydradbService: HydraDBService,
    configService: ConfigService,
  ) {
    this.database = configService.get<string>('HYDRA_DB_DATABASE') || DEFAULT_DATABASE;
  }

  async addMemory(scope: MemoryScope, text: string): Promise<AddMemoryResult> {
    const response = await this.hydradbService.getClient().context.ingest({
      database: this.database,
      collection: toPartitionName(scope),
      type: 'memory',
      memories: JSON.stringify([{ text }]),
    });

    const item = response.data?.results?.[0];
    const hasFailed = response.success === false || Boolean(item?.error);

    return { id: item?.id ?? null, status: hasFailed ? 'failed' : 'queued' };
  }

  async search(scope: MemoryScope, query: string, limit: number): Promise<MemorySearchHit[]> {
    const response = await this.hydradbService.getClient().query({
      database: this.database,
      collection: toPartitionName(scope),
      type: 'memory',
      query,
      maxResults: limit,
      // The default also renders an `llm_prompt` string we would discard.
      responseFormat: 'structured',
    });

    const data = response.data;
    if (!data || typeof data === 'string') {
      return [];
    }

    return (data.chunks ?? []).map((chunk) => ({
      id: chunk.id ?? chunk.chunkUuid ?? null,
      content: chunk.chunkContent ?? '',
      score: chunk.relevancyScore ?? null,
    }));
  }
}
