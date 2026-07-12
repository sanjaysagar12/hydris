import { IsString, MinLength } from 'class-validator';

export class AnswerClarificationDto {
  @IsString()
  @MinLength(1)
  clarification: string;

  @IsString()
  @MinLength(1)
  conversationId: string;
}
