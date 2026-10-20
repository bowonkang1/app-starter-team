import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AddMemoryResponse, SearchMemoriesResponse, TokenPayload } from '@app-starter/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { MemoryService } from './memory.service';
import { AddMemoryDto } from './dto/add-memory.dto';
import { SearchMemoriesDto } from './dto/search-memories.dto';

/**
 * Organization-scoped memory routes, backed by HydraDB or Cognee.
 *
 * Search is a POST because the query is free text that does not belong in
 * URLs and access logs.
 */
@ApiTags('memories')
@Controller('organizations/:organizationId/memories')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Store a memory for an organization' })
  @ApiResponse({ status: 201, description: 'Memory queued for indexing' })
  async add(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Body() data: AddMemoryDto,
  ): Promise<AddMemoryResponse> {
    return this.memoryService.addMemory(req.user.sub, organizationId, data);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Search an organization's memories" })
  async search(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Body() data: SearchMemoriesDto,
  ): Promise<SearchMemoriesResponse> {
    return this.memoryService.search(req.user.sub, organizationId, data);
  }
}
