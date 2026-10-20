import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MEMORY_PROVIDERS, MemoryProvider, SearchMemoriesRequest } from '@app-starter/shared';

export class SearchMemoriesDto implements SearchMemoriesRequest {
  @IsString()
  @IsNotEmpty({ message: 'Query is required' })
  @MaxLength(1000)
  query: string;

  @IsOptional()
  @IsIn(MEMORY_PROVIDERS)
  provider?: MemoryProvider;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
