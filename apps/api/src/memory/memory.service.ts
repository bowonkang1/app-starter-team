import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AddMemoryResponse,
  MEMORY_PROVIDERS,
  MemoryProvider,
  SearchMemoriesResponse,
} from '@app-starter/shared';
import { OrganizationsService } from '../organizations/organizations.service';
import { AddMemoryDto } from './dto/add-memory.dto';
import { SearchMemoriesDto } from './dto/search-memories.dto';
import {
  MemoryAccessDeniedException,
  MemoryProviderUnavailableException,
} from './exceptions/memory.exceptions';
import { MEMORY_CONNECTORS, MemoryConnector, MemoryScope } from './memory-connector.interface';

const DEFAULT_SEARCH_LIMIT = 10;

/**
 * Organization-scoped memory storage over interchangeable backends.
 *
 * The caller's membership is resolved before any connector is touched, and
 * the connector receives only the verified organization as its scope.
 */
@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  private readonly connectors: ReadonlyMap<MemoryProvider, MemoryConnector>;

  private readonly defaultProvider: MemoryProvider;

  constructor(
    @Inject(MEMORY_CONNECTORS) connectors: MemoryConnector[],
    private readonly organizationsService: OrganizationsService,
    configService: ConfigService,
  ) {
    this.connectors = new Map(connectors.map((connector) => [connector.provider, connector]));
    this.defaultProvider = this.parseProvider(configService.get<string>('MEMORY_PROVIDER'));
  }

  async addMemory(
    userId: string,
    organizationId: string,
    data: AddMemoryDto,
  ): Promise<AddMemoryResponse> {
    const scope = await this.requireMember(userId, organizationId, 'add');
    const connector = this.resolve(data.provider);

    const result = await this.callProvider(connector, () =>
      connector.addMemory(scope, data.text.trim()),
    );

    return { provider: connector.provider, ...result };
  }

  async search(
    userId: string,
    organizationId: string,
    data: SearchMemoriesDto,
  ): Promise<SearchMemoriesResponse> {
    const scope = await this.requireMember(userId, organizationId, 'search');
    const connector = this.resolve(data.provider);
    const limit = data.limit ?? DEFAULT_SEARCH_LIMIT;

    const items = await this.callProvider(connector, () =>
      connector.search(scope, data.query.trim(), limit),
    );

    return { provider: connector.provider, items };
  }

  private async requireMember(
    userId: string,
    organizationId: string,
    action: string,
  ): Promise<MemoryScope> {
    const role = await this.organizationsService.getUserRoleInOrganization(userId, organizationId);

    if (!role) {
      throw new MemoryAccessDeniedException(action);
    }

    return { organizationId };
  }

  private resolve(provider: MemoryProvider | undefined): MemoryConnector {
    const name = provider ?? this.defaultProvider;
    const connector = this.connectors.get(name);

    if (!connector) {
      throw new MemoryProviderUnavailableException(name);
    }

    return connector;
  }

  /**
   * SDK and network errors would otherwise surface as a bare 500. Report them
   * as a provider failure and keep the original for the logs.
   */
  private async callProvider<T>(connector: MemoryConnector, call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Memory provider "${connector.provider}" failed`, error as Error);
      throw new MemoryProviderUnavailableException(connector.provider);
    }
  }

  private parseProvider(value: string | undefined): MemoryProvider {
    const isKnown = (MEMORY_PROVIDERS as readonly string[]).includes(value ?? '');
    return isKnown ? (value as MemoryProvider) : 'hydradb';
  }
}
