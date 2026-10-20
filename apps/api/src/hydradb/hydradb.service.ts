import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HydraDBClient } from '@hydradb/sdk';

/**
 * Holds the HydraDB client. A missing HYDRA_DB_API_KEY disables HydraDB
 * rather than failing startup, so the API still runs on another memory
 * provider; using the client without a key throws at that point instead.
 */
@Injectable()
export class HydraDBService {
  private readonly logger = new Logger(HydraDBService.name);

  private readonly client: HydraDBClient | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('HYDRA_DB_API_KEY')?.trim();

    if (!apiKey) {
      this.logger.warn('HYDRA_DB_API_KEY is not configured; HydraDB is disabled');
      this.client = null;
      return;
    }

    this.client = new HydraDBClient({
      token: apiKey,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }

  getClient(): HydraDBClient {
    if (!this.client) {
      throw new Error('HYDRA_DB_API_KEY is not configured');
    }

    return this.client;
  }

  async testConnection(): Promise<boolean> {
    await this.getClient().catalog();
    return true;
  }
}
