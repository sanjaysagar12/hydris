import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

/** Full set of fields an admin may edit on any supplier record. */
export class UpdateSupplierDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() loc?: string;
  @IsOptional() @IsString() region?: string;

  @IsOptional() @IsIn(['high', 'med', 'low']) risk?: string;
  @IsOptional() @IsString() riskScore?: string;
  @IsOptional() @IsString() riskSrc?: string;
  @IsOptional() @IsString() basin?: string;

  @IsOptional() @IsIn(['Level 1', 'Level 2', 'Level 3']) tier?: string;
  @IsOptional() @IsIn(['up', 'down', 'flat']) tierTrend?: string;
  @IsOptional() @IsIn(['Level 1', 'Level 2', 'Level 3']) tierFrom?: string;
  @IsOptional() @IsIn(['Uncertified', 'Core', 'Gold', 'Platinum']) aws?: string;
  @IsOptional() @IsInt() @Min(0) higg?: number;
  @IsOptional() @IsInt() @Min(0) higgAvg?: number;
  @IsOptional() @IsString() auditDate?: string;
  @IsOptional() @IsString() auditor?: string;

  @IsOptional() @IsInt() @Min(0) withdrawalLpd?: number;
  @IsOptional() @IsInt() @Min(0) dischargeLpd?: number;
  @IsOptional() @IsInt() @Min(0) reuseVolumeLpd?: number;
}
