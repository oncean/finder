import { Controller, Get, Post, Body, Query, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ChatRealtimeService } from '../../websocket/chat-realtime.service';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatRealtimeService: ChatRealtimeService,
  ) {}

  @Get('group/:groupId/online-users')
  async getOnlineUsers(@Param('groupId') groupId: string) {
    return this.chatService.getOnlineUsersByGroupId(groupId);
  }

  @Get('group/:groupId')
  async getGroupInfo(
    @Param('groupId') groupId: string,
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
  ) {
    return this.chatService.getGroupInfo(
      groupId,
      lat !== undefined ? parseFloat(lat as any) : undefined,
      lng !== undefined ? parseFloat(lng as any) : undefined,
    );
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
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async sendMessage(@Body() dto: SendMessageDto, @Request() req) {
    console.log('[ChatController] 收到消息请求:', JSON.stringify(dto, null, 2));
    console.log('[ChatController] 发送者信息:', req.user);
    const message = await this.chatService.sendMessage(dto, req.user.userId);
    this.chatRealtimeService.broadcastToGroup(message.groupId, 'message', message);
    return message;
  }
}
