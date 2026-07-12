import { Module } from '@nestjs/common';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { PwiAdvisorController } from './pwi-advisor.controller';
import { PwiAdvisorService } from './pwi-advisor.service';

@Module({
  imports: [SuppliersModule],
  controllers: [PwiAdvisorController],
  providers: [PwiAdvisorService],
})
export class PwiAdvisorModule {}
