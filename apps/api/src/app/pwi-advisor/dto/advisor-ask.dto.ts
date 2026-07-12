import { IsOptional, IsString, MinLength } from 'class-validator';

export class AdvisorAskDto {
  @IsString()
  @MinLength(1)
  question: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}
