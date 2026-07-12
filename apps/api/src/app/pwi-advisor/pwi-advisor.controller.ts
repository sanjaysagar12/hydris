import { randomUUID } from 'crypto';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PwiAdvisorService } from './pwi-advisor.service';
import { AdvisorAskDto } from './dto/advisor-ask.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('suppliers/:supplierId/advisor')
export class PwiAdvisorController {
  constructor(private readonly advisorService: PwiAdvisorService) {}

  @Post('ask')
  async ask(@Param('supplierId') supplierId: string, @Body() dto: AdvisorAskDto) {
    const conversationId = dto.conversationId || randomUUID();
    const result = await this.advisorService.ask(supplierId, conversationId, dto.question);
    return { ...result, conversationId };
  }

  @Get('conversation/:conversationId')
  getConversation(@Param('conversationId') conversationId: string) {
    return { messages: this.advisorService.getConversation(conversationId) };
  }

  @Post('reset')
  reset(@Body('conversationId') conversationId: string) {
    if (conversationId) this.advisorService.reset(conversationId);
    return { success: true };
  }
}
