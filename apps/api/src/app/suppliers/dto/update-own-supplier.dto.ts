import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

/** Fields a supplier may edit on their own record (self-reported data). */
export class UpdateOwnSupplierDto {
  @IsOptional() @IsIn(['Level 1', 'Level 2', 'Level 3']) tier?: string;
  @IsOptional() @IsIn(['Uncertified', 'Core', 'Gold', 'Platinum']) aws?: string;
  @IsOptional() @IsInt() @Min(0) higg?: number;
  @IsOptional() @IsString() auditDate?: string;
  @IsOptional() @IsString() auditor?: string;

  @IsOptional() @IsInt() @Min(0) withdrawalLpd?: number;
  @IsOptional() @IsInt() @Min(0) dischargeLpd?: number;
  @IsOptional() @IsInt() @Min(0) reuseVolumeLpd?: number;
}
