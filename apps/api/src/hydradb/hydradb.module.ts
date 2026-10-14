import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HydraDBService } from './hydradb.service';
import { HydraDBController } from './hydradb.controller';

@Module({
  imports: [ConfigModule],
  controllers: [HydraDBController],
  providers: [HydraDBService],
  exports: [HydraDBService],
})
export class HydraDBModule {}