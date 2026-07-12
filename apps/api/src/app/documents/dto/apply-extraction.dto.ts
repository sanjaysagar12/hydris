import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { UpdateSupplierDto } from '../../suppliers/dto/update-supplier.dto';
import { CreateAlertDto } from '../../suppliers/dto/create-alert.dto';

export class ApplyExtractionDto {
  @IsString()
  @MinLength(1)
  supplierId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSupplierDto)
  updates?: UpdateSupplierDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAlertDto)
  newAlerts?: CreateAlertDto[];
}
