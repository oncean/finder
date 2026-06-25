import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { OnModuleDestroy } from '@nestjs/common';
import { Server, WebSocket } from 'ws';
import { AuthService } from '../modules/auth/auth.service';
import { ChatService } from '../modules/chat/chat.service';
import { ChatRealtimeService } from './chat-realtime.service';
import { randomUUID } from 'crypto';

interface ClientInfo {
  userId: string;
  groupId: string;
  nickname: string;
  avatar: string;
  lastHeartbeatAt: number;
}

@WebSocketGateway({
  path: '/ws/chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private clients = new Map<string, ClientInfo>();
  private onlineUsers = new Map<string, Set<string>>();
  private socketMap = new Map<string, WebSocket>();
  private readonly heartbeatTimeout = 90 * 1000;
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private chatRealtimeService: ChatRealtimeService,
  ) {
    this.chatRealtimeService.registerBroadcastHandler((groupId, event, data) => {
      this.broadcastToGroup(groupId, event, data);
    });

    this.cleanupTimer = setInterval(() => {
      void this.cleanupInactiveClients();
    }, 30 * 1000);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  async handleConnection(client: WebSocket, request?: any) {
    const clientId = randomUUID();
    (client as any).id = clientId;

    try {
      const { token, groupId } = this.parseConnectionParams(request);
      if (!token || !groupId) {
        this.closeUnauthorized(client, '缺少连接参数');
        return;
      }

      const user = await this.authService.getUserByToken(token);
      const group = await this.chatService.getGroupById(groupId);
      if (!group) {
        this.closeUnauthorized(client, '群组不存在');
        return;
      }

      this.socketMap.set(clientId, client);
      this.clients.set(clientId, {
        userId: user.id,
        groupId,
        nickname: user.nickname,
        avatar: user.avatar,
        lastHeartbeatAt: Date.now(),
      });

      if (!this.onlineUsers.has(groupId)) {
        this.onlineUsers.set(groupId, new Set());
      }
      this.onlineUsers.get(groupId).add(user.id);

      await this.chatService.markUserOnline(groupId, user.id);
      await this.broadcastOnlineCount(groupId);

      const messages = await this.chatService.getMessages(groupId, undefined, 50);
      this.sendToClient(client, 'history', { messages });
    } catch (error) {
      this.closeUnauthorized(client, error.message || '连接鉴权失败');
      return;
    }

    client.on('message', async (rawData: any) => {
      try {
        const data = JSON.parse(rawData.toString());

        switch (data.type) {
          case 'join':
            await this.handleJoin(client, data);
            break;
          case 'message':
            await this.handleMessage(client, data);
            break;
          case 'ping':
            await this.handlePing(client);
            break;
          default:
            this.sendToClient(client, 'error', { message: '未知消息类型' });
        }
      } catch (error) {
        console.error('消息处理错误:', error);
        this.sendToClient(client, 'error', { message: '消息格式错误' });
      }
    });
  }

  handleDisconnect(client: WebSocket) {
    const clientId = (client as any).id;
    const info = this.clients.get(clientId);
    if (info) {
      void this.removeClient(clientId, info);
    }
    this.socketMap.delete(clientId);
  }

  private async handleJoin(client: WebSocket, payload: { token: string; groupId: string }) {
    try {
      const clientId = (client as any).id;
      const info = this.clients.get(clientId);

      if (!info) {
        this.sendToClient(client, 'error', { message: '连接未认证' });
        return;
      }

      if (payload.groupId && payload.groupId !== info.groupId) {
        this.sendToClient(client, 'error', { message: '群组与连接不一致' });
        return;
      }

      const messages = await this.chatService.getMessages(info.groupId, undefined, 50);
      this.sendToClient(client, 'history', { messages });

    } catch (error) {
      this.sendToClient(client, 'error', { message: error.message });
    }
  }

  private async handleMessage(client: WebSocket, payload: { type: string; messageType?: string; content: string; shopCard?: any; shopId?: string }) {
    const clientId = (client as any).id;
    const info = this.clients.get(clientId);
    console.log('[ChatGateway] 收到 WebSocket 消息:', JSON.stringify(payload, null, 2));
    console.log('[ChatGateway] 发送者信息:', info);
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

      this.chatRealtimeService.broadcastToGroup(info.groupId, 'message', message);

    } catch (error) {
      this.sendToClient(client, 'error', { message: error.message });
    }
  }

  private async handlePing(client: WebSocket) {
    const clientId = (client as any).id;
    const info = this.clients.get(clientId);

    if (!info) {
      this.sendToClient(client, 'error', { message: '连接未认证' });
      return;
    }

    info.lastHeartbeatAt = Date.now();
    this.clients.set(clientId, info);
    await this.chatService.touchOnlineUser(info.groupId, info.userId);
    this.sendToClient(client, 'pong', { serverTime: Date.now() });
  }

  private sendToClient(client: WebSocket, event: string, data: any) {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: event, ...data }));
    }
  }

  private broadcastToGroup(groupId: string, event: string, data: any) {
    const message = JSON.stringify({ ...data, type: event, data });
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
    const users = await this.chatService.getOnlineUsersForBroadcast(groupId);
    const count = users.length;
    const topUsers = users.slice(0, 4).map(user => ({
      avatar: user.avatar,
    }));

    this.broadcastToGroup(groupId, 'online_count', { count, users: topUsers });
  }

  private parseConnectionParams(request?: any) {
    const requestUrl = request?.url || '';
    const url = new URL(requestUrl, 'http://localhost');
    return {
      token: url.searchParams.get('token') || '',
      groupId: url.searchParams.get('groupId') || '',
    };
  }

  private closeUnauthorized(client: WebSocket, message: string) {
    this.sendToClient(client, 'error', { message });
    client.close(1008, message);
  }

  private async removeClient(clientId: string, info: ClientInfo) {
    this.clients.delete(clientId);
    this.socketMap.delete(clientId);

    const hasOtherConnection = Array.from(this.clients.values()).some(
      (item) => item.groupId === info.groupId && item.userId === info.userId,
    );

    if (!hasOtherConnection) {
      const users = this.onlineUsers.get(info.groupId);
      if (users) {
        users.delete(info.userId);
        if (users.size === 0) {
          this.onlineUsers.delete(info.groupId);
        }
      }
      await this.chatService.markUserOffline(info.groupId, info.userId);
    }

    await this.broadcastOnlineCount(info.groupId);
  }

  private async cleanupInactiveClients() {
    const now = Date.now();
    const inactiveClients = Array.from(this.clients.entries()).filter(
      ([, info]) => now - info.lastHeartbeatAt > this.heartbeatTimeout,
    );

    for (const [clientId, info] of inactiveClients) {
      const socket = this.socketMap.get(clientId);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close(1001, '心跳超时');
      }
      await this.removeClient(clientId, info);
    }
  }
}
