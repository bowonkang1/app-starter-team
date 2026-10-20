import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HydraDBModule } from '../hydradb/hydradb.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CogneeConnector } from './connectors/cognee.connector';
import { HydraDBConnector } from './connectors/hydradb.connector';
import { MEMORY_CONNECTORS, MemoryConnector } from './memory-connector.interface';
import { MemoryController } from './memory.controller';
import { MemoryService } from './memory.service';

@Module({
  imports: [ConfigModule, HydraDBModule, OrganizationsModule],
  controllers: [MemoryController],
  providers: [
    HydraDBConnector,
    CogneeConnector,
    {
      provide: MEMORY_CONNECTORS,
      useFactory: (...connectors: MemoryConnector[]) => connectors,
      inject: [HydraDBConnector, CogneeConnector],
    },
    MemoryService,
  ],
  exports: [MemoryService],
})
export class MemoryModule {}
