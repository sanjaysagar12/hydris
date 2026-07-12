import { randomUUID } from 'crypto';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CopilotService } from './copilot.service';
import { AskDto } from './dto/ask.dto';
import { AnswerClarificationDto } from './dto/answer-clarification.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('copilot')
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @Post('ask')
  async ask(@Body() dto: AskDto) {
    const conversationId = dto.conversationId || randomUUID();
    const result = await this.copilotService.ask(conversationId, dto.question);
    return { ...result, conversationId };
  }

  @Post('answer-clarification')
  async answerClarification(@Body() dto: AnswerClarificationDto) {
    const result = await this.copilotService.answerClarification(dto.conversationId, dto.clarification);
    return { ...result, conversationId: dto.conversationId };
  }

  @Get('conversation/:conversationId')
  getConversation(@Param('conversationId') conversationId: string) {
    return { messages: this.copilotService.getConversation(conversationId) };
  }

  @Post('reset')
  reset(@Body('conversationId') conversationId: string) {
    if (conversationId) this.copilotService.reset(conversationId);
    return { success: true };
  }
}
