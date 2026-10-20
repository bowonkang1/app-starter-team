import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HydraDBService } from './hydradb.service';

/**
 * Provides the configured HydraDB client. It exposes no routes: memories are
 * reached only through the organization-scoped `MemoryModule`.
 */
@Module({
  imports: [ConfigModule],
  providers: [HydraDBService],
  exports: [HydraDBService],
})
export class HydraDBModule {}
