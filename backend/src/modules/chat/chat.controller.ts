import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('group/:groupId')
  async getGroupInfo(@Query('groupId') groupId: string) {
    return this.chatService.getGroupInfo(groupId);
  }

  @Get('messages')
  async getMessages(
    @Query('groupId') groupId: string,
    @Query('lastId') lastId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getMessages(groupId, lastId, limit || 20);
  }

  @Post('message/send')
  @UseGuards(AuthGuard)
  async sendMessage(@Body() dto: SendMessageDto, @Request() req) {
    return this.chatService.sendMessage(dto, req.user.userId);
  }
}
