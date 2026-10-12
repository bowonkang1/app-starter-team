import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HydraDBService } from './hydradb.service';

@Module({
  imports: [ConfigModule],
  providers: [HydraDBService],
  exports: [HydraDBService],
})
export class HydraDBModule {}