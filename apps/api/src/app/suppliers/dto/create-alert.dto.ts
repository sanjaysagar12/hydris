import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAlertDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  meta: string;

  @IsOptional()
  @IsIn(['Critical', 'Major', 'Minor'])
  severity?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
