import { ConfigService } from '@nestjs/config';
import { MemoryProviderUnavailableException } from '../exceptions/memory.exceptions';
import { CogneeConnector } from './cognee.connector';

describe('CogneeConnector', () => {
  const SCOPE = { organizationId: 'Org-1' };
  const EXPECTED_DATASET = 'org_org_1';

  let mockFetch: jest.Mock;

  const buildConnector = (config: Record<string, string> = {}): CogneeConnector =>
    new CogneeConnector({ get: (key: string) => config[key] } as unknown as ConfigService);

  const jsonResponse = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status });

  beforeEach(() => {
    mockFetch = jest.fn().mockResolvedValue(jsonResponse({}));
    global.fetch = mockFetch;
  });

  describe('addMemory', () => {
    it('adds the text to the organization dataset and then cognifies that dataset', async () => {
      const connector = buildConnector({ COGNEE_BASE_URL: 'http://cognee:8000/' });

      const actual = await connector.addMemory(SCOPE, 'hello');

      const [addUrl, addInit] = mockFetch.mock.calls[0];
      expect(addUrl).toBe('http://cognee:8000/api/v1/add');
      expect((addInit.body as FormData).get('datasetName')).toBe(EXPECTED_DATASET);

      const [cognifyUrl, cognifyInit] = mockFetch.mock.calls[1];
      expect(cognifyUrl).toBe('http://cognee:8000/api/v1/cognify');
      expect(JSON.parse(cognifyInit.body)).toEqual({
        datasets: [EXPECTED_DATASET],
        runInBackground: true,
      });
      expect(actual).toEqual({ id: null, status: 'queued' });
    });

    it('uploads different texts under different file names and identical texts under the same one', async () => {
      const connector = buildConnector();
      const uploadedFileName = (callIndex: number): string =>
        ((mockFetch.mock.calls[callIndex][1].body as FormData).get('data') as File).name;

      await connector.addMemory(SCOPE, 'first memory');
      await connector.addMemory(SCOPE, 'second memory');
      await connector.addMemory(SCOPE, 'first memory');

      const actualFirst = uploadedFileName(0);
      expect(uploadedFileName(2)).not.toBe(actualFirst);
      expect(uploadedFileName(4)).toBe(actualFirst);
    });

    it('sends the API key as X-Api-Key when one is configured', async () => {
      const connector = buildConnector({ COGNEE_API_KEY: ' secret ' });

      await connector.addMemory(SCOPE, 'hello');

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('X-Api-Key')).toBe('secret');
    });

    it('throws MemoryProviderUnavailableException without cognifying when add fails', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ detail: 'boom' }, 500));
      const connector = buildConnector();

      await expect(connector.addMemory(SCOPE, 'hello')).rejects.toThrow(
        MemoryProviderUnavailableException,
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('throws MemoryProviderUnavailableException when the server is unreachable', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'));
      const connector = buildConnector();

      await expect(connector.addMemory(SCOPE, 'hello')).rejects.toThrow(
        MemoryProviderUnavailableException,
      );
    });
  });

  describe('search', () => {
    it('searches only the organization dataset', async () => {
      mockFetch.mockResolvedValue(jsonResponse([]));
      const connector = buildConnector();

      await connector.search(SCOPE, 'q', 5);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({
        query: 'q',
        searchType: 'CHUNKS',
        datasets: [EXPECTED_DATASET],
        topK: 5,
      });
    });

    it('returns no hits when Cognee answers 404 for a dataset with no data', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ detail: 'NoDataError' }, 404));
      const connector = buildConnector();

      const actual = await connector.search(SCOPE, 'q', 5);

      expect(actual).toEqual([]);
    });

    it('normalizes plain and per-dataset wrapped results into hits', async () => {
      const inputBody = [
        { id: 'c1', text: 'first', score: 0.8 },
        { dataset_name: EXPECTED_DATASET, search_result: ['second'] },
      ];
      mockFetch.mockResolvedValue(jsonResponse(inputBody));
      const connector = buildConnector();

      const actual = await connector.search(SCOPE, 'q', 5);

      expect(actual).toEqual([
        { id: 'c1', content: 'first', score: 0.8 },
        { id: null, content: 'second', score: null },
      ]);
    });

    it('caps the hits at the requested limit', async () => {
      mockFetch.mockResolvedValue(jsonResponse(['a', 'b', 'c']));
      const connector = buildConnector();

      const actual = await connector.search(SCOPE, 'q', 2);

      expect(actual).toHaveLength(2);
    });
  });
});
