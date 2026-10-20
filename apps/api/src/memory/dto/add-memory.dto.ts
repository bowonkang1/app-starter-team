import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AddMemoryRequest, MEMORY_PROVIDERS, MemoryProvider } from '@app-starter/shared';

export class AddMemoryDto implements AddMemoryRequest {
  @IsString()
  @IsNotEmpty({ message: 'Memory text is required' })
  @MaxLength(10000)
  text: string;

  @IsOptional()
  @IsIn(MEMORY_PROVIDERS)
  provider?: MemoryProvider;
}
