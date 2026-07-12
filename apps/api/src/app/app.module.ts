import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { HealthModule } from './health/health.module';
import { CopilotModule } from './copilot/copilot.module';
import { DocumentsModule } from './documents/documents.module';
import { PwiAdvisorModule } from './pwi-advisor/pwi-advisor.module';

@Module({
  imports: [PrismaModule, AuthModule, SuppliersModule, HealthModule, CopilotModule, DocumentsModule, PwiAdvisorModule],
})
export class AppModule {}
