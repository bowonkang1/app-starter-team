import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HydraDBClient } from '@hydradb/sdk';

@Injectable()
export class HydraDBService {
  private readonly client: HydraDBClient;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('HYDRA_DB_API_KEY');

    if (!apiKey?.trim()) {
      throw new Error('HYDRA_DB_API_KEY is not configured');
    }

    this.client = new HydraDBClient({
      token: apiKey.trim(),
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
    });
  }

  getClient(): HydraDBClient {
    return this.client;
  }

  async testConnection(): Promise<boolean> {
    await this.client.catalog();
    return true;
  }
}