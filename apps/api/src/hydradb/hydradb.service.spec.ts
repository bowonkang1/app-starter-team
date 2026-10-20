import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HydraDBService } from './hydradb.service';

describe('HydraDBService', () => {
  const buildService = (config: Record<string, string> = {}): HydraDBService =>
    new HydraDBService({ get: (key: string) => config[key] } as unknown as ConfigService);

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts without throwing when HYDRA_DB_API_KEY is missing', () => {
    expect(() => buildService()).not.toThrow();
  });

  it('getClient throws when HYDRA_DB_API_KEY is missing', () => {
    const service = buildService({ HYDRA_DB_API_KEY: '  ' });

    expect(() => service.getClient()).toThrow('HYDRA_DB_API_KEY is not configured');
  });

  it('getClient returns a client when HYDRA_DB_API_KEY is configured', () => {
    const service = buildService({ HYDRA_DB_API_KEY: 'key' });

    expect(service.getClient()).toBeDefined();
  });
});
