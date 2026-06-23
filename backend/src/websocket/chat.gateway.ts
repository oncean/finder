import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../modules/auth/auth.service';
import { ChatService } from '../modules/chat/chat.service';

interface ClientInfo {
  userId: string;
  groupId: string;
  nickname: string;
  avatar: string;
}

@WebSocketGateway({
  path: '/ws/chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clients = new Map<string, ClientInfo>();
  private onlineUsers = new Map<string, Set<string>>();

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
  ) {}

  handleConnection(client: Socket) {
    console.log('客户端连接:', client.id);
  }

  handleDisconnect(client: Socket) {
    const info = this.clients.get(client.id);
    if (info) {
      const users = this.onlineUsers.get(info.groupId);
      if (users) {
        users.delete(info.userId);
        if (users.size === 0) {
          this.onlineUsers.delete(info.groupId);
        }
      }
      this.clients.delete(client.id);
      void this.broadcastOnlineCount(info.groupId);
    }
  }

  @SubscribeMessage('join')
  async handleJoin(client: Socket, payload: { token: string; groupId: string }) {
    try {
      const decoded = this.authService.verifyToken(payload.token);
      if (!decoded) {
        client.emit('error', { message: 'token无效' });
        return;
      }

      const user = await this.authService.getUserByToken(payload.token);

      this.clients.set(client.id, {
        userId: decoded.userId,
        groupId: payload.groupId,
        nickname: user.nickname,
        avatar: user.avatar,
      });

      client.join(payload.groupId);

      if (!this.onlineUsers.has(payload.groupId)) {
        this.onlineUsers.set(payload.groupId, new Set());
      }
      this.onlineUsers.get(payload.groupId).add(decoded.userId);

      await this.broadcastOnlineCount(payload.groupId);

      const messages = await this.chatService.getMessages(payload.groupId, undefined, 50);
      client.emit('history', { messages });

    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('message')
  async handleMessage(client: Socket, payload: { type: string; content: string; shopCard?: any; shopId?: string }) {
    const info = this.clients.get(client.id);
    if (!info) {
      client.emit('error', { message: '未加入群聊' });
      return;
    }

    try {
      const message = await this.chatService.sendMessage({
        groupId: info.groupId,
        type: payload.type as any,
        content: payload.type === 'shop_card' ? (payload.shopId || payload.content) : payload.content,
        shopCard: payload.shopCard,
      }, info.userId);

      this.server.to(info.groupId).emit('message', message);

    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong');
  }

  private async broadcastOnlineCount(groupId: string) {
    const users = await this.chatService.getMockOnlineUsers(groupId);
    const count = users.length;
    const topUsers = users.slice(0, 4).map(user => ({
      avatar: user.avatar,
    }));

    this.server.to(groupId).emit('online_count', { count, users: topUsers });
  }
}