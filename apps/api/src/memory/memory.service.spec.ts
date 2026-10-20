import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrgRole } from '@prisma/client';
import { MemoryProvider } from '@app-starter/shared';
import { OrganizationsService } from '../organizations/organizations.service';
import { MemoryService } from './memory.service';
import { MEMORY_CONNECTORS, MemoryConnector } from './memory-connector.interface';
import {
  MemoryAccessDeniedException,
  MemoryProviderUnavailableException,
} from './exceptions/memory.exceptions';

describe('MemoryService', () => {
  const ORG = 'org-1';
  const USER = 'user-1';

  let service: MemoryService;
  let mockOrganizations: { getUserRoleInOrganization: jest.Mock };
  let mockHydra: jest.Mocked<MemoryConnector>;
  let mockCognee: jest.Mocked<MemoryConnector>;

  const buildConnector = (provider: MemoryProvider): jest.Mocked<MemoryConnector> => ({
    provider,
    addMemory: jest.fn().mockResolvedValue({ id: `${provider}-id`, status: 'queued' }),
    search: jest.fn().mockResolvedValue([]),
  });

  const createService = async (defaultProvider?: string): Promise<MemoryService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryService,
        { provide: MEMORY_CONNECTORS, useValue: [mockHydra, mockCognee] },
        { provide: OrganizationsService, useValue: mockOrganizations },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(defaultProvider) } },
      ],
    }).compile();

    return module.get<MemoryService>(MemoryService);
  };

  beforeEach(async () => {
    mockHydra = buildConnector('hydradb');
    mockCognee = buildConnector('cognee');
    mockOrganizations = {
      getUserRoleInOrganization: jest.fn().mockResolvedValue(OrgRole.MEMBER),
    };
    service = await createService();
  });

  describe('addMemory', () => {
    it('throws MemoryAccessDeniedException when the caller is not a member of the organization', async () => {
      mockOrganizations.getUserRoleInOrganization.mockResolvedValue(null);

      await expect(service.addMemory(USER, ORG, { text: 'hello' })).rejects.toThrow(
        MemoryAccessDeniedException,
      );
      expect(mockHydra.addMemory).not.toHaveBeenCalled();
    });

    it('scopes the connector call to the verified organization', async () => {
      await service.addMemory(USER, ORG, { text: '  hello  ' });

      expect(mockHydra.addMemory).toHaveBeenCalledWith({ organizationId: ORG }, 'hello');
    });

    it('routes to the requested provider and labels the response with it', async () => {
      const actual = await service.addMemory(USER, ORG, { text: 'hello', provider: 'cognee' });

      expect(mockCognee.addMemory).toHaveBeenCalled();
      expect(mockHydra.addMemory).not.toHaveBeenCalled();
      expect(actual).toEqual({ provider: 'cognee', id: 'cognee-id', status: 'queued' });
    });

    it('uses MEMORY_PROVIDER when the request names no provider', async () => {
      const inputService = await createService('cognee');

      await inputService.addMemory(USER, ORG, { text: 'hello' });

      expect(mockCognee.addMemory).toHaveBeenCalled();
    });

    it('falls back to hydradb when MEMORY_PROVIDER is not a known provider', async () => {
      const inputService = await createService('redis');

      await inputService.addMemory(USER, ORG, { text: 'hello' });

      expect(mockHydra.addMemory).toHaveBeenCalled();
    });

    it('throws MemoryProviderUnavailableException when the connector throws a non-HTTP error', async () => {
      mockHydra.addMemory.mockRejectedValue(new Error('socket hang up'));

      await expect(service.addMemory(USER, ORG, { text: 'hello' })).rejects.toThrow(
        MemoryProviderUnavailableException,
      );
    });
  });

  describe('search', () => {
    it('throws MemoryAccessDeniedException when the caller is not a member of the organization', async () => {
      mockOrganizations.getUserRoleInOrganization.mockResolvedValue(null);

      await expect(service.search(USER, ORG, { query: 'q' })).rejects.toThrow(
        MemoryAccessDeniedException,
      );
      expect(mockHydra.search).not.toHaveBeenCalled();
    });

    it('defaults the limit to 10 when the request omits it', async () => {
      await service.search(USER, ORG, { query: 'q' });

      expect(mockHydra.search).toHaveBeenCalledWith({ organizationId: ORG }, 'q', 10);
    });

    it('returns the connector hits under the provider that produced them', async () => {
      const expectedItems = [{ id: 'm1', content: 'hello', score: 0.9 }];
      mockCognee.search.mockResolvedValue(expectedItems);

      const actual = await service.search(USER, ORG, { query: 'q', provider: 'cognee' });

      expect(actual).toEqual({ provider: 'cognee', items: expectedItems });
    });
  });
});
