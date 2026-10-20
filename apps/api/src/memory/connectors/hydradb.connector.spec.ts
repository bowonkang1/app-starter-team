import { ConfigService } from '@nestjs/config';
import { HydraDBService } from '../../hydradb/hydradb.service';
import { HydraDBConnector } from './hydradb.connector';

describe('HydraDBConnector', () => {
  const SCOPE = { organizationId: 'org-1' };
  const EXPECTED_COLLECTION = 'org_org_1';

  let mockClient: { context: { ingest: jest.Mock }; query: jest.Mock };
  let connector: HydraDBConnector;

  beforeEach(() => {
    mockClient = { context: { ingest: jest.fn() }, query: jest.fn() };
    const mockHydraService = { getClient: () => mockClient } as unknown as HydraDBService;
    const mockConfig = { get: () => undefined } as unknown as ConfigService;
    connector = new HydraDBConnector(mockHydraService, mockConfig);
  });

  describe('addMemory', () => {
    it('ingests the memory into the organization collection of the default database', async () => {
      mockClient.context.ingest.mockResolvedValue({
        success: true,
        data: { results: [{ id: 'm1' }] },
      });

      const actual = await connector.addMemory(SCOPE, 'hello');

      expect(mockClient.context.ingest).toHaveBeenCalledWith({
        database: 'app-starter-db',
        collection: EXPECTED_COLLECTION,
        type: 'memory',
        memories: JSON.stringify([{ text: 'hello' }]),
      });
      expect(actual).toEqual({ id: 'm1', status: 'queued' });
    });

    it('reports failed when HydraDB returns an error for the item', async () => {
      mockClient.context.ingest.mockResolvedValue({
        success: true,
        data: { results: [{ id: 'm1', error: 'too large' }] },
      });

      const actual = await connector.addMemory(SCOPE, 'hello');

      expect(actual.status).toBe('failed');
    });
  });

  describe('search', () => {
    it('queries memories in the organization collection only', async () => {
      mockClient.query.mockResolvedValue({ data: { chunks: [] } });

      await connector.search(SCOPE, 'q', 5);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.objectContaining({ collection: EXPECTED_COLLECTION, type: 'memory', maxResults: 5 }),
      );
    });

    it('maps chunks to hits', async () => {
      mockClient.query.mockResolvedValue({
        data: { chunks: [{ id: 'm1', chunkContent: 'hello', relevancyScore: 0.7 }] },
      });

      const actual = await connector.search(SCOPE, 'q', 5);

      expect(actual).toEqual([{ id: 'm1', content: 'hello', score: 0.7 }]);
    });
  });
});
