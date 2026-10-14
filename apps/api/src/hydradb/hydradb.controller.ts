import { BadRequestException, Body, Controller, Get, Param, Post } from '@nestjs/common';
import { HydraDBService } from './hydradb.service';

@Controller('hydradb')
export class HydraDBController {
  constructor(private readonly hydradbService: HydraDBService) {}

  @Post('memories')
  async createMemory(@Body() body: { text?: string }) {
    if (typeof body?.text !== 'string' || !body.text.trim()) {
      throw new BadRequestException('Memory text is required');
    }

    const result = await this.hydradbService.getClient().context.ingest({
      database: 'app-starter-db',
      memories: JSON.stringify([{ text: body.text.trim() }]),
      type: 'memory',
    });

    return result.data;
  }

  @Get('memories')
  async listMemories() {
    const client = this.hydradbService.getClient();

    const result = await client.context.list({
      database: 'app-starter-db',
      type: 'memory',
      page: 1,
      pageSize: 50,
      includeFields: ['title', 'description', 'note', 'type', 'timestamp'],
    });

    return result.data;
  }

  @Get('memories/:id')
  async getMemory(@Param('id') id: string) {
    const result = await this.hydradbService.getClient().context.inspect({
      database: 'app-starter-db',
      collection: 'uox72eknxa',
      id,
      mode: 'content',
    });
    return result.data;
  }
}
