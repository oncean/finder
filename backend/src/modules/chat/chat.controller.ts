import { Controller, Get, Post, Body, Query, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('group/:groupId/online-users')
  async getOnlineUsers(@Param('groupId') groupId: string) {
    return this.chatService.getOnlineUsersByGroupId(groupId);
  }

  @Get('group/:groupId')
  async getGroupInfo(
    @Param('groupId') groupId: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const parsedLat = lat ? parseFloat(lat) : undefined;
    const parsedLng = lng ? parseFloat(lng) : undefined;
    return this.chatService.getGroupInfo(groupId, parsedLat, parsedLng);
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
    return this.chatService.sendMessage(dto, req.user.userId);
  }
}
