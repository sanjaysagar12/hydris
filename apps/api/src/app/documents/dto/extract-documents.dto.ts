import { IsString, MinLength } from 'class-validator';

export class ExtractDocumentsDto {
  @IsString()
  @MinLength(1)
  supplierId: string;
}
