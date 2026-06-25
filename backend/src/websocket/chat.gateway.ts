import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { AuthService } from '../modules/auth/auth.service';
import { ChatService } from '../modules/chat/chat.service';
import { randomUUID } from 'crypto';

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
  private socketMap = new Map<string, WebSocket>();

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
  ) {}

  handleConnection(client: WebSocket) {
    const clientId = randomUUID();
    (client as any).id = clientId;
    console.log('客户端连接:', clientId);
    this.socketMap.set(clientId, client);

    // 监听消息
    client.on('message', async (rawData: any) => {
      try {
        const data = JSON.parse(rawData.toString());
        console.log('收到消息:', data.type, data);

        switch (data.type) {
          case 'join':
            await this.handleJoin(client, data);
            break;
          case 'message':
            await this.handleMessage(client, data);
            break;
          case 'ping':
            this.handlePing(client);
            break;
          default:
            console.log('未知消息类型:', data.type);
        }
      } catch (error) {
        console.error('消息处理错误:', error);
        this.sendToClient(client, 'error', { message: '消息格式错误' });
      }
    });
  }

  handleDisconnect(client: WebSocket) {
    const clientId = (client as any).id;
    console.log('客户端断开:', clientId);
    const info = this.clients.get(clientId);
    if (info) {
      const users = this.onlineUsers.get(info.groupId);
      if (users) {
        users.delete(info.userId);
        if (users.size === 0) {
          this.onlineUsers.delete(info.groupId);
        }
      }
      this.clients.delete(clientId);
      void this.broadcastOnlineCount(info.groupId);
    }
    this.socketMap.delete(clientId);
  }

  private async handleJoin(client: WebSocket, payload: { token: string; groupId: string }) {
    try {
      const clientId = (client as any).id;
      const decoded = this.authService.verifyToken(payload.token);
      if (!decoded) {
        this.sendToClient(client, 'error', { message: 'token无效' });
        return;
      }

      const user = await this.authService.getUserByToken(payload.token);

      this.clients.set(clientId, {
        userId: decoded.userId,
        groupId: payload.groupId,
        nickname: user.nickname,
        avatar: user.avatar,
      });

      if (!this.onlineUsers.has(payload.groupId)) {
        this.onlineUsers.set(payload.groupId, new Set());
      }
      this.onlineUsers.get(payload.groupId).add(decoded.userId);

      await this.broadcastOnlineCount(payload.groupId);

      const messages = await this.chatService.getMessages(payload.groupId, undefined, 50);
      this.sendToClient(client, 'history', { messages });

    } catch (error) {
      this.sendToClient(client, 'error', { message: error.message });
    }
  }

  private async handleMessage(client: WebSocket, payload: { type: string; messageType?: string; content: string; shopCard?: any; shopId?: string }) {
    const clientId = (client as any).id;
    const info = this.clients.get(clientId);
    if (!info) {
      this.sendToClient(client, 'error', { message: '未加入群聊' });
      return;
    }

    try {
      const message = await this.chatService.sendMessage({
        groupId: info.groupId,
        type: (payload.messageType || 'text') as any,
        content: payload.messageType === 'shop_card' ? (payload.shopId || payload.content) : payload.content,
        shopId: payload.messageType === 'shop_card' ? (payload.shopId || payload.shopCard?.shopId || payload.content) : undefined,
        shopCard: payload.shopCard,
      }, info.userId);

      this.broadcastToGroup(info.groupId, 'message', message);

    } catch (error) {
      this.sendToClient(client, 'error', { message: error.message });
    }
  }

  private handlePing(client: WebSocket) {
    this.sendToClient(client, 'pong', {});
  }

  private sendToClient(client: WebSocket, event: string, data: any) {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: event, ...data }));
    }
  }

  private broadcastToGroup(groupId: string, event: string, data: any) {
    const message = JSON.stringify({ type: event, ...data });
    for (const [clientId, info] of this.clients.entries()) {
      if (info.groupId === groupId) {
        const socket = this.socketMap.get(clientId);
        if (socket && socket.readyState === 1) {
          socket.send(message);
        }
      }
    }
  }

  private async broadcastOnlineCount(groupId: string) {
    const users = await this.chatService.getMockOnlineUsers(groupId);
    const count = users.length;
    const topUsers = users.slice(0, 4).map(user => ({
      avatar: user.avatar,
    }));

    this.broadcastToGroup(groupId, 'online_count', { count, users: topUsers });
  }
}
