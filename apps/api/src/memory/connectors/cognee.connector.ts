import { createHash } from 'crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemorySearchHit } from '@app-starter/shared';
import { MemoryProviderUnavailableException } from '../exceptions/memory.exceptions';
import {
  AddMemoryResult,
  MemoryConnector,
  MemoryScope,
  toPartitionName,
} from '../memory-connector.interface';

const DEFAULT_BASE_URL = 'http://localhost:8000';

/**
 * CHUNKS returns the stored text itself, which matches what HydraDB returns.
 * The completion search types would answer with LLM-generated prose and make
 * the two providers' results incomparable.
 */
const SEARCH_TYPE = 'CHUNKS';

type CogneeSearchItem = string | Record<string, unknown>;

/**
 * Cognee identifies a document within a dataset by its file name and answers
 * 409 when a name it already holds arrives with different content. Naming the
 * upload after a hash of its text gives every distinct memory its own
 * document, while re-saving identical text stays a no-op.
 */
const toFileName = (text: string): string =>
  `memory-${createHash('sha256').update(text).digest('hex').slice(0, 32)}.txt`;

/**
 * Cognee backend over its REST API (`/api/v1`). Each organization gets its
 * own dataset.
 *
 * Cognee has no official Node SDK, so this calls the server with `fetch`.
 * JSON bodies use the camelCase names the server's OpenAPI schema declares.
 */
@Injectable()
export class CogneeConnector implements MemoryConnector {
  readonly provider = 'cognee' as const;

  private readonly baseUrl: string;

  private readonly apiKey: string | undefined;

  constructor(configService: ConfigService) {
    const baseUrl = configService.get<string>('COGNEE_BASE_URL') || DEFAULT_BASE_URL;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = configService.get<string>('COGNEE_API_KEY')?.trim() || undefined;
  }

  /**
   * Add the text to the organization's dataset, then start `cognify` in the
   * background. Cognee only searches cognified data, and cognify runs an LLM
   * over the dataset, so it must not block the request.
   */
  async addMemory(scope: MemoryScope, text: string): Promise<AddMemoryResult> {
    const datasetName = toPartitionName(scope);

    // Uploading the text as a file works on every Cognee release; the newer
    // `raw_data` form field does not exist on older servers.
    const form = new FormData();
    form.append('data', new Blob([text], { type: 'text/plain' }), toFileName(text));
    form.append('datasetName', datasetName);

    await this.request('/api/v1/add', { method: 'POST', body: form });
    await this.request('/api/v1/cognify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datasets: [datasetName], runInBackground: true }),
    });

    return { id: null, status: 'queued' };
  }

  async search(scope: MemoryScope, query: string, limit: number): Promise<MemorySearchHit[]> {
    const response = await this.send('/api/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        searchType: SEARCH_TYPE,
        datasets: [toPartitionName(scope)],
        topK: limit,
      }),
    });

    // Cognee answers 404 both when the dataset does not exist yet and when
    // the graph is empty. Either way the organization simply has no memories.
    if (response.status === HttpStatus.NOT_FOUND) {
      return [];
    }

    this.assertOk(response);
    const body: unknown = await response.json();

    return this.flatten(body).slice(0, limit).map(this.toHit);
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const response = await this.send(path, init);
    this.assertOk(response);
    return response;
  }

  private async send(path: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers);
    if (this.apiKey) {
      headers.set('X-Api-Key', this.apiKey);
    }

    try {
      return await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    } catch {
      throw new MemoryProviderUnavailableException(this.provider);
    }
  }

  private assertOk(response: Response): void {
    if (!response.ok) {
      throw new MemoryProviderUnavailableException(this.provider, response.status);
    }
  }

  /**
   * With access control enabled, Cognee wraps results per dataset as
   * `{ dataset_name, search_result: [...] }`; without it, it returns the
   * results directly. Accept both.
   */
  private flatten(body: unknown): CogneeSearchItem[] {
    if (!Array.isArray(body)) {
      return [];
    }

    return body.flatMap((item: CogneeSearchItem) => {
      if (typeof item === 'object' && item !== null && 'search_result' in item) {
        const nested = item.search_result;
        return Array.isArray(nested) ? (nested as CogneeSearchItem[]) : [];
      }
      return [item];
    });
  }

  private readonly toHit = (item: CogneeSearchItem): MemorySearchHit => {
    if (typeof item === 'string') {
      return { id: null, content: item, score: null };
    }

    return {
      id: typeof item.id === 'string' ? item.id : null,
      content: typeof item.text === 'string' ? item.text : JSON.stringify(item),
      score: typeof item.score === 'number' ? item.score : null,
    };
  };
}
